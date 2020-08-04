const KeepToken = artifacts.require("./KeepToken.sol");
const TokenStaking = artifacts.require("./TokenStaking.sol");
const KeepRandomBeaconOperator = artifacts.require(
  "./KeepRandomBeaconOperator.sol"
);
const { getAddress } = require("./helpers/contracts-data");

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
    const operatorContract = await KeepRandomBeaconOperator.deployed();
    const tokenStaking = await TokenStaking.deployed();

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
    const secondDelegationAmount = formatAmount(110000, 18);

    await keepToken.transfer(tokenOwner, grantAmount, { from: owner });

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(grantAmount);

    console.log("Delegate");

    const delegation =
      "0x" +
      Buffer.concat([
        Buffer.from(beneficiary.substr(2), "hex"),
        Buffer.from(operator.substr(2), "hex"),
        Buffer.from(authorizer.substr(2), "hex"),
      ]).toString("hex");

    await keepToken.approveAndCall(
      tokenStaking.address,
      firstDelegationAmount,
      delegation,
      {
        from: tokenOwner,
      }
    );
    await tokenStaking.authorizeOperatorContract(
      operator,
      operatorContract.address,
      { from: authorizer }
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(operator, operatorContract.address)
    ).to.eq.BN(firstDelegationAmount);

    console.log("Top Up");
    await keepToken.approveAndCall(
      tokenStaking.address,
      secondDelegationAmount,
      delegation,
      {
        from: tokenOwner,
      }
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
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
