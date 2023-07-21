#!/bin/bash
set -emou pipefail

LOG_START='\n\e[1;36m'           # new line + bold + color
LOG_END='\n\e[0m'                # new line + reset color
DONE_START='\n\e[1;32m'          # new line + bold + green
DONE_END='\n\n\e[0m'             # new line + reset

_term() { 
  kill -TERM "$GETH_PID" 2>/dev/null
  wait $GETH_PID
}
trap _term SIGINT SIGTERM

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

run_geth () {
  geth --port 3000 --networkid 1101 --identity 'somerandomidentity' --ws \
    --ws.addr '0.0.0.0' --ws.port '8546' --ws.origins '*' \
    --ws.api 'admin, debug, web3, eth, txpool, personal, ethash, miner, net' \
    --http --http.port '8545' --http.addr '0.0.0.0' --http.corsdomain '' \
    --http.api 'admin, debug, web3, eth, txpool, personal, ethash, miner, net' \
    --datadir=$GETH_DATA_DIR --allow-insecure-unlock \
    --miner.etherbase=$GETH_ETHEREUM_ACCOUNT --mine --miner.threads=1 \
    --http.vhosts=* --maxpeers 0 &

  GETH_PID=$!
}

printf "${LOG_START}Starting Deployment...${LOG_END}"

if [ "$LAST_DEPLOY_HASH" != "$TBTC_DEPLOY_HASH" ]; then
  rm -rf $GETH_DATA_DIR/geth
  geth --datadir=$GETH_DATA_DIR init $GETH_DATA_DIR/genesis.json

  run_geth

  sleep 5

  # Run script
  printf "${LOG_START}Unlocking Accounts...${LOG_END}"

  cd /keep-core/solidity/random-beacon
  npx hardhat unlock-accounts --network development

  # deploy threshold-network/solidity-contracts
  printf "${LOG_START}Deploying threshold-network/solidity-contracts contracts...${LOG_END}"
  cd /solidity-contracts
  yarn deploy --reset --network development
  rm -rf $GETH_DATA_DIR/solidity-contracts
  cp -r deployments $GETH_DATA_DIR/solidity-contracts

  printf "${LOG_START}Deploying random-beacon contracts...${LOG_END}"
  cd /keep-core/solidity/random-beacon
  yarn deploy --reset --network development
  rm -rf $GETH_DATA_DIR/random-beacon
  cp -r deployments $GETH_DATA_DIR/random-beacon

  printf "${LOG_START}Deploying ecdsa contracts...${LOG_END}"
  cd /keep-core/solidity/ecdsa
  rm -rf .openzeppelin/unknown-*.json
  yarn deploy --reset --network development
  rm -rf $GETH_DATA_DIR/core-ecdsa
  cp -r deployments $GETH_DATA_DIR/core-ecdsa

  printf "${LOG_START}Deploying tbtc contracts...${LOG_END}"
  cd /tbtc-v2/solidity
  yarn deploy --reset --network development
  rm -rf $GETH_DATA_DIR/tbtc
  cp -r deployments $GETH_DATA_DIR/tbtc

  printf "${DONE_START}Contract Deployment completed!${DONE_END}"

  printf "${DONE_START}Starting Token Initialization...${DONE_END}"

  addresses=(
    "0xbe49dfad6716c4f61071625b23f00275c50ca54e" \
    "0x8156667e5d6f0b4e5a7a5bd5ae9751727fd54bd6" \
    "0x9007149ff7e43e76f50efdfe30a36bf13e195688" \
    "0xc45c020dc849df25ecb8bc207b98d78e92f578be" \
    "0x24288be099f9704e374272bf08bdd7a3f1224096" \
    "0x6b3a230a665fd0c6da9835d1663f40f746df4fc2" \
    "0x5ecae28a1797d1bD541D72dFaeC9752B0D6BDf60" \
    "0xe39748042494F4e5D1442184C2f9D6310a9b941a" \
    "0x8408369214dc4901A59f63cD8DEF3Fc9a97b45E5" \
    "0xc3dB630de2ac197d0c6E873f26C665fa54024a9f" \
    "0xE3c7130c2c9F9E8b7C2C1d77b1CC2eC219d9A077" \
    "0xBBd18fDd1B83C56bc80B40C13ac6DE1da735a540" \
    "0xC91B84775aA2DF5d42a06E70E0A5363C3403B535" \
    "0x1dB34148282D586BE5d3fE56D4610c5Dea82453E" \
    "0x592b41DF681e39d81B260FCb15a8D856f5BB4a1B" \
    "0xac50Df44eCC53Bb14751D71abAE9994478dB3936" \
    "0x413f85FbF88393C4BBE63414b5Cba1EAAcF5468B" \
    "0xd84dE872DE10F29745964c7F2ecb8BFAC5E46D52" \
    "0x05Ff0312625Aa34594f161bE44A92e43754c7d28" \
    "0x272b73c504eaD2e25A19947071E1d112BC54BE7b" \
    "0xbe49dfad6716c4f61071625b23f00275c50ca54e" \
  )

  cd /keep-core

  COUNTER=1
  for address in ${addresses[@]}; do
    printf "${DONE_START}[$COUNTER/21] Initializing $address${DONE_END}"
    ./scripts/initialize.sh --stake-owner $address
    let COUNTER=COUNTER+1
  done

  echo "$TBTC_DEPLOY_HASH" > $GETH_DATA_DIR/last-deploy-hash

  printf "${DONE_START}Finished Token Initialization...${DONE_END}"
else
  rm -rf /solidity-contracts/deployments
  cp -r $GETH_DATA_DIR/solidity-contracts /solidity-contracts/deployments

  rm -rf /keep-core/solidity/random-beacon/deployments
  cp -r $GETH_DATA_DIR/random-beacon /keep-core/solidity/random-beacon/deployments

  rm -rf /keep-core/solidity/ecdsa/deployments
  cp -r $GETH_DATA_DIR/core-ecdsa /keep-core/solidity/ecdsa/deployments

  rm -rf /tbtc-v2/solidity/deployments
  cp -r $GETH_DATA_DIR/tbtc /tbtc-v2/solidity/deployments

  run_geth

  sleep 5

  cd /keep-core/solidity/random-beacon
  npx hardhat unlock-accounts --network development

  printf "${DONE_START}Contracts already deployed!${DONE_END}"
fi

wait "$GETH_PID"
