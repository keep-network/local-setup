#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import TBTC from "@keep-network/tbtc.js"
import ProviderEngine from "web3-provider-engine"
import Subproviders from "@0x/subproviders"

const engine = new ProviderEngine({ pollingInterval: 1000 })

engine.addProvider(
    // Private key of address 0xd6b0a1ca8f0641b97efec0f1ed73d72e58b38fa5
    // which corresponds to the account[5].
    new Subproviders.PrivateKeyWalletSubprovider(
        "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd"
    )
)
engine.addProvider(
    // Local geth instance.
    new Subproviders.RPCSubprovider(
        "http://127.0.0.1:8545"
    )
)

const web3 = new Web3(engine)

engine.start()

async function run() {
    // Set 0xd6b0a1ca8f0641b97efec0f1ed73d72e58b38fa5 as default account.
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[5]

    const tbtc = await TBTC.withConfig({
        web3: web3,
        bitcoinNetwork: "testnet",
        electrum: {
            testnet: {
                server: "electrumx-server.test.tbtc.network",
                port: 50002,
                protocol: "ssl"
            },
            testnetWS: {
                server: "electrumx-server.test.tbtc.network",
                port: 8443,
                protocol: "wss"
            }
        }
    })
}