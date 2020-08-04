async function deployed(artifacts) {
  const KeepToken = artifacts.require("./KeepToken.sol");
  const TokenStaking = artifacts.require("./TokenStaking.sol");
  const KeepRandomBeaconOperator = artifacts.require(
    "./KeepRandomBeaconOperator.sol"
  );
  const TokenGrant = artifacts.require("./TokenGrant.sol");
  const PermissiveStakingPolicy = artifacts.require(
    "./PermissiveStakingPolicy.sol"
  );
  const TokenStakingEscrow = artifacts.require("./TokenStakingEscrow.sol");
  const ManagedGrantFactory = artifacts.require("./ManagedGrantFactory.sol");

  const keepToken = await KeepToken.deployed();
  const tokenStaking = await TokenStaking.deployed();
  const tokenGrant = await TokenGrant.deployed();
  const keepRandomBeaconOperatorContract = await KeepRandomBeaconOperator.deployed();
  const permissiveStakingPolicy = await PermissiveStakingPolicy.deployed();
  const tokenStakingEscrow = await TokenStakingEscrow.deployed();
  const managedGrantFactory = await ManagedGrantFactory.deployed();

  return {
    keepToken,
    tokenStaking,
    tokenGrant,
    keepRandomBeaconOperatorContract,
    permissiveStakingPolicy,
    tokenStakingEscrow,
    managedGrantFactory,
  };
}

module.exports.deployed = deployed;
