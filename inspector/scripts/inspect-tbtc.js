const DepositJson = require("@keep-network/tbtc/artifacts/Deposit.json")
const DepositFactoryJson = require("@keep-network/tbtc/artifacts/DepositFactory.json")

const truffleContract = require("@truffle/contract")
const contractHelper = require("./lib/contract-helper")

module.exports = async function () {
  try {
    const factoryDeploymentBlock = await contractHelper.getDeploymentBlockNumber(
      DepositFactoryJson,
      web3,
    )

    const DepositFactory = truffleContract(DepositFactoryJson)
    DepositFactory.setProvider(web3.currentProvider)
    const Deposit = truffleContract(DepositJson)
    Deposit.setProvider(web3.currentProvider)

    const factory = await DepositFactory.deployed()

    const depositCreatedEvents = await factory.getPastEvents(
      "DepositCloneCreated",
      {
        fromBlock: factoryDeploymentBlock,
        toBlock: "latest",
      },
    )

    console.log(`Number of created deposits: ${depositCreatedEvents.length} \n`)

    const depositAddresses = []
    depositCreatedEvents.forEach((event) =>
      depositAddresses.push(event.args.depositCloneAddress),
    )

    for (i = 0; i < depositAddresses.length; i++) {
      const deposit = await Deposit.at(depositAddresses[i])
      const state = await deposit.currentState()
      let stateString = ""
      switch (state.toString()) {
        case "0":
          stateString = "START"
          break
        case "1":
          stateString = "AWAITING_SIGNER_SETUP"
          break
        case "2":
          stateString = "AWAITING_BTC_FUNDING_PROOF"
          break
        case "3":
          stateString = "FAILED_SETUP"
          break
        case "4":
          stateString = "ACTIVE"
          break
        case "5":
          stateString = "AWAITING_WITHDRAWAL_SIGNATURE"
          break
        case "6":
          stateString = "AWAITING_WITHDRAWAL_PROOF"
          break
        case "7":
          stateString = "REDEEMED"
          break
        case "8":
          stateString = "COURTESY_CALL"
          break
        case "9":
          stateString = "FRAUD_LIQUIDATION_IN_PROGRESS"
          break
        case "10":
          stateString = "LIQUIDATION_IN_PROGRESS"
          break
        case "11":
          stateString = "LIQUIDATED"
          break
        default:
          stateString = "<< UNKNOWN >>"
          break
      }
      const keepAddress = await deposit.keepAddress()
      const lotSizeSatoshis = await deposit.lotSizeSatoshis()
      const lotSizeTbtc = await deposit.lotSizeTbtc()

      console.log(`deposit address: ${depositAddresses[i]}`)
      console.log(`deposit index:   ${i}`)
      console.log(`deposit state:   ${stateString}`)
      console.log(`keep address:    ${keepAddress}`)
      console.log(`lot size [sat]:  ${lotSizeSatoshis}`)
      console.log(`lot size [tbtc]: ${lotSizeTbtc}`)

      console.log(``)
    }

    process.exit()
  } catch (error) {
    console.log(error)
    process.exit()
  }
}
