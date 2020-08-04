const KeepToken = artifacts.require("./KeepToken.sol");
const TokenStaking = artifacts.require("./TokenStaking.sol");
const KeepRandomBeaconOperator = artifacts.require(
  "./KeepRandomBeaconOperator.sol"
);
const TokenGrant = artifacts.require("./TokenGrant.sol");
const AdaptiveStakingPolicy = artifacts.require("./AdaptiveStakingPolicy.sol");
const TokenStakingEscrow = artifacts.require("./TokenStakingEscrow.sol");
const ManagedGrantFactory = artifacts.require("./ManagedGrantFactory.sol");
const ManagedGrant = artifacts.require("./ManagedGrant.sol");

const { expectRevert } = require("@openzeppelin/test-helpers");

const BN = web3.utils.BN;
const chai = require("chai");
chai.use(require("bn-chai")(BN));
const expect = chai.expect;

function formatAmount(amount, decimals) {
  return web3.utils
    .toBN(amount)
    .mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
}

function getAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      resolve(accounts);
    });
  });
}

module.exports = async function () {
  try {
    const accounts = await getAccounts();
    const keepToken = await KeepToken.deployed();
    const tokenStaking = await TokenStaking.deployed();
    const tokenGrant = await TokenGrant.deployed();
    const operatorContract = await KeepRandomBeaconOperator.deployed();
    const tokenStakingEscrow = await TokenStakingEscrow.deployed();
    const managedGrantFactory = await ManagedGrantFactory.deployed();

    const owner = accounts[0];
    const grantManager = accounts[1];

    const PASSWORD = "password";
    const UNLOCK_DURATION = 600;

    const grantee = await web3.eth.personal.newAccount(PASSWORD);
    const operator = await web3.eth.personal.newAccount(PASSWORD);
    const beneficiary = await web3.eth.personal.newAccount(PASSWORD);
    const authorizer = accounts[3];

    await web3.eth.personal.unlockAccount(grantee, PASSWORD, UNLOCK_DURATION);
    await web3.eth.sendTransaction({
      from: owner,
      to: grantee,
      value: web3.utils.toWei("1"),
    });

    const initialTokenBalanceManager = await keepToken.balanceOf(grantManager);

    const grantAmount = formatAmount(800000, 18);
    const firstDelegationAmount = formatAmount(180000, 18);
    const secondDelegationAmount = formatAmount(110000, 18);

    await keepToken.transfer(grantManager, grantAmount, { from: owner });
    await keepToken.approve(managedGrantFactory.address, grantAmount, {
      from: grantManager,
    });

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(
      initialTokenBalanceManager.add(grantAmount)
    );

    const minimumStake = await tokenStaking.minimumStake();

    console.log("Create a staking policy");
    const minimumMultiplier = new BN(2);
    const stakeaheadTime = new BN(1 * 60);
    const useCliff = true;
    const stakingPolicy = await AdaptiveStakingPolicy.new(
      tokenStaking.address,
      minimumMultiplier,
      stakeaheadTime,
      useCliff
    );

    console.log("Create a managed grant");

    const duration = stakeaheadTime.muln(10);
    const start = new BN((await web3.eth.getBlock("latest")).timestamp);
    const cliffDuration = stakeaheadTime.muln(4);

    const managedGrantAddress = await managedGrantFactory.createManagedGrant.call(
      grantee,
      grantAmount,
      duration,
      start,
      cliffDuration,
      true,
      stakingPolicy.address,
      {
        from: grantManager,
      }
    );

    await managedGrantFactory.createManagedGrant(
      grantee,
      grantAmount,
      duration,
      start,
      cliffDuration,
      true,
      stakingPolicy.address,
      {
        from: grantManager,
      }
    );

    stakeaheadCliffWait = sleep(
      cliffDuration.sub(stakeaheadTime).addn(20).muln(1000)
    ); // we're adding 20 sec to overcome some synchronization issues
    cliffWait = sleep(cliffDuration.addn(30).muln(1000)); // we're adding 30 sec to overcome some synchronization issues
    durationWait = sleep(duration.addn(30).muln(1000));

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(
      initialTokenBalanceManager
    );
    expect(await tokenGrant.balanceOf(managedGrantAddress)).to.eq.BN(
      grantAmount
    );

    const managedGrant = await ManagedGrant.at(managedGrantAddress);

    expect(await managedGrant.grantee()).equal(grantee);

    const grantID = await managedGrant.grantId();

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      minimumStake.mul(minimumMultiplier)
    );

    console.log("Delegate");

    await tokenGrant.authorizeStakingContract(tokenStaking.address, {
      from: grantManager,
    });

    const delegation =
      "0x" +
      Buffer.concat([
        Buffer.from(beneficiary.substr(2), "hex"),
        Buffer.from(operator.substr(2), "hex"),
        Buffer.from(authorizer.substr(2), "hex"),
      ]).toString("hex");

    await managedGrant.stake(
      tokenStaking.address,
      firstDelegationAmount,
      delegation,
      {
        from: grantee,
      }
    );
    await tokenStaking.authorizeOperatorContract(
      operator,
      operatorContract.address,
      { from: authorizer }
    );

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      minimumStake.mul(minimumMultiplier).sub(firstDelegationAmount)
    );

    console.log("Undelegate and recover stake");
    await tokenStaking.undelegate(operator, { from: grantee });
    await sleep(2000);
    await tokenStaking.recoverStake(operator, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(0);

    expect(await tokenStakingEscrow.depositedAmount(operator)).to.eq.BN(
      firstDelegationAmount
    );

    let now = new BN((await web3.eth.getBlock("latest")).timestamp);
    if (now.gt(start.add(cliffDuration))) {
      // We don't want the cliff to pass yet, if we get an error here it means
      // that cliff duration is too low compared to time needed to execute steps
      // above.
      throw Error("cliff already passed; try tweaking cliff duration value");
    }
    expect(await tokenStakingEscrow.withdrawable(operator)).to.eq.BN(0);

    console.log(`Waiting for cliff duration minus stakeahead to pass...`);
    await stakeaheadCliffWait;
    now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const expectedStakeable1 = grantAmount
      .mul(now.add(stakeaheadTime).sub(start))
      .div(duration);

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      expectedStakeable1.sub(firstDelegationAmount)
    );

    console.log(`Waiting for cliff duration to pass...`);
    // We want the cliff duration to pass so some part of tokens is ready to withdraw.
    await cliffWait;

    now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const expectedStakeable2 = grantAmount
      .mul(now.add(stakeaheadTime).sub(start))
      .div(duration);

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      expectedStakeable2.sub(firstDelegationAmount)
    );

    const withdrawable1 = await tokenStakingEscrow.withdrawable(operator);

    now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const expectedWithdrawable1 = firstDelegationAmount
      .mul(now.sub(start))
      .div(duration);
    console.log("Withdrawable", withdrawable1.toString());
    expect(withdrawable1).to.be.gte.BN(expectedWithdrawable1);
    expect(withdrawable1).to.be.lt.BN(firstDelegationAmount);

    console.log("Redelegate to a new operator");

    const newOperator = await web3.eth.personal.newAccount(PASSWORD);
    const newBeneficiary = await web3.eth.personal.newAccount(PASSWORD);
    const newAuthorizer = authorizer;

    const newDelegation =
      "0x" +
      Buffer.concat([
        Buffer.from(newBeneficiary.substr(2), "hex"),
        Buffer.from(newOperator.substr(2), "hex"),
        Buffer.from(newAuthorizer.substr(2), "hex"),
      ]).toString("hex");

    await tokenStakingEscrow.redelegate(
      operator,
      secondDelegationAmount,
      newDelegation,
      {
        from: grantee,
      }
    );

    expect(await tokenStakingEscrow.availableAmount(operator)).to.eq.BN(
      firstDelegationAmount.sub(secondDelegationAmount)
    );
    expect(
      await tokenStakingEscrow.depositRedelegatedAmount(operator)
    ).to.eq.BN(secondDelegationAmount);
    expect(
      await tokenStakingEscrow.depositRedelegatedAmount(newOperator)
    ).to.eq.BN(0);

    await tokenStaking.authorizeOperatorContract(
      newOperator,
      operatorContract.address,
      { from: newAuthorizer }
    );

    now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const expectedStakeable3 = grantAmount
      .mul(now.add(stakeaheadTime).sub(start))
      .div(duration);

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      expectedStakeable3.sub(firstDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(0);

    expect(
      await tokenStaking.eligibleStake(newOperator, operatorContract.address)
    ).to.eq.BN(secondDelegationAmount);

    const expectedWithdrawable2 = await tokenStakingEscrow.withdrawable(
      operator
    );

    expect(expectedWithdrawable2).to.be.gt.BN(
      expectedWithdrawable1.sub(secondDelegationAmount)
    );
    expect(expectedWithdrawable2).to.be.lte.BN(
      firstDelegationAmount.sub(secondDelegationAmount)
    );

    expect(await tokenStakingEscrow.withdrawable(newOperator)).to.eq.BN(0);

    console.log("Undelegate and recover stake");
    await tokenStaking.undelegate(newOperator, { from: grantee });
    await sleep(2000);
    await tokenStaking.recoverStake(newOperator, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(newOperator, operatorContract.address)
    ).to.eq.BN(0);

    expect(await tokenStakingEscrow.depositedAmount(newOperator)).to.eq.BN(
      secondDelegationAmount
    );

    now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const expectedWithdrawable3 = secondDelegationAmount
      .mul(now.sub(start))
      .div(duration);

    const withdrawable3 = await tokenStakingEscrow.withdrawable(newOperator);
    console.log("Withdrawable", withdrawable3.toString());

    expect(withdrawable3).to.be.gte.BN(expectedWithdrawable3);
    expect(withdrawable3).to.be.lt.BN(secondDelegationAmount);

    console.log("Withdraw");
    await tokenStakingEscrow.withdrawToManagedGrantee(newOperator, {
      from: grantee,
    });

    const withdrawn = await tokenStakingEscrow.depositWithdrawnAmount(
      newOperator
    );
    console.log("Withdrawn", withdrawn.toString());
    expect(withdrawn).to.be.gte.BN(withdrawable3);
    expect(withdrawn).to.be.lte.BN(secondDelegationAmount);

    expect(await keepToken.balanceOf(grantee)).to.eq.BN(withdrawn);

    now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const expectedStakeable4 = grantAmount
      .mul(now.add(stakeaheadTime).sub(start))
      .div(duration);
    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      expectedStakeable4.sub(firstDelegationAmount)
    );

    let i = 0,
      expectedReleased;
    do {
      await sleep(5000);

      now = new BN((await web3.eth.getBlock("latest")).timestamp);
      expectedReleased = secondDelegationAmount
        .mul(now.sub(start))
        .div(duration);

      console.log(`Released (check ${i}): ${expectedReleased.toString()}`);
      i++;
    } while (withdrawn.gte(expectedReleased));

    const withdrawable4 = await tokenStakingEscrow.withdrawable(newOperator);
    expect(withdrawable4).to.be.gt.BN(0);
    expect(withdrawable4).to.be.gte.BN(expectedReleased.sub(withdrawn));
    expect(withdrawable4).to.be.lte.BN(secondDelegationAmount.sub(withdrawn));

    expect(await keepToken.balanceOf(grantee)).to.eq.BN(withdrawn);

    console.log("Waiting for complete token release");
    await durationWait;

    expect(await tokenGrant.withdrawable(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );
    expect(await tokenStakingEscrow.withdrawable(operator)).to.be.eq.BN(
      firstDelegationAmount.sub(secondDelegationAmount)
    );
    expect(await tokenStakingEscrow.withdrawable(newOperator)).to.be.eq.BN(
      secondDelegationAmount.sub(withdrawn)
    );

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
