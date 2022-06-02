#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m'      # new line + reset color

WORK_DIR="$(realpath "$(dirname "$0")")"

ETHEREUM_DIR="$WORK_DIR/ethereum"
GETH_DATA_DIR="$ETHEREUM_DIR/.data"

printf "${LOG_START}Removing old chain data...${LOG_END}"

rm -rf "$GETH_DATA_DIR"

printf "${LOG_START}Preparing chain data directory: $GETH_DATA_DIR ${LOG_END}"
mkdir -p "$GETH_DATA_DIR"

printf "${LOG_START}Copying keystore...${LOG_END}"
cp -r "$ETHEREUM_DIR/keystore" "$GETH_DATA_DIR/keystore"

printf "${LOG_START}Initializing geth...${LOG_END}"

geth --datadir=$GETH_DATA_DIR init $ETHEREUM_DIR/genesis/genesis.json
