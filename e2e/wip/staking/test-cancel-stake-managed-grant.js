const { expectRevert } = require("@openzeppelin/test-helpers");

const {
  newAccount,
  newFundedAccount,
  getAccounts,
} = require("./helpers/accounts");

const { deployed } = require("./helpers/contracts");

const { formatAmount, BN, expect } = require("./helpers/test-helpers");

const ManagedGrant = artifacts.require("./ManagedGrant.sol");

module.exports = async function () {
  try {
    ({
      keepToken,
      tokenStaking,
      tokenGrant,
      keepRandomBeaconOperatorContract,
      permissiveStakingPolicy,
      tokenStakingEscrow,
      managedGrantFactory,
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

    console.log("Create Managed Grant");
    const duration = 1;
    const start = 1;
    const cliff = 1;
    const revocable = true;

    await keepToken.approve(managedGrantFactory.address, grantAmount, {
      from: grantManager,
    });

    const managedGrantAddress = await managedGrantFactory.createManagedGrant.call(
      grantee,
      grantAmount,
      duration,
      start,
      cliff,
      revocable,
      permissiveStakingPolicy.address,
      {
        from: grantManager,
      }
    );

    await managedGrantFactory.createManagedGrant(
      grantee,
      grantAmount,
      duration,
      start,
      cliff,
      revocable,
      permissiveStakingPolicy.address,
      {
        from: grantManager,
      }
    );

    const managedGrant = await ManagedGrant.at(managedGrantAddress);
    const grantID = await managedGrant.grantId();

    expect(await managedGrant.grantee()).equal(grantee);

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(0);
    expect(await tokenGrant.balanceOf(managedGrant.address)).to.eq.BN(
      grantAmount
    );
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
      keepRandomBeaconOperatorContract.address,
      { from: authorizer }
    );

    expect(await tokenGrant.balanceOf(managedGrantAddress)).to.eq.BN(
      grantAmount
    );

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    console.log("Cancel Stake");
    await tokenStaking.cancelStake(operator, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

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

    console.log("Cancel Stake");
    await tokenStaking.cancelStake(newOperator, { from: grantee });

    expect(
      await tokenStaking.eligibleStake(
        newOperator,
        keepRandomBeaconOperatorContract.address
      )
    ).to.eq.BN(0);

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
    await expectRevert(
      tokenStakingEscrow.withdraw(newOperator, {
        from: grantee,
      }),
      "Can not be called for managed grant"
    );

    await tokenStakingEscrow.withdrawToManagedGrantee(newOperator, {
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

    console.log("Success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
