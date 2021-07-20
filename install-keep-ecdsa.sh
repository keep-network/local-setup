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

# Fill absolute paths in config files with actual working directory, generate
# a new btc wallet address and set the address at
# Extensions.TBTC.Bitcoin.BeneficiaryAddress
BENEFICIARY_ADDRESS=$(NODE_NO_WARNINGS=1 bitcoind-wallet getNewAddress | sed 's/ *$//g')
echo BENEFICIARY_ADDRESS=$BENEFICIARY_ADDRESS #TODO: remove before merging to main
TMP_FILE=$(mktemp /tmp/config.local.1.toml.XXXXXXXXXX)
sed 's:WORKDIR:'$WORKDIR':;s/BENEFICIARY_ADDRESS/$BENEFICIARY_ADDRESS/g' config.local.1.toml > $TMP_FILE
mv $TMP_FILE config.local.1.toml
echo "config.local.1.toml" #TODO: remove before merging to main
cat config.local.1.toml #TODO: remove before merging to main

BENEFICIARY_ADDRESS=$(NODE_NO_WARNINGS=1 bitcoind-wallet getNewAddress | sed 's/ *$//g')
echo BENEFICIARY_ADDRESS=$BENEFICIARY_ADDRESS #TODO: remove before merging to main
TMP_FILE=$(mktemp /tmp/config.local.2.toml.XXXXXXXXXX)
sed 's:WORKDIR:'$WORKDIR':;s/BENEFICIARY_ADDRESS/$BENEFICIARY_ADDRESS/g' config.local.2.toml > $TMP_FILE
mv $TMP_FILE config.local.2.toml
echo "config.local.2.toml" #TODO: remove before merging to main
cat config.local.2.toml #TODO: remove before merging to main

BENEFICIARY_ADDRESS=$(NODE_NO_WARNINGS=1 bitcoind-wallet getNewAddress | sed 's/ *$//g')
echo BENEFICIARY_ADDRESS=$BENEFICIARY_ADDRESS #TODO: remove before merging to main
TMP_FILE=$(mktemp /tmp/config.local.3.toml.XXXXXXXXXX)
sed 's:WORKDIR:'$WORKDIR':;s/BENEFICIARY_ADDRESS/$BENEFICIARY_ADDRESS/g' config.local.3.toml > $TMP_FILE
mv $TMP_FILE config.local.3.toml
echo "config.local.2.toml" #TODO: remove before merging to main
cat config.local.2.toml #TODO: remove before merging to main

printf "${LOG_START}Creating storage directories...${LOG_END}"

cd $WORKDIR

# Create storage directories for keep-ecdsa clients.
mkdir -p storage/keep-ecdsa/1
mkdir -p storage/keep-ecdsa/2
mkdir -p storage/keep-ecdsa/3

printf "${LOG_START}Updating keep-ecdsa configuration...${LOG_END}"

# Set correct Geth WS port.
cd keep-ecdsa/solidity
TMP_FILE=$(mktemp /tmp/truffle.js.XXXXXXXXXX)
sed -e 's/\port\:.*/\port\: '8546,'/g;s/\websockets\:.*/\websockets\: 'true,'/g' truffle.js > $TMP_FILE
mv $TMP_FILE truffle.js

printf "${LOG_START}Linking dependencies...${LOG_END}"

cd "$WORKDIR/keep-core/solidity"
npm link

printf "${LOG_START}Running install script...${LOG_END}"

cd "$WORKDIR/keep-ecdsa"

./scripts/install.sh

printf "${DONE_START}keep-ecdsa deployed successfully!${DONE_END}"
