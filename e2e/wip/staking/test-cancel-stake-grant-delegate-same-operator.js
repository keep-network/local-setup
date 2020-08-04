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
    const operatorA = await newAccount(web3);
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
        Buffer.from(operatorA.substr(2), "hex"),
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
      operatorA,
      keepRandomBeaconOperatorContract.address,
      { from: authorizer }
    );

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect((await tokenStaking.getDelegationInfo(operatorA)).amount).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Cancel stake");
    await tokenStaking.cancelStake(operatorA, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(
        operatorA,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect((await tokenStaking.getDelegationInfo(operatorA)).amount).to.eq.BN(
      0
    );

    expect(await tokenStakingEscrow.depositedAmount(operatorA)).to.eq.BN(
      firstDelegationAmount
    );
    expect(await tokenStakingEscrow.withdrawable(operatorA)).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Delegate to the same operator");

    const newBeneficiary = await newAccount(web3);
    const newAuthorizer = authorizer;

    const delegationA =
      "0x" +
      Buffer.concat([
        Buffer.from(newBeneficiary.substr(2), "hex"),
        Buffer.from(operatorA.substr(2), "hex"),
        Buffer.from(newAuthorizer.substr(2), "hex"),
      ]).toString("hex");

    await expectRevert(
      tokenGrant.stake(
        grantID,
        tokenStaking.address,
        secondDelegationAmount,
        delegationA,
        {
          from: grantee,
        }
      ),
      "Stake for the operator already deposited in the escrow"
    );

    console.log("Redelegate to the same operator");

    await expectRevert(
      tokenStakingEscrow.redelegate(
        operatorA,
        secondDelegationAmount,
        delegationA,
        {
          from: grantee,
        }
      ),
      "Redelegating to previously used operator is not allowed"
    );

    console.log("Redelegate to the same operator via other operator");

    const operatorB = await newAccount(web3);

    const delegationB =
      "0x" +
      Buffer.concat([
        Buffer.from(newBeneficiary.substr(2), "hex"),
        Buffer.from(operatorB.substr(2), "hex"),
        Buffer.from(newAuthorizer.substr(2), "hex"),
      ]).toString("hex");

    await tokenStakingEscrow.redelegate(
      operatorA,
      secondDelegationAmount,
      delegationB,
      {
        from: grantee,
      }
    );

    expect((await tokenStaking.getDelegationInfo(operatorB)).amount).to.eq.BN(
      secondDelegationAmount
    );

    console.log("Cancel stake");
    await tokenStaking.cancelStake(operatorB, { from: grantee });

    expect((await tokenStaking.getDelegationInfo(operatorB)).amount).to.eq.BN(
      0
    );

    expect(await tokenStakingEscrow.depositedAmount(operatorB)).to.eq.BN(
      secondDelegationAmount
    );

    await expectRevert(
      tokenStakingEscrow.redelegate(
        operatorB,
        secondDelegationAmount,
        delegationA,
        {
          from: grantee,
        }
      ),
      "Redelegating to previously used operator is not allowed"
    );

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
