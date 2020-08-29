#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Initializing relay...${LOG_END}"

cd "$WORKDIR/tbtc/solidity"

# Get network ID.
NETWORK_ID_OUTPUT=$(npx truffle exec ./scripts/get-network-id.js)
NETWORK_ID=$(echo "$NETWORK_ID_OUTPUT" | tail -1)

# Extract TestnetRelay contract address.
JSON_QUERY=".networks.\"${NETWORK_ID}\".address"
TESTNET_RELAY_CONTRACT="$WORKDIR/tbtc/solidity/build/contracts/TestnetRelay.json"
TESTNET_RELAY_CONTRACT_ADDRESS=$(cat ${TESTNET_RELAY_CONTRACT} | jq "${JSON_QUERY}" | tr -d '"')

printf "${LOG_START}TestnetRelay contract address is: ${TESTNET_RELAY_CONTRACT_ADDRESS}${LOG_END}"

cd $WORKDIR

# Copy all config files to the right relay directory.
cp -R configs/relays/. relays/maintainer/maintainer/config/

cd "$WORKDIR/relays/maintainer/maintainer/config"

# Fill SUMMA_RELAY_CONTRACT env in config file with their actual value.
TMP_FILE=$(mktemp /tmp/.my_env_file.env.XXXXXXXXXX)
sed 's:RELAYCONTRACT:'$TESTNET_RELAY_CONTRACT_ADDRESS':' .my_env_file.env > $TMP_FILE
mv $TMP_FILE .my_env_file.env

cd $WORKDIR

# Install right python version to run the relay.
printf 'y\n' | pyenv install 3.7.7
pyenv global 3.7.7

cd "$WORKDIR/relays/maintainer/"

# Install python virtualenv.
pipenv install --python=$(pyenv which python3.7)

printf "${DONE_START}relay initialized successfully!${DONE_END}"