#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting keep-ecdsa deployment...${LOG_END}"

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
mkdir -p storage/keep-ecdsa/1
mkdir -p storage/keep-ecdsa/2
mkdir -p storage/keep-ecdsa/3

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