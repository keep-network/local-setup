const MinimumStakeSchedule = artifacts.require("MinimumStakeSchedule");
const GrantStaking = artifacts.require("GrantStaking");
const Locks = artifacts.require("Locks");
const TopUps = artifacts.require("TopUps");
const KeepToken = artifacts.require("KeepToken");
const KeepRegistry = artifacts.require("KeepRegistry");
const TokenStaking = artifacts.require("TokenStaking");
const TokenStakingEscrow = artifacts.require("TokenStakingEscrow");
const TokenGrant = artifacts.require("TokenGrant");
const StakingPortBacker = artifacts.require("StakingPortBacker");

const { storeAddress } = require("./helpers/contracts-data");

module.exports = async function (accounts) {
  try {
    const initializationPeriod = 1;
    const keepRegistry = await KeepRegistry.deployed();

    const keepToken = await KeepToken.deployed();
    const tokenGrant = await TokenGrant.deployed();
    const tokenStakingOld = await TokenStaking.deployed();

    const tokenStakingEscrow = await TokenStakingEscrow.new(
      keepToken.address,
      tokenGrant.address
    );

    await TokenStaking.detectNetwork();
    await TokenStaking.link(
      "MinimumStakeSchedule",
      (await MinimumStakeSchedule.new()).address
    );
    await TokenStaking.link("GrantStaking", (await GrantStaking.new()).address);
    await TokenStaking.link("Locks", (await Locks.new()).address);
    await TokenStaking.link("TopUps", (await TopUps.new()).address);

    const tokenStakingNew = await TokenStaking.new(
      keepToken.address,
      tokenGrant.address,
      tokenStakingEscrow.address,
      keepRegistry.address,
      initializationPeriod
    );

    await tokenStakingEscrow.transferOwnership(tokenStakingNew.address);
    await tokenGrant.authorizeStakingContract(tokenStakingNew.address);

    const stakingPortBacker = await StakingPortBacker.new(
      keepToken.address,
      tokenGrant.address,
      tokenStakingOld.address,
      tokenStakingNew.address
    );

    console.log("OLD Token Staking", tokenStakingOld.address);

    console.log("NEW Token Staking", tokenStakingNew.address);
    console.log("Token Staking Escrow", tokenStakingEscrow.address);

    console.log("Staking Port Backer", stakingPortBacker.address);

    storeAddress("TokenStakingOld", tokenStakingOld.address);
    storeAddress("TokenStakingNew", tokenStakingNew.address);
    storeAddress("TokenStakingEscrow", tokenStakingEscrow.address);
    storeAddress("StakingPortBacker", stakingPortBacker.address);
  } catch (err) {
    console.error("unexpected error:", err);
    process.exit(1);
  }
  process.exit();
};
