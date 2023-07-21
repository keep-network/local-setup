#!/bin/bash

[ethereum]
  URL = "ws://127.0.0.1:8546"
  KeyFile = "/Users/someuser/ethereum/data/keystore/UTC--2018-03-11T01-37-33.202765887Z--AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAA"
[bitcoin.electrum]
  URL = "http://localhost:3002"

[network]
Bootstrap = false
Peers = [
	"/ip4/127.0.0.1/tcp/3919/ipfs/16Uiu2HAmFRJtCWfdXhZEZHWb4tUpH1QMMgzH1oiamCfUuK6NgqWX",
]
Port = 3920

[storage]
Dir = "{storage_location}"

[clientInfo]
Port = 9601

[developer]
TokenStakingAddress = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
RandomBeaconAddress = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
WalletRegistryAddress = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
BridgeAddress = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
WalletCoordinatorAddress = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
