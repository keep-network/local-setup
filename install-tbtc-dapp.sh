#!/bin/bash

set -e

LOG_START='\n\e[1;36m'  # new line + bold + color
LOG_END='\n\e[0m'       # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting tBTC dApp deployment...${LOG_END}"

printf "${LOG_START}Linking dependencies...${LOG_END}"

cd $WORKDIR/keep-ecdsa/solidity
npm link

cd $WORKDIR/tbtc/solidity
npm link

printf "${LOG_START}Install tbtc.js dependencies...${LOG_END}"

cd $WORKDIR/tbtc.js

npm install

npm link

npm link @keep-network/keep-ecdsa @keep-network/tbtc

printf "${LOG_START}Install tbtc-dapp dependencies...${LOG_END}"

cd $WORKDIR/tbtc-dapp

npm install

npm link @keep-network/tbtc.js

printf "${DONE_START}tbtc-dapp initialized successfully!${DONE_END}"
