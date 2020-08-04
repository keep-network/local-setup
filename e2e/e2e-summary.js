#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {getTBTCTokenBalance} from "./common.js";
import program from "commander"

program 
    .option('--bitcoin-electrum-host <host>')
    .option('--bitcoin-electrum-port <port>', "electrum server port", (port) => parseInt(port, 10), 50003)
    .option('--bitcoin-network <network>')
    .option('--ethereum-node <url>')
    .option('--ethereum-pk <privateKey>')
    .parse(process.argv)

console.log("\nScript options values: ", program.opts(), "\n")

const states = {
    '0': 'START',
    '1': 'AWAITING_SIGNER_SETUP',
    '2': 'AWAITING_BTC_FUNDING_PROOF',
    '3': 'FAILED_SETUP',
    '4': 'ACTIVE',
    '5': 'AWAITING_WITHDRAWAL_SIGNATURE',
    '6': 'AWAITING_WITHDRAWAL_PROOF',
    '7': 'REDEEMED',
    '8': 'COURTESY_CALL',
    '9': 'FRAUD_LIQUIDATION_IN_PROGRESS',
    '10': 'LIQUIDATION_IN_PROGRESS',
    '11': 'LIQUIDATED',
  }
  
const blocksTimespan = 10000

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
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]
    
    const tbtc = await TBTC.withConfig({
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

    const initialTbtcAccountBalance = await getTBTCTokenBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount
    )

    console.log(
        `Initial TBTC balance for account ${web3.eth.defaultAccount} ` +
        `is: ${initialTbtcAccountBalance}`
    )

    let htmlContent = 
`
<!DOCTYPE html>
<html>
<body>

<table border="1">
    <thead>
    <tr>
        <th>Bitcoin address</th>
        <th>Satoshi Lot Size</th>
        <th>Current State</th>
        <th>Signer fee</th>
        <th>Redemption cost</th>
        <th>Tbtc account balance</th>
    </tr>
    </thead>
    <tbody>
`

    const currentBlockNumber = await web3.eth.getBlockNumber()
    // const fromBlock = 0
    const fromBlock = currentBlockNumber - blocksTimespan

    const createdDepositEvents = await tbtc.Deposit.systemContract.getPastEvents("Created", {fromBlock: fromBlock, toBlock: "latest"})

    const depositAddresses = createdDepositEvents.map(event => event.returnValues._depositContractAddress)

    for (const depositAddress of depositAddresses) {
        const deposit = await tbtc.Deposit.withAddress(depositAddress)

        const bitcoinAddress = await deposit.getBitcoinAddress()
        const satoshiLotSize = (await deposit.getSatoshiLotSize()).toString()
        const currentState = await deposit.getCurrentState()
        const signerFee = await deposit.getSignerFeeTBTC()
        const redemptionCost = await deposit.getRedemptionCost()
        const tbtcAccountBalance = await tbtc.Deposit.tokenContract.methods.balanceOf(depositAddress).call()

        htmlContent += 
        `
        <tr>
            <td>` + bitcoinAddress + `</td>
            <td>` + satoshiLotSize + `</td>
            <td>` + states[currentState] + `</td>
            <td>` + signerFee + `</td>
            <td>` + redemptionCost + `</td>
            <td>` + tbtcAccountBalance + `</td>
        </tr>
        `
        
        console.log("satoshi lot size: ", satoshiLotSize)
        console.log("bitcoin address: ", bitcoinAddress)
        console.log("current state: ", states[currentState])
        console.log("signerFee: ", signerFee.toString())
        console.log("redemptionCost: ", redemptionCost.toString())
        console.log("tbtcAccountBalance: ", tbtcAccountBalance.toString())
    }
    
    htmlContent += 
    `
    </tbody>
</table>

</body>
</html>
    `
    
    fs.writeFileSync('./site/index.html', htmlContent);
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