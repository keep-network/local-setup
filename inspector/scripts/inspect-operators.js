const truffleContract = require("@truffle/contract")
const clc = require("cli-color")

const contractHelper = require("./lib/contract-helper")

const KeepTokenJson = require("@keep-network/keep-core/artifacts/KeepToken.json")
const TokenStakingJson = require("@keep-network/keep-core/artifacts/TokenStaking.json")
const KeepBondingJson = require("@keep-network/keep-ecdsa/artifacts/KeepBonding.json")
const KeepRandomBeaconOperatorJson = require("@keep-network/keep-core/artifacts/KeepRandomBeaconOperator.json")
const BondedECDSAKeepFactoryJson = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeepFactory.json")
const TBTCSystemJson = require("@keep-network/tbtc/artifacts/TBTCSystem.json")

const tokenDecimalMultiplier = web3.utils.toBN(10).pow(web3.utils.toBN(18))

module.exports = async function () {
  try {
    // beacon-nodes.json and ecdsa-nodes.json should contain information about
    // nodes available in the network in the format returned by /diagnostics
    // endpoint of keep client, preferably bootstrap node
    const beaconNodes = require("../input-data/beacon-nodes.json")
    const ecdsaNodes = require("../input-data/ecdsa-nodes.json")

    const KeepToken = truffleContract(KeepTokenJson)
    const TokenStaking = truffleContract(TokenStakingJson)
    const KeepBonding = truffleContract(KeepBondingJson)
    const KeepRandomBeaconOperator = truffleContract(
      KeepRandomBeaconOperatorJson,
    )
    const BondedECDSAKeepFactory = truffleContract(BondedECDSAKeepFactoryJson)
    const TBTCSystem = truffleContract(TBTCSystemJson)

    KeepToken.setProvider(web3.currentProvider)
    TokenStaking.setProvider(web3.currentProvider)
    KeepBonding.setProvider(web3.currentProvider)
    KeepRandomBeaconOperator.setProvider(web3.currentProvider)
    BondedECDSAKeepFactory.setProvider(web3.currentProvider)
    TBTCSystem.setProvider(web3.currentProvider)

    const keepToken = await KeepToken.deployed()
    const tokenStaking = await TokenStaking.deployed()
    const keepRandomBeaconOperator = await KeepRandomBeaconOperator.deployed()
    const bondedEcdsaKeepFactory = await BondedECDSAKeepFactory.deployed()
    const keepBonding = await KeepBonding.deployed()
    const tbtcSystem = await TBTCSystem.deployed()

    const deploymentBlock = await contractHelper.getDeploymentBlockNumber(
      KeepBondingJson,
      web3,
    )

    console.log(clc.yellow(`*** Contract Addresses ***`))
    console.log(`KeepToken:                ${keepToken.address}`)
    console.log(`TokenStaking:             ${tokenStaking.address}`)
    console.log(`KeepRandomBeaconOperator: ${keepRandomBeaconOperator.address}`)
    console.log(`BondedECDSAKeepFactory:   ${bondedEcdsaKeepFactory.address}`)
    console.log(`KeepBonding:              ${keepBonding.address}`)
    console.log(`TBTCSystem:               ${tbtcSystem.address}`)
    console.log(``)

    const beaconOperators = beaconNodes.connected_peers.map(
      (peer) => peer.ethereum_address,
    )
    console.log(
      clc.italic(
        `Fetching staking info for [${beaconOperators.length}] beacon operators...`,
      ),
    )
    console.log(``)

    const beaconSummary = []
    for (let i = 0; i < beaconOperators.length; i++) {
      const operator = beaconOperators[i]

      const eligibleStake = await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperator.address,
      )
      const eligibleStakeKeep = eligibleStake.div(tokenDecimalMultiplier)

      const operatorBalance = await web3.eth.getBalance(operator)
      const operatorBalanceEth = web3.utils.fromWei(operatorBalance)

      beaconSummary.push({
        address: operator,
        eligibleStakeKeep: eligibleStakeKeep.toString(),
        operatorBalanceEth: operatorBalanceEth.toString(),
      })
    }

    console.log(clc.yellow(`*** Beacon Operators ***`))
    if (process.env.OUTPUT_MODE === "text") {
      beaconSummary.forEach((s) =>
        console.log(
          `${s.address}    ${s.eligibleStakeKeep}    ${s.operatorBalanceEth}`,
        ),
      )
    } else {
      console.table(beaconSummary)
    }
    console.log(``)

    const ecdsaOperators = ecdsaNodes.connected_peers.map(
      (peer) => peer.ethereum_address,
    )
    console.log(
      clc.italic(
        `Fetching staking info for [${ecdsaOperators.length}] ECDSA operators...`,
      ),
    )
    console.log(``)

    const bondCreatedEvents = await keepBonding.getPastEvents("BondCreated", {
      fromBlock: deploymentBlock,
      toBlock: "latest",
    })

    const totalOperatorBondsAmount = {}
    const totalBondedAmount = web3.utils.toBN(0)

    for (let i = 0; i < bondCreatedEvents.length; i++) {
      const event = bondCreatedEvents[i]

      const operator = event.args.operator.toLowerCase()
      const bondAmount = web3.utils.toBN(event.args.amount)

      totalBondedAmount.iadd(bondAmount)

      if (totalOperatorBondsAmount[operator] === undefined) {
        totalOperatorBondsAmount[operator] = bondAmount
      } else {
        totalOperatorBondsAmount[operator].iadd(bondAmount)
      }
    }

    console.log(
      `Total bonded ETH: ${web3.utils.fromWei(totalBondedAmount).toString()}`,
    )

    const ecdsaSummary = []
    for (let i = 0; i < ecdsaOperators.length; i++) {
      const operator = ecdsaOperators[i].toLowerCase()

      const eligibleStake = await tokenStaking.eligibleStake(
        operator,
        keepRandomBeaconOperator.address,
      )
      const eligibleStakeKeep = eligibleStake.div(tokenDecimalMultiplier)

      const operatorBalance = await web3.eth.getBalance(operator)
      const operatorBalanceEth = web3.utils.fromWei(operatorBalance)

      const unbondedValue = await keepBonding.unbondedValue(operator)
      const unbondedValueEth = web3.utils.fromWei(unbondedValue)

      const isRegisteredInTbtcPool = await bondedEcdsaKeepFactory.isOperatorRegistered(
        operator,
        tbtcSystem.address,
      )

      let isUpToDateInTbtcPool
      if (isRegisteredInTbtcPool) {
        isUpToDateInTbtcPool = await bondedEcdsaKeepFactory.isOperatorUpToDate(
          operator,
          tbtcSystem.address,
        )
      } else {
        isUpToDateInTbtcPool = "N/A"
      }

      const bondsAmountEth = web3.utils.fromWei(
        web3.utils.toBN(totalOperatorBondsAmount[operator] || 0),
      )

      ecdsaSummary.push({
        address: operator,
        eligibleStakeKeep: eligibleStakeKeep.toString(),
        operatorBalanceEth: operatorBalanceEth.toString(),
        unbondedValueEth: unbondedValueEth.toString(),
        bondsAmountEth: bondsAmountEth.toString(),
        isRegisteredInTbtcPool: isRegisteredInTbtcPool,
        isUpToDateInTbtcPool: isUpToDateInTbtcPool,
      })
    }

    console.log(clc.yellow(`*** ECDSA Operators ***`))

    if (process.env.OUTPUT_MODE === "text") {
      ecdsaSummary.forEach((s) =>
        console.log(
          `${s.address}    ${s.eligibleStakeKeep}    ${s.operatorBalanceEth}    ` +
            `${s.unbondedValueEth}    ${s.isRegisteredInTbtcPool}    ${s.isUpToDateInTbtcPool}`,
        ),
      )
    } else {
      console.table(ecdsaSummary)
    }

    console.log(``)

    process.exit(0)
  } catch (error) {
    console.log(`ERROR: ${error}`)
    process.exit(1)
  }
}
