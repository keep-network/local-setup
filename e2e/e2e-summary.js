#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import BitcoinRpc from "bitcoind-rpc"
import Bluebird from "bluebird"
import config from "../configs/bitcoin/config.json"
import * as fs from 'fs' 

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
  
const blocksTimespan = 500

const bitcoinRpc = new BitcoinRpc(config)
Bluebird.promisifyAll(bitcoinRpc)


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

    // Set first account as the default account.
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]

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