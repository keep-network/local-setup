#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting tBTC dApp deployment...${LOG_END}"

printf "${LOG_START}Preparing keep-ecdsa artifacts...${LOG_END}"

cd $WORKDIR/keep-ecdsa

cd solidity
ln -sf build/contracts artifacts

printf "${LOG_START}Preparing tbtc artifacts...${LOG_END}"

cd $WORKDIR/tbtc

cd solidity
ln -sf build/contracts artifacts

printf "${LOG_START}Updating tbtc.js configuration...${LOG_END}"

cd $WORKDIR/tbtc.js

TBTC_DIR="$WORKDIR/tbtc/solidity" jq '.dependencies."@keep-network/tbtc" = env.TBTC_DIR' package.json > package.json.tmp && mv package.json.tmp package.json
KEEP_ECDSA_DIR="$WORKDIR/keep-ecdsa/solidity" jq '.dependencies."@keep-network/keep-ecdsa" = env.KEEP_ECDSA_DIR' package.json > package.json.tmp && mv package.json.tmp package.json

printf "${LOG_START}Updating tbtc-dapp configuration...${LOG_END}"

cd $WORKDIR/tbtc-dapp

TBTC_JS_DIR="$WORKDIR/tbtc.js" jq '.dependencies."@keep-network/tbtc.js" = env.TBTC_JS_DIR' package.json > package.json.tmp && mv package.json.tmp package.json

printf "${LOG_START}Install tbtc-dapp dependencies...${LOG_END}"

cd $WORKDIR/tbtc-dapp

npm install

printf "${DONE_START}tbtc-dapp initialized successfully!${DONE_END}" 
