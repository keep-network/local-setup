#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

ETHEREUM_DIR="$PWD/ethereum"
GETH_DATA_DIR="$ETHEREUM_DIR/data"

printf "${LOG_START}Removing old chain data...${LOG_END}"

rm -rf "$GETH_DATA_DIR/geth"

printf "${LOG_START}Initializing geth...${LOG_END}"

geth --datadir=$GETH_DATA_DIR init $ETHEREUM_DIR/genesis/genesis.json
