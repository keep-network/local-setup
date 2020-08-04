const { expectRevert } = require("@openzeppelin/test-helpers");

const {
  newAccount,
  newFundedAccount,
  getAccounts,
} = require("./helpers/accounts");

const { deployed } = require("./helpers/contracts");

const { formatAmount, expect } = require("./helpers/test-helpers");

module.exports = async function () {
  try {
    ({
      keepToken,
      tokenStaking,
      tokenGrant,
      keepRandomBeaconOperatorContract,
      permissiveStakingPolicy,
      tokenStakingEscrow,
    } = await deployed(artifacts));

    const accounts = await getAccounts(web3);

    const owner = accounts[0];

    const tokenOwner = await newFundedAccount(web3);
    const operator = await newAccount(web3);
    const beneficiary = await newAccount(web3);
    const authorizer = accounts[3];

    const grantAmount = formatAmount(400000, 18);
    const firstDelegationAmount = formatAmount(230000, 18);
    const secondDelegationAmount = formatAmount(120000, 18);

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
      keepRandomBeaconOperatorContract.address,
      { from: authorizer }
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Cancel stake");
    await tokenStaking.cancelStake(operator, { from: tokenOwner });

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(0);

    expect(await tokenStakingEscrow.depositedAmount(operator)).to.eq.BN(0);

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(grantAmount);

    console.log("Redelegate");

    await keepToken.approveAndCall(
      tokenStaking.address,
      secondDelegationAmount,
      delegation,
      {
        from: tokenOwner,
      }
    );

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(
      grantAmount.sub(secondDelegationAmount)
    );

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      secondDelegationAmount
    );

    await tokenStaking.cancelStake(operator, { from: tokenOwner });

    expect(await keepToken.balanceOf(tokenOwner)).to.eq.BN(grantAmount);

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(0);

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
