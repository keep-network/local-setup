const { expectRevert } = require("@openzeppelin/test-helpers");

const {
  newAccount,
  newFundedAccount,
  getAccounts,
} = require("./helpers/accounts");

const { deployed } = require("./helpers/contracts");

const { formatAmount, expect } = require("./helpers/test-helpers");

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

    const grantAmount = formatAmount(300000, 18);
    const liquidTokens = formatAmount(280000, 18);
    const firstDelegationAmount = formatAmount(180000, 18);
    const secondDelegationAmount = formatAmount(230000, 18);

    await keepToken.transfer(grantManager, grantAmount, {
      from: owner,
    });
    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(grantAmount);

    console.log("Create managed grant");

    const createManagedGrant = async (
      grantManager,
      grantee,
      grantAmount,
      duration,
      start,
      cliff,
      revocable,
      stakingPolicyAddress
    ) => {
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
        stakingPolicyAddress,
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
        stakingPolicyAddress,
        {
          from: grantManager,
        }
      );

      const managedGrant = await ManagedGrant.at(managedGrantAddress);

      const grantID = await managedGrant.grantId();

      expect(await managedGrant.grantee()).equal(grantee);
      expect(await tokenGrant.balanceOf(managedGrant.address)).to.eq.BN(
        grantAmount
      );
      expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(grantAmount);

      return { managedGrant, grantID };
    };

    const duration = 1;
    const start = 1;
    const cliff = 1;
    const revocable = true;

    const { managedGrant, grantID } = await createManagedGrant(
      grantManager,
      grantee,
      grantAmount,
      duration,
      start,
      cliff,
      revocable,
      permissiveStakingPolicy.address
    );

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(0);

    console.log("Transfer liquid tokens to grantee");
    await keepToken.transfer(grantee, liquidTokens, {
      from: owner,
    });
    expect(await keepToken.balanceOf(grantee)).to.eq.BN(liquidTokens);

    console.log("Delegate from grant");

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

    expect(await tokenGrant.availableToStake(grantID)).to.eq.BN(
      grantAmount.sub(firstDelegationAmount)
    );

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Top Up From Liquid Tokens");
    await expectRevert(
      keepToken.approveAndCall(
        tokenStaking.address,
        secondDelegationAmount,
        delegation,
        {
          from: grantee,
        }
      ),
      "Must be from a grant"
    );

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
