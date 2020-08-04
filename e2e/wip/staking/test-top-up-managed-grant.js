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
    const operator = await web3.eth.personal.newAccount(PASSWORD);
    const beneficiary = await web3.eth.personal.newAccount(PASSWORD);
    const authorizer = accounts[3];

    await web3.eth.personal.unlockAccount(grantee, PASSWORD, UNLOCK_DURATION);
    await web3.eth.sendTransaction({
      from: owner,
      to: grantee,
      value: web3.utils.toWei("1"),
    });

    const grantAmount = formatAmount(300000, 18);
    const firstDelegationAmount = formatAmount(100000, 18);
    const secondDelegationAmount = formatAmount(110000, 18);

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

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    console.log("Top Up");
    await managedGrant.stake(
      tokenStaking.address,
      secondDelegationAmount,
      delegation,
      {
        from: grantee,
      }
    );

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount).sub(secondDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    await tokenStaking.commitTopUp(operator);

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount.add(secondDelegationAmount));

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
