#!/usr/bin/env -S node --experimental-json-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import { BitcoinHelpers } from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {
  assertMintedTbtcAmount,
  assertTbtcAccountBalance,
  assertBtcBalance,
} from "./assertions.js"
import {
  getTBTCTokenBalance,
  getBtcBalance,
  importBitcoinPrivateKey,
  generateBitcoinPrivateKey,
  sendBitcoinTransaction,
  returnBitcoinToDepositor,
} from "./common.js"
import bcoin from "bcoin"
import wif from "wif"
import program from "commander"

program
  .option("--bitcoin-electrum-host <host>", "electrum server host", "127.0.0.1")
  .option(
    "--bitcoin-electrum-port <port>",
    "electrum server port",
    (port) => parseInt(port, 10),
    50003
  )
  .option(
    "--bitcoin-network <network>",
    'type of the bitcoin network ("regtest"|"testnet")',
    "regtest"
  )
  .option(
    "--bitcoin-depositor-pk <privateKey>",
    "private key of the Bitcoin depositor in WIF format",
    "cTj6Z9fxMr4pzfpUhiN8KssVzZjgQz9zFCfh87UrH8ZLjh3hGZKF"
  )
  .option("--ethereum-node <url>", "ethereum node url", "ws://127.0.0.1:8546")
  .option(
    "--ethereum-pk <privateKey>",
    "private key of ethereum account",
    "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd"
  )
  .option(
    "--lot-size-satoshis <lot>",
    "lot size in satoshis",
    (lot) => parseInt(lot, 10),
    1000000
  )
  .parse(process.argv)

const signerFeeDivisor = 0.0005 // 0.05%
const satoshiMultiplier = 10000000000 // 10^10
const tbtcDepositAmount = program.lotSizeSatoshis * satoshiMultiplier
const signerFee = signerFeeDivisor * tbtcDepositAmount
const tbtcDepositAmountMinusSignerFee = tbtcDepositAmount - signerFee
const satoshiRedemptionFee = 2700

bcoin.set(program.bitcoinNetwork)

const engine = new ProviderEngine({ pollingInterval: 1000 })

engine.addProvider(
  new Subproviders.PrivateKeyWalletSubprovider(program.ethereumPk)
)
engine.addProvider(new WebsocketSubprovider({ rpcUrl: program.ethereumNode }))

const web3 = new Web3(engine)

engine.start()

