#!/usr/bin/env node --experimental-modules

import Web3 from "../tbtc.js/node_modules/web3/src/index.js"
import TBTC from "../tbtc.js/index.js"
import ProviderEngine from "../tbtc.js/node_modules/web3-provider-engine/index.js"
import Subproviders from "../tbtc.js/node_modules/@0x/subproviders/lib/src/index.js"

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
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]

    const tbtc = await TBTC.withConfig({
        web3: web3,
        bitcoinNetwork: "testnet",
        electrum: {
            testnet: {
                server: "10.102.100.84",
                port: 50002,
                protocol: "ssl"
            },
            testnetWS: {
                server: "10.102.100.84 ",
                port: 50004,
                protocol: "wss"
            }
        }
    })

    const satoshiLotSize = web3.utils.toBN(100000)
    const deposit = await tbtc.Deposit.withSatoshiLotSize(satoshiLotSize)

    await runDeposit(deposit, true)
}

async function runDeposit(deposit, mintOnActive) {
    deposit.autoSubmit()

    return new Promise(async (resolve, reject) => {
        deposit.onBitcoinAddressAvailable(async address => {
            try {
                const lotSize = await deposit.getSatoshiLotSize()
                console.log(
                    "\tGot deposit address:",
                    address,
                    "; fund with:",
                    lotSize.toString(),
                    "satoshis please."
                )
                console.log("Now monitoring for deposit transaction...")
            } catch (err) {
                reject(err)
            }
        })

        deposit.onActive(async () => {
            try {
                if (mintOnActive) {
                    console.log("Deposit is active, minting...")
                    const tbtc = await deposit.mintTBTC()

                    resolve(tbtc)
                } else {
                    resolve("Deposit is active. Minting disabled by parameter.")
                }
            } catch (err) {
                reject(err)
            }
        })
    })
}

run()
    .then(result => {
        console.log("Test completed sucessfully")

        process.exit(0)
    })
    .catch(error => {
        console.error("Test errored out with error: ", error)

        process.exit(1)
    })