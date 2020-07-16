#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {assertMintedTbtcAmount, assertTbtcAccountBalance, assertReceivedBtcAmount} from "./assertions.js";
import {getTBTCTokenBalance} from "./common.js";
import BitcoinRpc from "bitcoind-rpc"
import Bluebird from "bluebird"
import config from "../configs/bitcoin/config.json"

const bitcoinRpc = new BitcoinRpc(config)
Bluebird.promisifyAll(bitcoinRpc)

const depositsCount = 2
const satoshiLotSize = 100000 // 0.001 BTC
const signerFeeDivisor = 0.0005 // 0.05%
const tbtcDepositAmount = 1000000000000000 // satoshiLotSize * satoshiMultiplier
const signerFee = signerFeeDivisor * tbtcDepositAmount
const tbtcDepositAmountMinusSignerFee = tbtcDepositAmount - signerFee
const satoshiRedemptionFee = 150

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
        bitcoinNetwork: "regtest",
        electrum: {
            testnetWS: {
                server: "127.0.0.1",
                port: 50003,
                protocol: "ws"
            }
        }
    })

    const initialTbtcAccountBalance = await getTBTCTokenBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount
    )

    console.log(
        `Initial TBTC balance for account ${web3.eth.defaultAccount} ` +
        `is: ${initialTbtcAccountBalance}`
    )

    const deposits = []
    for (let i = 1; i <= depositsCount; i++) {
        console.log(`\nStarting deposit number [${i}]...\n`)
        const deposit = await createDeposit(tbtc, satoshiLotSize)
        deposits.push(deposit)

        assertMintedTbtcAmount(web3, deposit, tbtcDepositAmountMinusSignerFee)

        // check whether signer fee went to the expected address
        await assertTbtcAccountBalance(web3, tbtc, deposit.address, signerFee)

        console.log(`\nDeposit ${deposit.address} has been created successfully.`)
    }

    const afterDepositsTbtcAccountBalance = initialTbtcAccountBalance.add(
        web3.utils.toBN(depositsCount).mul(
            web3.utils.toBN(tbtcDepositAmountMinusSignerFee)
        )
    )

    console.log(
        `TBTC balance for account ${web3.eth.defaultAccount} after ` +
        `performing deposits should be: ${afterDepositsTbtcAccountBalance}. ` +
        `Checking assertion...`
    )

    await assertTbtcAccountBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount,
        afterDepositsTbtcAccountBalance
    )

    console.log(`\nStarting redemption of the first deposit...\n`)
    const redeemerAddress = (await bitcoinRpc.getnewaddressAsync()).result
    console.log(`Generated reedemer address: ${redeemerAddress}`)
    const message = await redeemDeposit(tbtc, deposits[0].address, redeemerAddress)
    console.log(`\nRedemption outcome: ${message}\n`)

    const afterRedemptionTbtcAccountBalance = afterDepositsTbtcAccountBalance.sub(
        web3.utils.toBN(tbtcDepositAmount)
    )

    console.log(
        `TBTC balance for account ${web3.eth.defaultAccount} after ` +
        `performing redemption should be: ${afterRedemptionTbtcAccountBalance}. ` +
        `Checking assertion...`
    )

    await assertTbtcAccountBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount,
        afterRedemptionTbtcAccountBalance
    )

    const afterRedemptionReceivedBtcAmount =
        (satoshiLotSize - satoshiRedemptionFee) / 100000000

    console.log(
        `Received BTC amount for redeemer address ${redeemerAddress} after ` +
        `performing redemption should be: ${afterRedemptionReceivedBtcAmount}. ` +
        `Checking assertion...`
    )

    await assertReceivedBtcAmount(
        bitcoinRpc,
        redeemerAddress,
        afterRedemptionReceivedBtcAmount
    )
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

                await bitcoinRpc.sendtoaddressAsync(address, lotSize / 100000000)

                console.log("Deposit transaction sent")
            } catch (err) {
                reject(err)
            }
        })

        deposit.onActive(async () => {
            try {
                console.log("Deposit is active, minting...")
                const tbtcAmount = await deposit.mintTBTC()

                resolve({
                    address: deposit.address,
                    tbtcAmount: tbtcAmount,
                })
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
        console.log("Test completed successfully")

        process.exit(0)
    })
    .catch(error => {
        console.error("Test errored out with error: ", error)

        process.exit(1)
    })