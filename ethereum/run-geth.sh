#!/bin/bash

set -e

GETH_DATA_DIR="/root/.ethereum"
GETH_ETHEREUM_ACCOUNT="0x3d373d872b7ba29d92ed47caa8605b4dd6ec84ef"

# --unlock unlocks the signer account for proof of authority block signing,
# otherwise we can't run the network <_<
geth --port 0 --networkid 1101 --identity "somerandomidentity" \
    --ws --wsaddr "0.0.0.0" --wsport "8546" --wsorigins "*" \
    --rpc --rpcport "8545" --rpcaddr "0.0.0.0" --rpccorsdomain "*" \
    --rpcapi "miner,admin,eth,net,web3,personal,debug" \
    --wsapi "miner,admin,eth,net,web3,personal,debug" \
    --datadir=$GETH_DATA_DIR --syncmode "fast" \
    --miner.etherbase=$GETH_ETHEREUM_ACCOUNT --mine --miner.threads=1 \
    --unlock $GETH_ETHEREUM_ACCOUNT --password /root/ethereum-password \
    --allow-insecure-unlock
