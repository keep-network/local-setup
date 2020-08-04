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

    const grantManager = await newFundedAccount(web3);

    const grantee = await newFundedAccount(web3);
    const operator = await newAccount(web3);
    const beneficiary = await newAccount(web3);
    const authorizer = accounts[3];

    const grantAmount = formatAmount(400000, 18);
    const firstDelegationAmount = formatAmount(230000, 18);
    const secondDelegationAmount = formatAmount(120000, 18);

    await keepToken.transfer(grantManager, grantAmount, { from: owner });
    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(grantAmount);

    console.log("Create grant");
    const duration = 10;
    const start = 0;
    const cliffDuration = 0;
    const revocable = true;

    const grantData = web3.eth.abi.encodeParameters(
      [
        "address",
        "address",
        "uint256",
        "uint256",
        "uint256",
        "bool",
        "address",
      ],
      [
        grantManager,
        grantee,
        duration,
        start,
        cliffDuration,
        revocable,
        permissiveStakingPolicy.address,
      ]
    );

    await keepToken.approveAndCall(tokenGrant.address, grantAmount, grantData, {
      from: grantManager,
    });

    const grantID = (await tokenGrant.numGrants()).subn(1);

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(0);
    expect(await tokenGrant.balanceOf(grantee)).to.eq.BN(grantAmount);
    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(grantAmount);

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

    await tokenGrant.stake(
      grantID,
      tokenStaking.address,
      firstDelegationAmount,
      delegation,
      {
        from: grantee,
      }
    );
    await tokenStaking.authorizeOperatorContract(
      operator,
      keepRandomBeaconOperatorContract.address,
      { from: authorizer }
    );

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Cancel stake");
    await tokenStaking.cancelStake(operator, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(0);

    expect(await tokenStakingEscrow.depositedAmount(operator)).to.eq.BN(
      firstDelegationAmount
    );
    expect(await tokenStakingEscrow.withdrawable(operator)).to.eq.BN(
      firstDelegationAmount
    );

    const newOperator = await newAccount(web3);
    const newBeneficiary = await newAccount(web3);
    const newAuthorizer = authorizer;

    const newDelegation =
      "0x" +
      Buffer.concat([
        Buffer.from(newBeneficiary.substr(2), "hex"),
        Buffer.from(newOperator.substr(2), "hex"),
        Buffer.from(newAuthorizer.substr(2), "hex"),
      ]).toString("hex");

    console.log("Redelegate");

    await tokenStakingEscrow.redelegate(
      operator,
      secondDelegationAmount,
      newDelegation,
      {
        from: grantee,
      }
    );

    await tokenStaking.authorizeOperatorContract(
      newOperator,
      keepRandomBeaconOperatorContract.address,
      { from: newAuthorizer }
    );

    expect(await tokenStakingEscrow.availableAmount(operator)).to.eq.BN(
      firstDelegationAmount.sub(secondDelegationAmount)
    );

    expect(
      await tokenStakingEscrow.depositRedelegatedAmount(operator)
    ).to.eq.BN(secondDelegationAmount);

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect((await tokenStaking.getDelegationInfo(newOperator)).amount).to.eq.BN(
      secondDelegationAmount
    );

    console.log("Cancel stake");
    await tokenStaking.cancelStake(newOperator, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(
        newOperator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect((await tokenStaking.getDelegationInfo(newOperator)).amount).to.eq.BN(
      0
    );

    expect(await tokenStakingEscrow.availableAmount(operator)).to.eq.BN(
      firstDelegationAmount.sub(secondDelegationAmount)
    );

    expect(await tokenStakingEscrow.depositedAmount(newOperator)).to.eq.BN(
      secondDelegationAmount
    );

    expect(await tokenStakingEscrow.availableAmount(newOperator)).to.eq.BN(
      secondDelegationAmount
    );

    expect(await tokenStakingEscrow.withdrawable(newOperator)).to.eq.BN(
      secondDelegationAmount
    );

    console.log("Withdraw from Escrow");
    await expectRevert.unspecified(
      tokenStakingEscrow.withdrawToManagedGrantee(newOperator, {
        from: grantee,
      })
    );

    await tokenStakingEscrow.withdraw(newOperator, {
      from: grantee,
    });

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect(await tokenStakingEscrow.withdrawable(operator)).to.eq.BN(
      firstDelegationAmount.sub(secondDelegationAmount)
    );

    expect(await tokenStakingEscrow.withdrawable(newOperator)).to.eq.BN(0);

    expect(
      await tokenStakingEscrow.depositWithdrawnAmount(newOperator)
    ).to.eq.BN(secondDelegationAmount);

    expect(await keepToken.balanceOf(grantee)).to.eq.BN(secondDelegationAmount);

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
