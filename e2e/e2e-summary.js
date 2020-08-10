#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {getTBTCTokenBalance} from "./common.js";
import program from "commander"
import * as fs from 'fs'
import web3Utils from "web3-utils"

const { toBN } = web3Utils

program 
.option('--bitcoin-electrum-host <host>', "electrum server host", "127.0.0.1")
.option('--bitcoin-electrum-port <port>', "electrum server port", (port) => parseInt(port, 10), 50003)
.option('--bitcoin-network <network>', "type of the bitcoin network (\"regtest\"|\"testnet\")", "regtest")
.option('--ethereum-node <url>', "ethereum node url", "ws://127.0.0.1:8546")
.option('--ethereum-pk <privateKey>', "private key of ethereum account", "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd")
.parse(process.argv)

console.log("\nScript options values: ", program.opts(), "\n")

let tbtc
const blocksTimespan = 1000

const engine = new ProviderEngine({ pollingInterval: 1000 })

engine.addProvider(
    new Subproviders.PrivateKeyWalletSubprovider(program.ethereumPk)
)
engine.addProvider(
    new WebsocketSubprovider({rpcUrl: program.ethereumNode})
)

const web3 = new Web3(engine)

engine.start()

async function run() {
    // Set first account as the default account.
    // Please make sure it is the same account as in e2e-test.js
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]
    
    tbtc = await TBTC.withConfig({
        web3: web3,
        bitcoinNetwork: program.bitcoinNetwork,
        electrum: {
            testnetWS: {
                server: program.bitcoinElectrumHost,
                port: program.bitcoinElectrumPort,
                protocol: "ws"
            }
        }
    })

    const depositStates = tbtc.depositFactory.State
    const depositStatesInverted = Object.keys(depositStates).reduce((obj, key) => {
        obj[depositStates[key]] = key;
        return obj
      }, {})
    
    const initialTbtcAccountBalance = await getTBTCTokenBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount
        )
        
    console.log(
        `Initial TBTC balance for account ${web3.eth.defaultAccount} ` +
        `is: ${initialTbtcAccountBalance}`
        )

    const currentBlockNumber = await web3.eth.getBlockNumber()
    const currentTimestamp = (await web3.eth.getBlock(currentBlockNumber)).timestamp
    
    // const fromBlock = 0
    const fromBlock = currentBlockNumber - blocksTimespan
    
    const createdDepositEvents = await tbtc.Deposit.systemContract.getPastEvents("Created", {fromBlock: fromBlock, toBlock: "latest"})

    const signingGroupFormationTimeout = await tbtc.Deposit.constantsContract.methods.getSigningGroupFormationTimeout().call()
    const signingTimeout = await tbtc.Deposit.constantsContract.methods.getSignatureTimeout().call()
    
    let htmlContent = ''
    
    for (const createdEvent of createdDepositEvents) {
        const depositAddress = createdEvent.returnValues._depositContractAddress
        const keepAddress = createdEvent.returnValues._keepAddress
        const deposit = await tbtc.Deposit.withAddress(depositAddress)
        
        const depositOwner = await deposit.getOwner()

        // filter deposits that were created by e2e-test.js
        // if (depositOwner === web3.eth.defaultAccount) {
            const currentState = await deposit.getCurrentState()
            
            // if (currentState === depositStates['AWAITING_SIGNER_SETUP']) {
            //     if (toBN(currentTimestamp).gt(toBN(createdEvent.returnValues._timestamp).add(toBN(signingTimeout)))) {
            //         await deposit.contract.methods.notifySignerSetupFailed().call()
            //         continue;
            //     }
            // }
            
            // if (currentState === depositStates['AWAITING_WITHDRAWAL_SIGNATURE']) {
            //     const redemptionRequestedAt = await getTimeOfEvent("RedemptionRequested", depositAddress)
            //     if (toBN(currentTimestamp).gt(toBN(redemptionRequestedAt).add(toBN(signingGroupFormationTimeout)))) {
            //         await deposit.contract.methods.notifyRedemptionSignatureTimedOut().call()
            //         continue;
            //     }
            // }
    
            const bitcoinAddress = await deposit.getBitcoinAddress()
            const createdDepositBlockNumber = await createdEvent.blockNumber
            const satoshiLotSize = (await deposit.getSatoshiLotSize()).toString()
            const signerFee = await deposit.getSignerFeeTBTC()
            const redemptionCost = await deposit.getRedemptionCost()
            const tbtcAccountBalance = await tbtc.Deposit.tokenContract.methods.balanceOf(depositAddress).call()
            const keepBondAmount = await deposit.keepContract.methods.checkBondAmount().call()
            
            htmlContent += 
            `
            <tr>
                <td>` + bitcoinAddress + `</td>
                <td>` + createdDepositBlockNumber + `</td>
                <td>` + satoshiLotSize + `</td>
                <td>` + depositStatesInverted[currentState] + `</td>
                <td>` + signerFee + `</td>
                <td>` + redemptionCost + `</td>
                <td>` + tbtcAccountBalance + `</td>
                <td>` + keepAddress + `</td>
                <td>` + keepBondAmount + `</td>
            </tr>
            `
            
            console.log("bitcoin address: ", bitcoinAddress)
            console.log("satoshi lot size: ", satoshiLotSize)
            console.log("createdDepositBlockNumber: ", createdDepositBlockNumber)
            console.log("current state: ", depositStatesInverted[currentState])
            console.log("signerFee: ", signerFee.toString())
            console.log("redemptionCost: ", redemptionCost.toString())
            console.log("tbtcAccountBalance: ", tbtcAccountBalance.toString())
            console.log("keepAddress: ", keepAddress)
            console.log("keepBondAmount: ", keepBondAmount.toString())
        // }
    }

    fs.writeFileSync('./site/index.html', await buildHtml(htmlContent));
}

async function getTimeOfEvent(eventName, depositAddress) {
    const event = (
      await tbtc.depositFactory.systemContract.getPastEvents(eventName, {
        fromBlock: 0,
        toBlock: "latest",
        filter: { _depositContractAddress: depositAddress }
      })
    )[0]

    const block = await web3.eth.getBlock(event.blockNumber)
    return block.timestamp
}

async function buildHtml(content) {

    const header =
`
<!DOCTYPE html>
<html>
<body>

<table border="1">
    <thead>
        <tr>
            <th>Bitcoin address</th>
            <th>Block# of created deposit</th>
            <th>Satoshi Lot Size</th>
            <th>Current State</th>
            <th>Signer fee</th>
            <th>Redemption cost</th>
            <th>Tbtc account balance</th>
            <th>Keep address</th>
            <th>Keep bond amount</th>
        </tr>
    </thead>
    <tbody>
`

    const footer = 
`
    </tbody>
</table>

</body>
</html>
`

    return header + content + footer;
}


run()
    .then(() => {
        console.log("Test summary completed successfully")

        process.exit(0)
    })
    .catch(error => {
        console.error("Test summary errored out with error: ", error)

        process.exit(1)
    })