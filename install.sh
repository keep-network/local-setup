#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule init
git submodule update

# Install KEEP-CORE

printf "${LOG_START}Starting keep-core deployment...${LOG_END}"

printf "${LOG_START}Copying config files...${LOG_END}"

cp -R configs/keep-core/. keep-core/configs/

cd keep-core/configs

sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.1.toml
rm *.OLD

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

mkdir -p "$WORKDIR/storage/keep-core/1"

printf "${LOG_START}Running install script...${LOG_END}"

cd keep-core

./scripts/install.sh

printf "${DONE_START}keep-core deployed successfully!${DONE_END}"

# Install KEEP-ECDSA

printf "${LOG_START}Starting keep-ecdsa deployment...${LOG_END}"

cd $WORKDIR

printf "${LOG_START}Copying config files...${LOG_END}"

cp -R configs/keep-ecdsa/. keep-ecdsa/configs/

cd keep-ecdsa/configs

sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.1.toml
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.2.toml
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.3.toml
rm *.OLD

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

mkdir -p "$WORKDIR/storage/keep-ecdsa/1"
mkdir -p "$WORKDIR/storage/keep-ecdsa/2"
mkdir -p "$WORKDIR/storage/keep-ecdsa/3"

printf "${LOG_START}Running install script...${LOG_END}"

cd keep-ecdsa

# Set correct geth WS port
cd solidity
sed -i .OLD 's:8545:8546:' truffle.js
rm *.OLD
cd ..

./scripts/install.sh

printf "${DONE_START}keep-ecdsa deployed successfully!${DONE_END}"

# Install TBTC

printf "${LOG_START}Starting tBTC deployment...${LOG_END}"

cd "$WORKDIR/tbtc"

./scripts/install.sh

printf "${DONE_START}tBTC deployed successfully!${DONE_END}"

# Initialize KEEP-ECDSA

printf "${LOG_START}Initializing keep-ecdsa...${LOG_END}"

cd solidity

NETWORK_ID_OUTPUT=$(truffle exec ./scripts/get-network-id.js)
NETWORK_ID=$(echo "$NETWORK_ID_OUTPUT" | tail -1)

JSON_QUERY=".networks.\"${NETWORK_ID}\".address"
TBTC_SYSTEM_CONTRACT="$WORKDIR/tbtc/solidity/build/contracts/TBTCSystem.json"
TBTC_SYSTEM_CONTRACT_ADDRESS=$(cat ${TBTC_SYSTEM_CONTRACT} | jq "${JSON_QUERY}" | tr -d '"')

# TODO: Automatic prompt response.
printf "${LOG_START}TBTCSystem contract address is: ${TBTC_SYSTEM_CONTRACT_ADDRESS}
Paste it below when prompted for client application address\n${LOG_END}"

cd "$WORKDIR/keep-ecdsa"

./scripts/initialize.sh

printf "${DONE_START}keep-ecdsa initialized successfully!${DONE_END}"
