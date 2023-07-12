#!/bin/bash
set -eou pipefail

LOG_START='\n\e[1;36m'           # new line + bold + color
LOG_END='\n\e[0m'                # new line + reset color
DONE_START='\n\e[1;32m'          # new line + bold + green
DONE_END='\n\n\e[0m'             # new line + reset


hash_folder () {
  find $1 -type f -print0 | sort -z | xargs -0 sha1sum | sha1sum | cut -d ' ' -f 1
}

hash_together () {
  echo "$1 $2" | sha1sum | cut -d ' ' -f 1
}

hash_solidity () {
  hash_together $(hash_folder "$1/contracts") $(hash_folder "$1/deploy")
}

SOLIDITY_CONTRACTS_DEPLOY_HASH=$(hash_solidity /solidity-contracts)
SOLIDITY_CONTRACTS_DEPLOY_LOCK="/deployment-state/$SOLIDITY_CONTRACTS_DEPLOY_HASH"

RANDOM_BEACON_DEPLOY_HASH=$(hash_solidity /keep-core/solidity/random-beacon)
RANDOM_BEACON_DEPLOY_HASH=$(hash_together "$SOLIDITY_CONTRACTS_DEPLOY_HASH" "$RANDOM_BEACON_DEPLOY_HASH")

ECDSA_DEPLOY_HASH=$(hash_solidity /keep-core/solidity/ecdsa)
ECDSA_DEPLOY_HASH=$(hash_together "$RANDOM_BEACON_DEPLOY_HASH" "$ECDSA_DEPLOY_HASH")

TBTC_DEPLOY_HASH=$(hash_solidity /tbtc-v2/solidity)
TBTC_DEPLOY_HASH=$(hash_together "$ECDSA_DEPLOY_HASH" "$TBTC_DEPLOY_HASH")

touch $GETH_DATA_DIR/last-deploy-hash
LAST_DEPLOY_HASH=$(cat $GETH_DATA_DIR/last-deploy-hash)

if [ "$LAST_DEPLOY_HASH" != "$TBTC_DEPLOY_HASH" ]; then
  rm -rf $GETH_DATA_DIR/geth
  geth --datadir=$GETH_DATA_DIR init $GETH_DATA_DIR/genesis.json
fi

geth --port 3000 --networkid 1101 --identity 'somerandomidentity' --ws \
  --ws.addr '0.0.0.0' --ws.port '8546' --ws.origins '*' \
  --ws.api 'admin, debug, web3, eth, txpool, personal, ethash, miner, net' \
  --http --http.port '8545' --http.addr '0.0.0.0' --http.corsdomain '' \
  --http.api 'admin, debug, web3, eth, txpool, personal, ethash, miner, net' \
  --datadir=$GETH_DATA_DIR --allow-insecure-unlock \
  --miner.etherbase=$GETH_ETHEREUM_ACCOUNT --mine --miner.threads=1 \
  --http.vhosts=* --maxpeers 0 & 

sleep 5

# Run script
printf "${LOG_START}Unlocking Accounts...${LOG_END}"

cd /keep-core/solidity/random-beacon
npx hardhat unlock-accounts --network development

printf "${LOG_START}Starting Deployment...${LOG_END}"

if [ "$LAST_DEPLOY_HASH" != "$TBTC_DEPLOY_HASH" ]; then

  # deploy threshold-network/solidity-contracts
  printf "${LOG_START}Deploying threshold-network/solidity-contracts contracts...${LOG_END}"
  cd /solidity-contracts
  yarn deploy --reset --network development

  printf "${LOG_START}Deploying random-beacon contracts...${LOG_END}"
  cd /keep-core/solidity/random-beacon
  yarn deploy --reset --network development

  printf "${LOG_START}Deploying ecdsa contracts...${LOG_END}"
  cd /keep-core/solidity/ecdsa
  rm -rf .openzeppelin/unknown-*.json
  yarn deploy --reset --network development

  printf "${LOG_START}Deploying tbtc contracts...${LOG_END}"
  cd /tbtc-v2/solidity
  yarn deploy --reset --network development

  echo "$TBTC_DEPLOY_HASH" > $GETH_DATA_DIR/last-deploy-hash

  printf "${DONE_START}Contract Deployment completed!${DONE_END}"
else
  printf "${DONE_START}Contracts already deployed!${DONE_END}"
fi

# Runs geth indefinitely
tail -f /dev/null