async function run() {
  // Set first account as the default account.
  web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]

  const tbtc = await TBTC.withConfig({
    web3: web3,
    bitcoinNetwork: program.bitcoinNetwork,
    electrum: {
      server: program.bitcoinElectrumHost,
      port: program.bitcoinElectrumPort,
      protocol: "ws",
    },
  })

  const btcBlock = await BitcoinHelpers.withElectrumClient(
    async (electrumClient) => {
      return electrumClient.latestBlockHeight()
    }
  )

  const ethBlock = await web3.eth.getBlockNumber()

  console.log(
    `Starting e2e test at BTC block ${btcBlock} and ETH block ${ethBlock}`
  )

  const bitcoinWalletDB = new bcoin.WalletDB({ db: "memory" })
  await bitcoinWalletDB.open()
  const bitcoinWallet = await bitcoinWalletDB.create()

  const bitcoinDepositorKeyRing = await importBitcoinPrivateKey(
    bcoin,
    wif,
    bitcoinWallet,
    program.bitcoinDepositorPk
  )

  const bitcoinRedeemerKeyRing = await generateBitcoinPrivateKey(
    bcoin,
    bitcoinWallet
  )

  const initialTbtcAccountBalance = await getTBTCTokenBalance(
    tbtc,
    web3.eth.defaultAccount
  )

  // When a deposit is opened, the total tBTC value received by the requester
  // is smaller than the deposit amount due to the signer fee. On the other
  // hand, the redeemer needs to provide an exact deposit amount to redeem
  // a deposit. Because of that, we need to check the account's tBTC balance
  // and open two deposits if the amount doesn't allow to make the redemption.
  const depositsCount = initialTbtcAccountBalance.lt(
    web3.utils.toBN(tbtcDepositAmount)
  )
    ? 2
    : 1

  console.log(
    `Initial TBTC balance for account ${web3.eth.defaultAccount} ` +
      `is: ${initialTbtcAccountBalance} - ${depositsCount} deposit(s) ` +
      `will be opened`
  )

  const deposits = []
  for (let i = 1; i <= depositsCount; i++) {
    console.log(`\nStarting deposit number [${i}]...\n`)
    const deposit = await createDeposit(
      tbtc,
      program.lotSizeSatoshis,
      bitcoinDepositorKeyRing
    )
    deposits.push(deposit)

    assertMintedTbtcAmount(deposit.tbtcAmount, tbtcDepositAmountMinusSignerFee)

    const actualTbtcBalanceBn = await getTBTCTokenBalance(tbtc, deposit.address)
    // check whether signer fee went to the expected address
    await assertTbtcAccountBalance(
      deposit.address,
      actualTbtcBalanceBn,
      signerFee
    )

    console.log(`\nDeposit ${deposit.address} has been created successfully.`)
  }

  const afterDepositsTbtcAccountBalance = initialTbtcAccountBalance.add(
    web3.utils
      .toBN(depositsCount)
      .mul(web3.utils.toBN(tbtcDepositAmountMinusSignerFee))
  )

  console.log(
    `TBTC balance for account ${web3.eth.defaultAccount} after ` +
      `performing deposits should be: ${afterDepositsTbtcAccountBalance}. ` +
      `Checking assertion...`
  )

  let actualTbtcBalanceBn = await getTBTCTokenBalance(
    tbtc,
    web3.eth.defaultAccount
  )
  await assertTbtcAccountBalance(
    web3.eth.defaultAccount,
    actualTbtcBalanceBn,
    afterDepositsTbtcAccountBalance
  )

  console.log(`\nStarting redemption of the first deposit...\n`)
  const redeemerAddress = bitcoinRedeemerKeyRing.getAddress("string")
  console.log(`Using redeemer address: ${redeemerAddress}`)

  const beforeRedemptionBtcBalance = await getBtcBalance(
    BitcoinHelpers,
    redeemerAddress
  )

  const message = await redeemDeposit(
    tbtc,
    deposits[0].address,
    redeemerAddress
  )
  console.log(`\nRedemption outcome: ${message}\n`)

  const afterRedemptionTbtcAccountBalance = afterDepositsTbtcAccountBalance.sub(
    web3.utils.toBN(tbtcDepositAmount)
  )

  console.log(
    `TBTC balance for account ${web3.eth.defaultAccount} after ` +
      `performing redemption should be: ${afterRedemptionTbtcAccountBalance}. ` +
      `Checking assertion...`
  )

  actualTbtcBalanceBn = await getTBTCTokenBalance(tbtc, web3.eth.defaultAccount)
  await assertTbtcAccountBalance(
    web3.eth.defaultAccount,
    actualTbtcBalanceBn,
    afterRedemptionTbtcAccountBalance
  )

  const afterRedemptionBtcBalance = beforeRedemptionBtcBalance.add(
    web3.utils
      .toBN(program.lotSizeSatoshis)
      .sub(web3.utils.toBN(satoshiRedemptionFee))
  )

  console.log(
    `BTC balance for redeemer address ${redeemerAddress} after ` +
      `performing redemption should be: ${afterRedemptionBtcBalance}. ` +
      `Checking assertion...`
  )

  await assertBtcBalance(
    BitcoinHelpers,
    redeemerAddress,
    afterRedemptionBtcBalance
  )

  console.log(`\nReturning redeemed bitcoins to the depositor...\n`)

  await returnBitcoinToDepositor(
    bcoin,
    BitcoinHelpers,
    bitcoinDepositorKeyRing,
    bitcoinRedeemerKeyRing
  )
}

async function createDeposit(tbtc, satoshiLotSize, keyRing) {
  const deposit = await tbtc.Deposit.withSatoshiLotSize(
    web3.utils.toBN(satoshiLotSize)
  )

  deposit.onError((err) => {
    console.error(err)
    process.exit(1)
  })

  deposit.autoSubmit()

  return new Promise(async (resolve, reject) => {
    deposit.onBitcoinAddressAvailable(async (address) => {
      try {
        const lotSize = await deposit.getLotSizeSatoshis()
        console.log(
          "\tGot deposit address:",
          address,
          "; fund with:",
          lotSize.toString(),
          "satoshis please."
        )
        console.log("Now monitoring for deposit transaction...")

        await sendBitcoinTransaction(
          bcoin,
          BitcoinHelpers,
          address,
          lotSize,
          keyRing
        )

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

      redemption.onWithdrawn((transactionID) => {
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
  .then((result) => {
    console.log("Test completed successfully")

    process.exit(0)
  })
  .catch((error) => {
    console.error("Test errored out with error: ", error)

    process.exit(1)
  })
