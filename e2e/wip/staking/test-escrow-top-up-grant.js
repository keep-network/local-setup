const { expectRevert } = require("@openzeppelin/test-helpers");

const {
  newAccount,
  newFundedAccount,
  getAccounts,
} = require("./helpers/accounts");

const { deployed } = require("./helpers/contracts");

const { formatAmount, sleep, expect } = require("./helpers/test-helpers");

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
    const grantManager = owner;

    const grantee = await newFundedAccount(web3);
    const operator = await newAccount(web3);
    const beneficiary = await newAccount(web3);
    const authorizer = accounts[3];

    const grantAmount = formatAmount(400000, 18);
    const firstDelegationAmount = formatAmount(100000, 18);
    const secondDelegationAmount = formatAmount(110000, 18);
    const thirdDelegationAmount = formatAmount(120000, 18);

    const initializationPeriod = await tokenStaking.initializationPeriod.call();

    const undelegationPeriod = await tokenStaking.undelegationPeriod.call();

    console.log("Create grant");
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
      [owner, grantee, 10, 0, 0, true, permissiveStakingPolicy.address]
    );

    await keepToken.approveAndCall(tokenGrant.address, grantAmount, grantData, {
      from: owner,
    });

    const grantID = (await tokenGrant.numGrants()).subn(1);

    console.log("Grant ID", grantID.toString());

    expect(await tokenGrant.balanceOf(grantee)).to.eq.BN(grantAmount);

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

    const initializationPeriodWait = sleep(
      initializationPeriod.addn(60).muln(1000)
    );
    console.log(`Initialization Period ${initializationPeriod} sec`);

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

    await initializationPeriodWait;

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(firstDelegationAmount);

    console.log("Top Up");
    await tokenGrant.stake(
      grantID,
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

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      firstDelegationAmount
    );

    await sleep(initializationPeriod.addn(30).muln(1000));

    await tokenStaking.commitTopUp(operator);

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      firstDelegationAmount.add(secondDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(firstDelegationAmount.add(secondDelegationAmount));

    console.log("Undelegate and recover stake");
    await tokenStaking.undelegate(operator, { from: grantee });
    await sleep(undelegationPeriod.muln(1000));
    await tokenStaking.recoverStake(operator, { from: grantee });

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(0);

    expect(await tokenStakingEscrow.depositedAmount(operator)).to.eq.BN(
      firstDelegationAmount.add(secondDelegationAmount)
    );
    expect(await tokenStakingEscrow.withdrawable(operator)).to.eq.BN(
      firstDelegationAmount.add(secondDelegationAmount)
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
      firstDelegationAmount.add(secondDelegationAmount),
      newDelegation,
      {
        from: grantee,
      }
    );

    await sleep(initializationPeriod.addn(60).muln(1000));

    expect(
      await tokenStakingEscrow.depositRedelegatedAmount(operator)
    ).to.eq.BN(firstDelegationAmount.add(secondDelegationAmount));

    await tokenStaking.authorizeOperatorContract(
      newOperator,
      keepRandomBeaconOperatorContract.address,
      { from: newAuthorizer }
    );

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect(
      await tokenStaking.eligibleStake(
        newOperator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(firstDelegationAmount.add(secondDelegationAmount));

    console.log("Top Up");
    await tokenGrant.stake(
      grantID,
      tokenStaking.address,
      thirdDelegationAmount,
      newDelegation,
      {
        from: grantee,
      }
    );

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount
        .sub(firstDelegationAmount)
        .sub(secondDelegationAmount)
        .sub(thirdDelegationAmount)
    );

    expect(
      await tokenStaking.eligibleStake(
        newOperator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(firstDelegationAmount.add(secondDelegationAmount));

    await sleep(initializationPeriod.addn(60).muln(1000));

    await expectRevert(
      tokenStaking.commitTopUp(operator),
      "No top up to commit"
    );
    await tokenStaking.commitTopUp(newOperator);

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

    expect(
      await tokenStaking.eligibleStake(
        newOperator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(
      firstDelegationAmount
        .add(secondDelegationAmount)
        .add(thirdDelegationAmount)
    );

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
