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

# Install KEEP-CORE.

printf "${LOG_START}Starting keep-core deployment...${LOG_END}"

printf "${LOG_START}Copying config files...${LOG_END}"

# Copy all config files to the right keep-core directory.
cp -R configs/keep-core/. keep-core/configs/

cd keep-core/configs

# Fill absolute paths in config file with actual working directory.
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.1.toml
rm *.OLD

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

# Create storage directory for keep-core client.
mkdir -p "$WORKDIR/storage/keep-core/1"

printf "${LOG_START}Running install script...${LOG_END}"

cd keep-core

# Run keep-core install script. Answer with ENTER twice on emerging prompts.
printf '\n\n' | ./scripts/install.sh

printf "${DONE_START}keep-core deployed successfully!${DONE_END}"

# Install KEEP-ECDSA.

printf "${LOG_START}Starting keep-ecdsa deployment...${LOG_END}"

cd $WORKDIR

printf "${LOG_START}Copying config files...${LOG_END}"

# Copy all config files to the right keep-ecdsa directory.
cp -R configs/keep-ecdsa/. keep-ecdsa/configs/

cd keep-ecdsa/configs

# Fill absolute paths in config files with actual working directory.
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.1.toml
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.2.toml
sed -i .OLD 's:WORKDIR:'$WORKDIR':' config.local.3.toml
rm *.OLD

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

# Create storage directories for keep-ecdsa clients.
mkdir -p "$WORKDIR/storage/keep-ecdsa/1"
mkdir -p "$WORKDIR/storage/keep-ecdsa/2"
mkdir -p "$WORKDIR/storage/keep-ecdsa/3"

printf "${LOG_START}Running install script...${LOG_END}"

cd keep-ecdsa

# Set correct Geth WS port.
cd solidity
sed -i .OLD 's:8545:8546:' truffle.js
rm *.OLD
cd ..

# Run keep-ecdsa install script.  Answer with ENTER twice on emerging prompts.
printf '\n\n' | ./scripts/install.sh

printf "${DONE_START}keep-ecdsa deployed successfully!${DONE_END}"

# Install TBTC.

printf "${LOG_START}Starting tBTC deployment...${LOG_END}"

cd "$WORKDIR/tbtc"

# Run tBTC install script.  Answer with ENTER on emerging prompt.
printf '\n' | ./scripts/install.sh

printf "${DONE_START}tBTC deployed successfully!${DONE_END}"

# Initialize KEEP-ECDSA

printf "${LOG_START}Initializing keep-ecdsa...${LOG_END}"

cd solidity

# Get network ID.
NETWORK_ID_OUTPUT=$(truffle exec ./scripts/get-network-id.js)
NETWORK_ID=$(echo "$NETWORK_ID_OUTPUT" | tail -1)

# Extract TBTCSystem contract address.
JSON_QUERY=".networks.\"${NETWORK_ID}\".address"
TBTC_SYSTEM_CONTRACT="$WORKDIR/tbtc/solidity/build/contracts/TBTCSystem.json"
TBTC_SYSTEM_CONTRACT_ADDRESS=$(cat ${TBTC_SYSTEM_CONTRACT} | jq "${JSON_QUERY}" | tr -d '"')

printf "${LOG_START}TBTCSystem contract address is: ${TBTC_SYSTEM_CONTRACT_ADDRESS}${LOG_END}"

cd "$WORKDIR/keep-ecdsa"

# Run keep-ecdsa initialization script. Answer with ENTER on the first prompt
# and with TBTCSystem contract address on the second one.
printf '\n'${TBTC_SYSTEM_CONTRACT_ADDRESS}'\n' | ./scripts/initialize.sh

printf "${DONE_START}keep-ecdsa initialized successfully!${DONE_END}"
