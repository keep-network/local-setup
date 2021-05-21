const { readFileSync } = require("fs")
const { resolve } = require("path")

/**
 * @typedef TruffleDeployer Truffle's Deployer object used in migrations.
 * @property {Number} network_id Network ID.
 */

/**
 * Reads deployed contract address from an artifact in node_modules dependency.
 * It assumes the dependency package holds deployed contracts data in `artifacts`
 * directory.
 *
 * @param {string} packageName Dependency package name.
 * @param {string} contractName Contract name.
 * @param {TruffleDeployer|Number} deployerOrNetworkID Truffle's deployer object or Network ID provided
 * directly.
 * @return {string} Contract address.
 */
function readExternalContractAddress(
  packageName,
  contractName,
  deployerOrNetworkID
) {
  let networkID
  // Support truffle's deployer object used in migrations.
  if (deployerOrNetworkID.network_id) {
    networkID = deployerOrNetworkID.network_id
  } else {
    networkID = deployerOrNetworkID
  }

  let artifactRaw
  try {
    artifactRaw = readFileSync(
      resolve(`./node_modules/${packageName}/artifacts/${contractName}.json`)
    )
  } catch (err) {
    throw new Error(`failed to read artifact file: ${err.message}`)
  }

  let artifact
  try {
    artifact = JSON.parse(artifactRaw)
  } catch (err) {
    throw new Error(`failed to parse artifact file: ${err.message}`)
  }

  if (!artifact.networks[networkID]) {
    throw new Error(
      `configuration for network ${networkID} not found in ${contractName}`
    )
  }

  if (!artifact.networks[networkID].address) {
    throw new Error(
      `missing address for network ${networkID} in ${contractName}`
    )
  }

  return artifact.networks[networkID].address
}

module.exports = { readExternalContractAddress }
