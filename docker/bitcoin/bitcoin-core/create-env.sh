#!/bin/sh

./bitcoind -regtest \
  -port=18333 \
  -rpcport=18332 \
  -rpcuser=user \
  -rpcpassword=password \
  --daemon

alias btccli='./bitcoin-cli -regtest -rpcport=18332 -rpcuser=user -rpcpassword=password'

printf "Waiting for regtest bitcoind to start"
while ! btccli getconnectioncount 2>/dev/null 1>&2
do printf .; sleep 1
done; echo

btccli createwallet "testwallet"
ADDR=$(btccli getnewaddress '' bech32)
PUBKEY=$(btccli getaddressinfo $ADDR | jq -r .pubkey)

LENX2=$(printf $PUBKEY | wc -c)
LEN=$((LENX2/2))
LENHEX=$(echo "obase=16; $LEN" | bc)
SCRIPT=$(echo 51${LENHEX}${PUBKEY}51ae)

cat <<EOF
ADDR=$ADDR
PUBKEY=$PUBKEY
SCRIPT=$SCRIPT
EOF

btccli stop 2>&1

datadir=/root/.bitcoin
mkdir -p $datadir
cat > $datadir/bitcoin.conf <<EOF
signet=1
[signet]
daemon=1
signetchallenge=$SCRIPT
EOF

alias btccli="./bitcoin-cli -rpcport=18332 -rpcuser=user -rpcpassword=password -datadir=$datadir"

./bitcoind -datadir=$datadir \
  -port=18333 \
  -rpcport=18332 \
  -rpcuser=user \
  -rpcpassword=password \
  --daemon

printf "Waiting for custom Signet bitcoind to start"
while ! btccli getconnectioncount 2>/dev/null 1>&2
do printf .; sleep 1
done; echo

NADDR=$(btccli getnewaddress)

../contrib/signet/miner --cli="./bitcoin-cli -datadir=$datadir" generate 1 --block-time=1 --address="$NADDR" --grind-cmd='./bitcoin-util grind'
1d75e55a

./bitcoin-cli -datadir=$datadir getblocktemplate '{"rules": ["signet","segwit"]}' \
  | ../contrib/signet/generate.py --cli="./bitcoin-cli -datadir=$datadir" genpsbt --address="$NADDR" \
  | ./bitcoin-cli -datadir=$datadir -stdin walletprocesspsbt

./bitcoin-cli -datadir=$datadir stop
