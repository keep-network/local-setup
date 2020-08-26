#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {getTBTCTokenBalance} from "./common.js";
import program from "commander"
import * as fs from 'fs'
import {promiseTimeout} from "./common.js";

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
    const millisec = 1000

    for (const createdEvent of createdDepositEvents) {
        console.log("created event count: ", allCreatedEventCount)
        allCreatedEventCount++

        const depositAddress = createdEvent.returnValues._depositContractAddress
        const keepAddress = createdEvent.returnValues._keepAddress
        let deposit = {}

        try {
            const depositPromise = tbtc.Deposit.withAddress(depositAddress)
            console.log("getting deposit...")
            deposit = await promiseTimeout(1*millisec, depositPromise) // timeout 1sec
            if (deposit === false) {
                const depositTimeoutMsg = "deposit retrieval timed out..."
                console.log(depositTimeoutMsg)
                htmlContent += await buildTimeout(depositAddress, '', depositTimeoutMsg, keepAddress)
                continue
            }
        } catch(error) {
            htmlContent += await buildError(depositAddress, '', error, keepAddress)
            continue;
        }

        let depositOwner = {}
        try {
            const depositOwnerPromise = deposit.getOwner()
            console.log("getting deposit owner...")
            depositOwner = await promiseTimeout(1*millisec, depositOwnerPromise) // timeout 1sec
            if (depositOwner === false) {
                const depositOwnerTimeoutMsg = "deposit owner retrieval timed out..."
                console.log(depositOwnerTimeoutMsg)
                htmlContent += await buildTimeout(depositAddress, '', depositOwnerTimeoutMsg, keepAddress)
                continue
            }
        } catch(error) {
            htmlContent += await buildError(depositAddress, '', error, keepAddress)
            continue;
        }

        // filter deposits that were created by e2e-test.js
        if (depositOwner === web3.eth.defaultAccount) {
            let bitcoinAddress = ''
            let createdDepositBlockNumber = ''
            let signerFee = ''
            let redemptionCost = ''
            let tbtcAccountBalance = ''
            let keepBondAmount = ''
            let state = ''

            console.log("e2e-test created event count: ", e2eTestCreatedEventCount)
            e2eTestCreatedEventCount++

            console.log("getting block number...")
            createdDepositBlockNumber = await createdEvent.blockNumber

            try {
                const currentStatePromise = deposit.getCurrentState()
                console.log("getting current state...")
                let currentState = await promiseTimeout(1*millisec, currentStatePromise) // timeout 1sec
                if (currentState === false) {
                    const currentStateTimeoutMsg = "current state retrieval timed out..."
                    console.log(bitcoinAddressTimeoutMsg)
                    state = await buildTimeoutCell(currentStateTimeoutMsg)
                } else {
                    state = depositStatesInverted[currentState]
                }
            } catch(error) {
                htmlContent += await buildError(depositAddress, state, error, keepAddress)
                continue;
            }

            try {
                console.log("getting bitcoin address...")
                const bitcoinAddressPromise = deposit.getBitcoinAddress()
                bitcoinAddress = await promiseTimeout(2*millisec, bitcoinAddressPromise) // timeout 2sec
                if (bitcoinAddress === false) {
                    const bitcoinAddressTimeoutMsg = "bitcoin address retrieval timed out..."
                    console.log(bitcoinAddressTimeoutMsg)
                    bitcoinAddress = await buildTimeoutCell(bitcoinAddressTimeoutMsg)
                }
            } catch(error) {
                htmlContent += await buildError(depositAddress, state, error, keepAddress)
                continue;
            }

            try {
                console.log("getting signer fee TBTC...")
                const signerFeePromise = deposit.getSignerFeeTBTC()
                signerFee = await promiseTimeout(1*millisec, signerFeePromise) // timeout 1sec
                if (signerFee === false) {
                    const signerFeeTimeoutMsg = "signer fee retrieval timed out..."
                    console.log(signerFeeTimeoutMsg)
                    signerFee = await buildTimeoutCell(signerFeeTimeoutMsg)
                }
            } catch(error) {
                htmlContent += await buildError(depositAddress, state, error, keepAddress)
                continue;
            }

            try {
                console.log("getting redemption cost..")
                const redemptionCostPromise = await deposit.getRedemptionCost()
                redemptionCost = await promiseTimeout(2*millisec, redemptionCostPromise) // timeout 2sec
                if (redemptionCost === false) {
                    const redemptionCostTimeoutMsg = "redemption cost retrieval timed out..."
                    console.log(redemptionCostTimeoutMsg)
                    redemptionCost = await buildTimeoutCell(redemptionCostTimeoutMsg)
                }
            } catch(error) {
                htmlContent += await buildError(depositAddress, state, error, keepAddress)
                continue;
            }

            try {
                console.log("getting balance of deposit...")
                const tbtcAccountBalancePromise = tbtc.Deposit.tokenContract.methods.balanceOf(depositAddress).call()
                tbtcAccountBalance = await promiseTimeout(1*millisec, tbtcAccountBalancePromise) // timeout 1sec
                if (tbtcAccountBalance === false) {
                    const tbtcAccountBalanceTimeoutMsg = "tbtc account balance retrieval timed out..."
                    console.log(tbtcAccountBalanceTimeoutMsg)
                    tbtcAccountBalance = await buildTimeoutCell(tbtcAccountBalanceTimeoutMsg)
                }
            } catch(error) {
                htmlContent += await buildError(depositAddress, state, error, keepAddress)
                continue;
            }

            try {
                console.log("getting bond amount...")
                const keepBondAmountPromise = deposit.keepContract.methods.checkBondAmount().call()
                keepBondAmount = await promiseTimeout(1*millisec, keepBondAmountPromise) // timeout 1sec
                if (tbtcAccountBalance === false) {
                    const bondAmountTimeoutMsg = "bond amount retrieval timed out..."
                    console.log(bondAmountTimeoutMsg)
                    keepBondAmount = await buildTimeoutCell(bondAmountTimeoutMsg)
                }
            } catch(error) {
                htmlContent += await buildError(depositAddress, state, error, keepAddress)
                continue;
            }

            
            htmlContent += 
            `
            <tr>
                <td>` + bitcoinAddress + `</td>
                <td>` + createdDepositBlockNumber + `</td>
                <td>` + state + `</td>
                <td>` + signerFee + `</td>
                <td>` + redemptionCost + `</td>
                <td>` + tbtcAccountBalance + `</td>
                <td>` + keepAddress + `</td>
                <td>` + keepBondAmount + `</td>
            </tr>
            `
            
            console.log("bitcoin address: ", bitcoinAddress)
            console.log("createdDepositBlockNumber: ", createdDepositBlockNumber)
            console.log("current state: ", state)
            console.log("signerFee: ", signerFee.toString())
            console.log("redemptionCost: ", redemptionCost.toString())
            console.log("tbtcAccountBalance: ", tbtcAccountBalance.toString())
            console.log("keepAddress: ", keepAddress)
            console.log("keepBondAmount: ", keepBondAmount.toString())
        }
    }

    fs.writeFileSync('./site/index.html', await buildHtml(htmlContent));
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

async function buildError(depositAddress, currentState, error, keepAddress) {
    const html = 
    `
    <tr bgcolor="red">
        <td colspan="2">` + "depositAddress: " + depositAddress + `</td>
        <td>` + currentState + `</td>
        <td colspan="3">` + error + `</td>
        <td>` + keepAddress + `</td>
        <td></td>
    </tr>
    `

    return html
}

async function buildTimeout(depositAddress, currentState, msg, keepAddress) {
    const html = 
    `
    <tr bgcolor="#ff8000">
        <td colspan="2">` + "depositAddress: " + depositAddress + `</td>
        <td>` + currentState + `</td>
        <td colspan="3">` + msg + `</td>
        <td>` + keepAddress + `</td>
        <td></td>
    </tr>
    `

    return html
}

async function buildTimeoutCell(msg) {
    return `<div style="background-color:#ff8000">` + msg + `</div>`
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