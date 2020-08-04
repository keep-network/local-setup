const KeepToken = artifacts.require("./KeepToken.sol");
const TokenStaking = artifacts.require("./TokenStaking.sol");
const KeepRandomBeaconOperator = artifacts.require(
  "./KeepRandomBeaconOperator.sol"
);
const StakingPortBacker = artifacts.require("./StakingPortBacker.sol");

const { getAddress } = require("./helpers/contracts-data");

const BN = web3.utils.BN;
const chai = require("chai");
const { expectRevert } = require("@openzeppelin/test-helpers");
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

async function fundStakingPortBacker(
  stakingPortBacker,
  keepToken,
  expectedAmount,
  owner
) {
  const initialBalance = await keepToken.balanceOf(stakingPortBacker.address);

  if (initialBalance.gt(expectedAmount)) {
    await stakingPortBacker.withdraw(initialBalance.sub(expectedAmount), {
      from: owner,
    });
  } else if (initialBalance.lt(expectedAmount)) {
    await keepToken.transfer(
      stakingPortBacker.address,
      expectedAmount.sub(initialBalance),
      { from: owner }
    );
  }
}

module.exports = async function () {
  try {
    const accounts = await getAccounts();
    const keepToken = await KeepToken.deployed();

    const tokenStakingOld = await TokenStaking.at(
      getAddress("TokenStakingOld")
    );
    const tokenStakingNew = await TokenStaking.at(
      getAddress("TokenStakingNew")
    );

    const stakingPortBacker = await StakingPortBacker.at(
      getAddress("StakingPortBacker")
    );

    const operatorContract = await KeepRandomBeaconOperator.deployed();

    const owner = accounts[0];

    const PASSWORD = "password";
    const UNLOCK_DURATION = 600;

    const tokenOwner = await web3.eth.personal.newAccount(PASSWORD);
    const operator = await web3.eth.personal.newAccount(PASSWORD);
    const beneficiary = await web3.eth.personal.newAccount(PASSWORD);
    const authorizer = accounts[3];

    await web3.eth.personal.unlockAccount(
      tokenOwner,
      PASSWORD,
      UNLOCK_DURATION
    );
    await web3.eth.sendTransaction({
      from: owner,
      to: tokenOwner,
      value: web3.utils.toWei("1"),
    });

    const grantAmount = formatAmount(300000, 18);

    const firstDelegationAmount = formatAmount(100000, 18);

    await fundStakingPortBacker(
      stakingPortBacker,
      keepToken,
      firstDelegationAmount,
      owner
    );

    await keepToken.transfer(tokenOwner, grantAmount, { from: owner });

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(grantAmount);

    const initialTokenStakingOldKEEPBalance = await keepToken.balanceOf(
      tokenStakingOld.address
    );
    const initialTokenStakingNewKEEPBalance = await keepToken.balanceOf(
      tokenStakingNew.address
    );

    console.log("Delegate");

    const delegation =
      "0x" +
      Buffer.concat([
        Buffer.from(beneficiary.substr(2), "hex"),
        Buffer.from(operator.substr(2), "hex"),
        Buffer.from(authorizer.substr(2), "hex"),
      ]).toString("hex");

    await keepToken.approveAndCall(
      tokenStakingOld.address,
      firstDelegationAmount,
      delegation,
      {
        from: tokenOwner,
      }
    );
    await tokenStakingOld.authorizeOperatorContract(
      operator,
      operatorContract.address,
      { from: authorizer }
    );

    expect(await keepToken.balanceOf(tokenStakingOld.address)).to.eq.BN(
      initialTokenStakingOldKEEPBalance.add(firstDelegationAmount)
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(await tokenStakingOld.balanceOf(operator)).to.eq.BN(
      firstDelegationAmount
    );

    expect(await tokenStakingOld.ownerOf(operator)).to.equal(tokenOwner);

    expect(
      await tokenStakingOld.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    expect(await tokenStakingNew.balanceOf(operator)).to.eq.BN(0);

    expect(
      await tokenStakingNew.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(0);

    console.log("Copy stake");

    await stakingPortBacker.allowOperator(operator);
    await stakingPortBacker.copyStake(operator, { from: tokenOwner });

    expect(await keepToken.balanceOf(tokenStakingOld.address)).to.eq.BN(
      initialTokenStakingOldKEEPBalance.add(firstDelegationAmount)
    );

    expect(await keepToken.balanceOf(tokenStakingNew.address)).to.eq.BN(
      initialTokenStakingNewKEEPBalance.add(firstDelegationAmount)
    );

    expect(await keepToken.balanceOf(stakingPortBacker.address)).to.eq.BN(0);

    expect(await tokenStakingNew.balanceOf(operator)).to.eq.BN(
      firstDelegationAmount
    );

    await tokenStakingNew.authorizeOperatorContract(
      operator,
      operatorContract.address,
      { from: authorizer }
    );

    expect(
      await tokenStakingNew.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    console.log("Undelegate and recover OLD stake");
    await tokenStakingOld.undelegate(operator, { from: tokenOwner });
    await tokenStakingOld.recoverStake(operator, { from: tokenOwner });

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(grantAmount);

    console.log("Pay back staking port backer");
    await expectRevert(
      tokenStakingNew.undelegate(operator, { from: tokenOwner }),
      "Not authorized"
    );

    const data = web3.eth.abi.encodeParameters(["address"], [operator]);

    await keepToken.approveAndCall(
      stakingPortBacker.address,
      firstDelegationAmount,
      data,
      {
        from: tokenOwner,
      }
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(await keepToken.balanceOf(stakingPortBacker.address)).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Undelegate and recover NEW stake");
    await expectRevert(
      stakingPortBacker.undelegate(operator, { from: tokenOwner }),
      "Not authorized"
    );

    await tokenStakingNew.undelegate(operator, { from: tokenOwner });
    await tokenStakingNew.recoverStake(operator, { from: tokenOwner });

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(grantAmount);
    expect(await keepToken.balanceOf(stakingPortBacker.address)).to.eq.BN(
      firstDelegationAmount
    );

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
