#!/bin/bash

shopt -s expand_aliases

mkdir -p datadir

# Start bitcoind.
bitcoind -regtest -datadir=datadir \
  -port=18333 \
  -rpcport=18332 \
  -rpcuser=user \
  -rpcpassword=password \
  -rpcbind=0.0.0.0 \
  -rpcallowip=0.0.0.0/0 \
  -fallbackfee=0.0002 \
  -txindex \
  --daemon

sleep 10

alias btccli='bitcoin-cli -regtest -datadir=datadir -rpcport=18332 -rpcuser=user -rpcpassword=password'

MAIN_FILE="/workdir/datadir/regtest/wallets/main/wallet.dat"
if [ -f "$MAIN_FILE" ]; then
    btccli loadwallet "main"
else 
    btccli createwallet "main"
fi


address=$(btccli getnewaddress "main")

# Mine some initial blocks to unlock coinbase.
btccli generatetoaddress 1000 "$address"

trap "exit" INT

# Run mining loop.
while true; do
  hash=$(btccli generatetoaddress 1 "$address" | tr -d '[" \n"]')
  count=$(btccli getblockcount)
  printf "Generated block number $count ($hash) using miner address $address\n"
done
