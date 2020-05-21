#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Initializing relay...${LOG_END}"

cd tbtc/solidity

# Get network ID.
NETWORK_ID_OUTPUT=$(truffle exec ./scripts/get-network-id.js)
NETWORK_ID=$(echo "$NETWORK_ID_OUTPUT" | tail -1)

# Extract TestnetRelay contract address.
JSON_QUERY=".networks.\"${NETWORK_ID}\".address"
TESTNET_RELAY_CONTRACT="$WORKDIR/tbtc/solidity/build/contracts/TestnetRelay.json"
TESTNET_RELAY_CONTRACT_ADDRESS=$(cat ${TESTNET_RELAY_CONTRACT} | jq "${JSON_QUERY}" | tr -d '"')

printf "${LOG_START}TestnetRelay contract address is: ${TESTNET_RELAY_CONTRACT_ADDRESS}${LOG_END}"

cd $WORKDIR

# Copy all config files to the right relay directory.
cp -R configs/relays/. relays/maintainer/maintainer/config/

cd relays/maintainer/maintainer/config

# Fill SUMMA_RELAY_CONTRACT env in config file with their actual value.
sed -i .OLD 's:RELAYCONTRACT:'$TESTNET_RELAY_CONTRACT_ADDRESS':' .my_env_file.env
rm .my_env_file.env.OLD

cd ../..

printf "${DONE_START}relay initialized successfully!${DONE_END}"

printf "${LOG_START}Starting relay...${LOG_END}"

# Install python virtualenv.
pipenv install --python=$(pyenv which python3.7)

export PYTHONPATH="$WORKDIR/relays/maintainer/"

# Run relay-maintainer.
pipenv run python maintainer/header_forwarder/h.py .my_env_file.env



