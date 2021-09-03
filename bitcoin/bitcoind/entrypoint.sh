#!/bin/bash

shopt -s expand_aliases

mkdir -p datadir

# Start bitcoind.
./bitcoind -regtest -datadir=datadir \
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

alias btccli='./bitcoin-cli -regtest -datadir=datadir -rpcport=18332 -rpcuser=user -rpcpassword=password'

# Use a specific private key.
privateKey="cTj6Z9fxMr4pzfpUhiN8KssVzZjgQz9zFCfh87UrH8ZLjh3hGZKF"

btccli importprivkey "$privateKey" "main"

# Get the imported address. It should start with `bcrt1` because this is the right prefix for the regtest network.
address=$(btccli getaddressesbylabel "main" | jq -r 'with_entries(select(.key | startswith("bcrt1"))) | 'keys[0]'')

# Mine some initial blocks to unlock coinbase.
btccli generatetoaddress 1000 "$address"

trap "exit" INT

# Run mining loop.
while true; do
  hash=$(btccli generatetoaddress 1 "$address" | tr -d '[" \n"]')
  count=$(btccli getblockcount)
  printf "Generated block number $count ($hash) using miner address $address\n"
  sleep 30 # mine a block every 30 seconds
done
