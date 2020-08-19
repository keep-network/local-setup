#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {getTBTCTokenBalance} from "./common.js";
import program from "commander"
import * as fs from 'fs'

program 
    .option('--bitcoin-electrum-host <host>', "electrum server host", "127.0.0.1")
    .option('--bitcoin-electrum-port <port>', "electrum server port", (port) => parseInt(port, 10), 50003)
    .option('--bitcoin-network <network>', "type of the bitcoin network (\"regtest\"|\"testnet\")", "regtest")
    .option('--blocks-timespan <blocks>', "blocks to search back from", (blocks) => parseInt(blocks, 10), 7000)
    .option('--ethereum-node <url>', "ethereum node url", "ws://127.0.0.1:8546")
    .option('--ethereum-pk <privateKey>', "private key of ethereum account", "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd")
    .parse(process.argv)

console.log("\nScript options values: ", program.opts(), "\n")

let tbtc

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
    const fromBlock = currentBlockNumber - program.blocksTimespan
    
    const createdDepositEvents = await tbtc.Deposit.systemContract.getPastEvents("Created", {fromBlock: fromBlock, toBlock: "latest"})
    console.log("number of 'Created' deposit events: ", createdDepositEvents.length)

    
    let htmlContent = ''
    let allCreatedEventCount = 1;
    let e2eTestCreatedEventCount = 1

    for (const createdEvent of createdDepositEvents) {
        console.log("created event count: ", allCreatedEventCount)
        const depositAddress = createdEvent.returnValues._depositContractAddress
        const keepAddress = createdEvent.returnValues._keepAddress

        console.log("getting deposit...")
        const deposit = await tbtc.Deposit.withAddress(depositAddress)
        
        console.log("getting deposit owner...")
        const depositOwner = await deposit.getOwner()

        // filter deposits that were created by e2e-test.js
        if (depositOwner === web3.eth.defaultAccount) {
            console.log("e2e-test created event count: ", e2eTestCreatedEventCount)

            console.log("getting current state...")
            const currentState = await deposit.getCurrentState()
            
            e2eTestCreatedEventCount++
            allCreatedEventCount++

            let bitcoinAddress = ''
            let createdDepositBlockNumber = ''
            let signerFee = ''
            let redemptionCost = ''
            let tbtcAccountBalance = ''
            let keepBondAmount = ''

            const waitingTimeForPublicKey = 1*1000 //1sec

            try {
                console.log("getting bitcoin address...")
                bitcoinAddress = await getBitcoinAddressTimeout(deposit, waitingTimeForPublicKey)
            } catch(err) {
                htmlContent += 
                `
                <tr bgcolor="#ff8000">
                    <td colspan="2">` + "depositAddress: " + depositAddress + `</td>
                    <td>` + depositStatesInverted[currentState] + `</td>
                    <td colspan="3">public key not set or not 64-bytes long </td>
                    <td>` + keepAddress + `</td>
                    <td></td>
                </tr>
                `
                if (err) {
                    console.log("retrieving bitcoin address error: ", err)
                }
                continue;
            }

            try {
                console.log("getting block number...")
                createdDepositBlockNumber = await createdEvent.blockNumber
                console.log("getting signer fee TBTC...")
                signerFee = await deposit.getSignerFeeTBTC()
                console.log("getting balance of deposit...")
                tbtcAccountBalance = await tbtc.Deposit.tokenContract.methods.balanceOf(depositAddress).call()
                console.log("getting bond amount...")
                keepBondAmount = await deposit.keepContract.methods.checkBondAmount().call()
                console.log("retrieved all data...")
            } catch(err) {
                htmlContent += 
                `
                <tr bgcolor="red">
                    <td colspan="2">` + "depositAddress: " + depositAddress + `</td>
                    <td>` + depositStatesInverted[currentState] + `</td>
                    <td colspan="3">` + err + ` </td>
                    <td>` + keepAddress + `</td>
                    <td></td>
                </tr>
                `
                if (err) {
                    console.log("getting info error: ", err)
                }
                continue;
            }

            const totalAttempts = 5
            for (let attempt = 1; attempt <= totalAttempts; attempt++) {
                try {
                    console.log("getting redemption cost...")
                    redemptionCost = await deposit.getRedemptionCost()
                    break;
                } catch (err) {
                    if (attempt === totalAttempts) {
                        console.debug(`last attempt ${attempt} failed while getting redemption cost`)
                        redemptionCost = `<div style="background-color:red">` + err + `</div>`
                        continue;
                    }

                    const backoffMillis = Math.pow(2, attempt) * 1000
                    const jitterMillis = Math.floor(Math.random() * 100)
                    const waitMillis = backoffMillis + jitterMillis

                    console.log(
                        `attempt ${attempt} failed while getting redemption cost; ` +
                        `retrying after ${waitMillis} milliseconds`
                    )

                    await new Promise(resolve => setTimeout(resolve, waitMillis))
                }
            }
            
            htmlContent += 
            `
            <tr>
                <td>` + bitcoinAddress + `</td>
                <td>` + createdDepositBlockNumber + `</td>
                <td>` + depositStatesInverted[currentState] + `</td>
                <td>` + signerFee + `</td>
                <td>` + redemptionCost + `</td>
                <td>` + tbtcAccountBalance + `</td>
                <td>` + keepAddress + `</td>
                <td>` + keepBondAmount + `</td>
            </tr>
            `
            
            console.log("bitcoin address: ", bitcoinAddress)
            console.log("createdDepositBlockNumber: ", createdDepositBlockNumber)
            console.log("current state: ", depositStatesInverted[currentState])
            console.log("signerFee: ", signerFee.toString())
            console.log("redemptionCost: ", redemptionCost.toString())
            console.log("tbtcAccountBalance: ", tbtcAccountBalance.toString())
            console.log("keepAddress: ", keepAddress)
            console.log("keepBondAmount: ", keepBondAmount.toString())
        } else {
            allCreatedEventCount++
        }
    }

    fs.writeFileSync('./site/index.html', await buildHtml(htmlContent));
}

function getBitcoinAddressTimeout(deposit, timeout) {
    return new Promise(function(resolve, reject) {
        deposit.getBitcoinAddress().then(resolve, reject);
        setTimeout(reject, timeout);
    });
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