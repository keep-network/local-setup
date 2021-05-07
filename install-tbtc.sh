#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

BTC_NETWORK="regtest"

while getopts n: option; do
  case "${option}" in
  n) BTC_NETWORK=${OPTARG};;
  *) echo "invalid option";;
  esac
done

printf "${LOG_START}Starting tBTC deployment...${LOG_END}"

printf "${LOG_START}Using $BTC_NETWORK Bitcoin network${LOG_END}"

cd "$WORKDIR/relay-genesis"
npm install

if [ "$BTC_NETWORK" == "testnet" ]; then
  # Deploy TestnetRelay instead of the defaull MockRelay.
  printf "${LOG_START}Updating testnet relay configuration...${LOG_END}"

  cd "$WORKDIR/tbtc/solidity/migrations"
  jq --arg forceRelay TestnetRelay '. + {forceRelay: $forceRelay}' relay-config.json > relay-config.json.tmp && mv relay-config.json.tmp relay-config.json

  bitcoinTest=$(node "$WORKDIR/relay-genesis/relay-genesis.js")
  BITCOIN_TEST=$(echo "$bitcoinTest" | tail -1)

  jq --arg bitcoinTest ${BITCOIN_TEST} '.init.bitcoinTest = $bitcoinTest' relay-config.json > relay-config.json.tmp && mv relay-config.json.tmp relay-config.json
  jq '.init.bitcoinTest |= fromjson' relay-config.json > relay-config.json.tmp && mv relay-config.json.tmp relay-config.json
fi

printf "${LOG_START}Running install script...${LOG_END}"

cd "$WORKDIR/tbtc"

# Remove node modules for clean installation
rm -rf /solidity/node_modules

# Run tBTC install script.
./scripts/install.sh

cd "$WORKDIR/tbtc/solidity"

if [ "$BTC_NETWORK" == "regtest" ]; then
  printf "${LOG_START}Initialize MockRelay...${LOG_END}"

  npx truffle exec "$WORKDIR/relay-genesis/update-mock-relay.js"
fi

printf "${DONE_START}tBTC deployed successfully!${DONE_END}"

# Initialize KEEP-ECDSA

printf "${LOG_START}Initializing keep-ecdsa...${LOG_END}"

cd "$WORKDIR/keep-ecdsa/solidity"

# Get network ID.
NETWORK_ID_OUTPUT=$(npx truffle exec ./scripts/get-network-id.js --network local)
NETWORK_ID=$(echo "$NETWORK_ID_OUTPUT" | tail -1)

printf "${LOG_START}Network ID: ${NETWORK_ID}${LOG_END}"

# Extract TBTCSystem contract address.
JSON_QUERY=".networks.\"${NETWORK_ID}\".address"
TBTC_SYSTEM_CONTRACT="$WORKDIR/tbtc/solidity/build/contracts/TBTCSystem.json"
TBTC_SYSTEM_CONTRACT_ADDRESS=$(cat ${TBTC_SYSTEM_CONTRACT} | jq "${JSON_QUERY}" | tr -d '"')

printf "${LOG_START}TBTCSystem contract address is: ${TBTC_SYSTEM_CONTRACT_ADDRESS}${LOG_END}"

cd "$WORKDIR/keep-ecdsa"

# Run keep-ecdsa initialization script.
./scripts/initialize.sh --application-address $TBTC_SYSTEM_CONTRACT_ADDRESS

printf "${DONE_START}keep-ecdsa initialized successfully!${DONE_END}"
