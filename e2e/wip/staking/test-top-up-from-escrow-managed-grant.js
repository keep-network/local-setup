const KeepToken = artifacts.require("./KeepToken.sol");
const TokenStaking = artifacts.require("./TokenStaking.sol");
const KeepRandomBeaconOperator = artifacts.require(
  "./KeepRandomBeaconOperator.sol"
);
const TokenGrant = artifacts.require("./TokenGrant.sol");
const PermissiveStakingPolicy = artifacts.require(
  "./PermissiveStakingPolicy.sol"
);
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
    const stakingPolicy = await PermissiveStakingPolicy.deployed();
    const tokenStakingEscrow = await TokenStakingEscrow.deployed();
    const managedGrantFactory = await ManagedGrantFactory.deployed();

    const owner = accounts[0];
    const grantManager = accounts[1];

    const PASSWORD = "password";
    const UNLOCK_DURATION = 600;

    const grantee = await web3.eth.personal.newAccount(PASSWORD);
    const operator1 = await web3.eth.personal.newAccount(PASSWORD);
    const beneficiary1 = await web3.eth.personal.newAccount(PASSWORD);
    const operator2 = await web3.eth.personal.newAccount(PASSWORD);
    const beneficiary2 = await web3.eth.personal.newAccount(PASSWORD);
    const authorizer = accounts[3];

    await web3.eth.personal.unlockAccount(grantee, PASSWORD, UNLOCK_DURATION);
    await web3.eth.sendTransaction({
      from: owner,
      to: grantee,
      value: web3.utils.toWei("1"),
    });

    const grantAmount = formatAmount(500000, 18);
    const firstDelegationAmount = formatAmount(150000, 18);
    const secondDelegationAmount = formatAmount(110000, 18);
    const thirdDelegationAmount = formatAmount(120000, 18);

    await keepToken.transfer(grantManager, grantAmount, { from: owner });
    await keepToken.approve(managedGrantFactory.address, grantAmount, {
      from: grantManager,
    });

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(grantAmount);

    console.log("Create managed grant");
    const managedGrantAddress = await managedGrantFactory.createManagedGrant.call(
      grantee,
      grantAmount,
      1,
      1,
      1,
      true,
      stakingPolicy.address,
      {
        from: grantManager,
      }
    );

    console.log("Managed Grant Address:", managedGrantAddress);

    await managedGrantFactory.createManagedGrant(
      grantee,
      grantAmount,
      1,
      1,
      1,
      true,
      stakingPolicy.address,
      {
        from: grantManager,
      }
    );

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(0);
    expect(await tokenGrant.balanceOf(managedGrantAddress)).to.eq.BN(
      grantAmount
    );

    const managedGrant = await ManagedGrant.at(managedGrantAddress);

    expect(await managedGrant.grantee()).equal(grantee);

    const grantID = await managedGrant.grantId();

    console.log("Delegate");

    await tokenGrant.authorizeStakingContract(tokenStaking.address, {
      from: grantManager,
    });

    const delegation1 =
      "0x" +
      Buffer.concat([
        Buffer.from(beneficiary1.substr(2), "hex"),
        Buffer.from(operator1.substr(2), "hex"),
        Buffer.from(authorizer.substr(2), "hex"),
      ]).toString("hex");

    await managedGrant.stake(
      tokenStaking.address,
      firstDelegationAmount,
      delegation1,
      {
        from: grantee,
      }
    );
    await tokenStaking.authorizeOperatorContract(
      operator1,
      operatorContract.address,
      { from: authorizer }
    );

    const delegation2 =
      "0x" +
      Buffer.concat([
        Buffer.from(beneficiary2.substr(2), "hex"),
        Buffer.from(operator2.substr(2), "hex"),
        Buffer.from(authorizer.substr(2), "hex"),
      ]).toString("hex");

    await managedGrant.stake(
      tokenStaking.address,
      secondDelegationAmount,
      delegation2,
      {
        from: grantee,
      }
    );
    await tokenStaking.authorizeOperatorContract(
      operator2,
      operatorContract.address,
      { from: authorizer }
    );

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount).sub(secondDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(operator1, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    expect(
      await tokenStaking.eligibleStake(operator2, operatorContract.address)
    ).to.eq.BN(secondDelegationAmount);

    console.log("Undelegate and recover stake");
    await tokenStaking.undelegate(operator1, { from: grantee });
    await tokenStaking.recoverStake(operator1, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(operator1, operatorContract.address)
    ).to.eq.BN(0);

    expect(await tokenStakingEscrow.depositedAmount(operator1)).to.eq.BN(
      firstDelegationAmount
    );
    expect(await tokenStakingEscrow.withdrawable(operator1)).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Redelegate");

    await tokenStakingEscrow.redelegate(
      operator1,
      thirdDelegationAmount,
      delegation2,
      {
        from: grantee,
      }
    );

    expect(
      await tokenStakingEscrow.depositRedelegatedAmount(operator1)
    ).to.eq.BN(thirdDelegationAmount);

    expect(await tokenStakingEscrow.withdrawable(operator1)).to.eq.BN(
      firstDelegationAmount.sub(thirdDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(operator1, operatorContract.address)
    ).to.eq.BN(0);

    expect(
      await tokenStaking.eligibleStake(operator2, operatorContract.address)
    ).to.eq.BN(secondDelegationAmount);

    await tokenStaking.commitTopUp(operator2);

    expect(
      await tokenStaking.eligibleStake(operator2, operatorContract.address)
    ).to.eq.BN(secondDelegationAmount.add(thirdDelegationAmount));

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
