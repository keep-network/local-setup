#!/bin/bash

set -e

while true; do
  echo "Checking Geth state..."

  ETH_BLOCK=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":67}' http://localhost:8545 | jq -r '.result')

  if [ -z "$ETH_BLOCK" ] || [ "$ETH_BLOCK" == "0x0" ]; then
    echo "Geth still not initialized - waiting..."
    sleep 30
    continue;
  fi

  echo "Geth initialized!"

  break
done

while true; do
  echo "Checking Bitcoin Core state..."

  BTC_BLOCK=$(curl -s --user user:password --data-binary '{"jsonrpc": "1.0", "id": "curltest", "method": "getblockcount", "params": []}' -H 'content-type: text/plain;' http://127.0.0.1:18332 | jq -r '.result')

  if [ -z "$BTC_BLOCK" ] || [ "$BTC_BLOCK" == "0" ]; then
    echo "Bitcoin Core still not initialized - waiting..."
    sleep 30
    continue;
  fi

  echo "Bitcoin Core initialized!"

  break
done

