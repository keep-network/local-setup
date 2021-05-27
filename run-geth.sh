#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

ETHEREUM_DIR="$PWD/ethereum"
GETH_DATA_DIR="$ETHEREUM_DIR/data"
GETH_ETHEREUM_ACCOUNT="0x3d373d872b7ba29d92ed47caa8605b4dd6ec84ef"

printf "${LOG_START}Starting geth...${LOG_END}"

# --unlock unlocks the signer account for proof of authority block signing,
# otherwise we can't run the network <_<
geth --port 0 --networkid 1101 --identity "somerandomidentity" \
    --ws --ws.addr "127.0.0.1" --ws.port "8546" --ws.origins "*" \
    --http --http.port "8545" --http.addr "127.0.0.1" --http.corsdomain "*" \
    --http.api "db,ssh,miner,admin,eth,net,web3,personal,debug" \
    --ws.api "db,ssh,miner,admin,eth,net,web3,personal,debug" \
    --datadir=$GETH_DATA_DIR --syncmode "fast" \
    --miner.etherbase=$GETH_ETHEREUM_ACCOUNT --mine --miner.threads=1 \
    --unlock $GETH_ETHEREUM_ACCOUNT --password <(echo "password") \
    --allow-insecure-unlock \
    --rpc.allow-unprotected-txs \
    --snapshot=false \
    --nodiscover --maxpeers 0
