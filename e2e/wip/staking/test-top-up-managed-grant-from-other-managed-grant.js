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

    const grantAmount1 = formatAmount(300000, 18);
    const grantAmount2 = formatAmount(400000, 18);
    const firstDelegationAmount = formatAmount(180000, 18);
    const secondDelegationAmount = formatAmount(230000, 18);

    await keepToken.transfer(grantManager, grantAmount1.add(grantAmount2), {
      from: owner,
    });
    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(
      grantAmount1.add(grantAmount2)
    );

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

    const {
      managedGrant: managedGrant1,
      grantID: grantID1,
    } = await createManagedGrant(
      grantManager,
      grantee,
      grantAmount1,
      duration,
      start,
      cliff,
      revocable,
      permissiveStakingPolicy.address
    );

    const {
      managedGrant: managedGrant2,
      grantID: grantID2,
    } = await createManagedGrant(
      grantManager,
      grantee,
      grantAmount2,
      duration,
      start,
      cliff,
      revocable,
      permissiveStakingPolicy.address
    );

    expect(await keepToken.balanceOf(grantManager)).to.eq.BN(0);

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

    await managedGrant1.stake(
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

    expect(await tokenGrant.availableToStake(grantID1)).to.eq.BN(
      grantAmount1.sub(firstDelegationAmount)
    );

    expect((await tokenStaking.getDelegationInfo(operator)).amount).to.eq.BN(
      firstDelegationAmount
    );

    console.log("Top Up");
    await expectRevert(
      managedGrant2.stake(
        tokenStaking.address,
        secondDelegationAmount,
        delegation,
        {
          from: grantee,
        }
      ),
      "Not the same grant"
    );

    expect(await tokenGrant.availableToStake(grantID2)).to.eq.BN(grantAmount2);

    console.log("success!");
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
