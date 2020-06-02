#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"

const satoshiLotSize = 100000 // 0.001 BTC
const btcAddress = '2N6L4Q6fphMzuWqERQYTwgEMmQTpcqgdVFK'

const engine = new ProviderEngine({ pollingInterval: 1000 })

engine.addProvider(
    // Private key of address 0xd6b0a1ca8f0641b97efec0f1ed73d72e58b38fa5
    // which corresponds to the account[5].
    new Subproviders.PrivateKeyWalletSubprovider(
        "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd"
    )
)
engine.addProvider(
    // Local geth websocket endpoint.
    new WebsocketSubprovider(
        {rpcUrl: "ws://127.0.0.1:8546"}
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
                server: "10.102.100.24",
                port: 443,
                protocol: "ssl"
            },
            testnetWS: {
                server: "10.102.100.24",
                port: 8080,
                protocol: "ws"
            }
        }
    })

    console.log(`\nStarting deposit...\n`)
    const deposit = await createDeposit(tbtc, satoshiLotSize)
    console.log(`\nDeposit ${deposit.address} has been created successfully.\n`)

    console.log(`\nStarting redemption...\n`)
    const message = await redeemDeposit(tbtc, deposit.address, btcAddress)
    console.log(`\nRedemption outcome: ${message}\n`)
}

async function createDeposit(tbtc, satoshiLotSize) {
    const deposit = await tbtc.Deposit.withSatoshiLotSize(
        web3.utils.toBN(satoshiLotSize)
    )

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
                console.log("Deposit is active, minting...")
                await deposit.mintTBTC()
                resolve(deposit)
            } catch (err) {
                reject(err)
            }
        })
    })
}

async function redeemDeposit(tbtc, depositAddress, redeemerAddress) {
    return new Promise(async (resolve, reject) => {
        try {
            const deposit = await tbtc.Deposit.withAddress(depositAddress)
            const redemption = await deposit.requestRedemption(redeemerAddress)
            redemption.autoSubmit()

            redemption.onWithdrawn(transactionID => {
                console.log()

                resolve(
                    `Redeemed deposit ${deposit.address} with Bitcoin transaction ` +
                    `${transactionID}.`
                )
            })
        } catch (err) {
            reject(err)
        }
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