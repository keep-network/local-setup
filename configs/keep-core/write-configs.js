const fs = require('fs');
const path = require("path")

const ROOT_PATH = path.join(__dirname, "../..")
const STORAGE_PATH = path.join(ROOT_PATH, "storage/keep-core")
const DATA_PATH = path.join(ROOT_PATH, "docker/geth/.data")
const KEYSTORE_PATH = path.join(DATA_PATH, "keystore")
const BOOTSTRAP_ADDRESS = "/ip4/127.0.0.1/tcp/3920/ipfs/16Uiu2HAm7qzQy4MyGJA6qrrBqDNuhwtFBxq4XYkN7q51kDSKFSgF"

const walletCoordinatorArtifact 
  = require(`${DATA_PATH}/tbtc/development/WalletCoordinator.json`)
const bridgeArtifact
  = require(`${DATA_PATH}/tbtc/development/Bridge.json`)
const randomBeaconArtifact 
  = require(`${DATA_PATH}/random-beacon/development/RandomBeacon.json`)
const walletRegistryArtifact 
  = require(`${DATA_PATH}/core-ecdsa/development/WalletRegistry.json`)
const tokenStakingArtifact 
  = require(`${DATA_PATH}/solidity-contracts/development/TokenStaking.json`)

function applyTemplate(template, config) {
  let match; while (match = /{(\w+)}/.exec(template)) {
    const token = match[1]

    const replacement = config[token]
    if (replacement === undefined) {
      template = template.replace('{'+token+'}', `FIXME: UNABLE TO FIND ${token}`)
    } else {
      template = template.replace('{'+token+'}', replacement)
    }
  }

  return template
}

fs.readFile('template.toml', 'utf8', (err, template) => {
  if (err) {
    console.error(err)
    return
  }

  const keyFiles = fs.readdirSync(KEYSTORE_PATH)
  keyFiles.forEach((keyFile, i) => {
    let config = {
      'ethereum_keyfile': `${KEYSTORE_PATH}/${keyFile}`,
      'network_port': 3920 + i,
      'storage_dir': `${STORAGE_PATH}/${i}`,
      'client_port': 8081 + i,
      'wallet_coordinator_address': walletCoordinatorArtifact.address,
      'bridge_address': bridgeArtifact.address,
      'random_beacon_address': randomBeaconArtifact.address,
      'wallet_registry_address': walletRegistryArtifact.address,
      'token_staking_address': tokenStakingArtifact.address,
    }
    if (i === 0) {
      config['peers'] = ""
    } else {
      config['peers'] = `Peers = ["${BOOTSTRAP_ADDRESS}"]`
    }

    fs.writeFileSync(`local-${i}.toml`, applyTemplate(template, config))
  })
});
