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

    getDepositedAmount = async function () {
      bondSeizedEventSignature = web3.utils.sha3(
        "BondSeized(address,uint256,address,uint256)",
      )

      const operatorsDepositedAmount = {}
      const totalDepositedAmount = web3.utils.toBN(0)

      const events = await keepBonding.getPastEvents("UnbondedValueDeposited", {
        fromBlock: deploymentBlock,
      })

      eventsLoop: for (let i = 0; i < events.length; i++) {
        const event = events[i]

        const operator = event.args.operator.toLowerCase()
        const amount = web3.utils.toBN(event.args.amount || 0)

        // Part of seized bond amount is being returned by tBTC as a unbonded
        // value deposit. We want to check if the deposited value came from
        // a returned seized amount and if so don't include it in the
        // deposited amount.
        const transaction = await web3.eth.getTransactionReceipt(
          event.transactionHash,
        )

        for (let i = 0; i < transaction.logs.length; i++) {
          const log = transaction.logs[i]

          if (log.topics[0] === bondSeizedEventSignature) {
            continue eventsLoop
          }
        }

        if (operatorsDepositedAmount[operator] === undefined) {
          operatorsDepositedAmount[operator] = amount
        } else {
          operatorsDepositedAmount[operator].iadd(amount)
        }

        totalDepositedAmount.iadd(amount)
      }

      return {
        forOperators: operatorsDepositedAmount,
        total: totalDepositedAmount,
      }
    }

    getWithdrawnAmount = async function (eventName) {
      const operatorsWithdrawnAmount = {}
      const totalWithdrawnAmount = web3.utils.toBN(0)

      const events = await keepBonding.getPastEvents("UnbondedValueWithdrawn", {
        fromBlock: deploymentBlock,
      })

      for (let i = 0; i < events.length; i++) {
        const event = events[i]

        const operator = event.args.operator.toLowerCase()
        const amount = web3.utils.toBN(event.args.amount || 0)

        if (operatorsWithdrawnAmount[operator] === undefined) {
          operatorsWithdrawnAmount[operator] = amount
        } else {
          operatorsWithdrawnAmount[operator].iadd(amount)
        }

        totalWithdrawnAmount.iadd(amount)
      }

      return {
        forOperators: operatorsWithdrawnAmount,
        total: totalWithdrawnAmount,
      }
    }

    getBondedAmount = async function () {
      const operatorsBondedAmount = {}
      const totalBondedAmount = web3.utils.toBN(0)

      const events = await keepBonding.getPastEvents("BondCreated", {
        fromBlock: deploymentBlock,
      })

      for (let i = 0; i < events.length; i++) {
        const event = events[i]

        const operator = event.args.operator.toLowerCase()
        const bondAmount = web3.utils.toBN(event.args.amount || 0)
        const bondReferenceID = event.args.referenceID

        // Check if the bond has been released. If so don't include the bond in
        // the result and skip to a next event.
        const releasedEvents = await keepBonding.getPastEvents("BondReleased", {
          fromBlock: deploymentBlock,
          filter: {
            operator: operator,
            referenceID: bondReferenceID.toString(),
          },
        })
        if (releasedEvents.length > 0) {
          continue
        }

        // Check if the bond has been seized. If so subtract the seized amount from
        // the bonded amount.
        const seizedEvents = await keepBonding.getPastEvents("BondSeized", {
          fromBlock: deploymentBlock,
          filter: {
            operator: operator,
            referenceID: bondReferenceID.toString(),
          },
        })

        for (let i = 0; i < seizedEvents.length; i++) {
          const seizedEvent = seizedEvents[i]
          const seizedAmount = seizedEvent.args.amount
          bondAmount.isub(seizedAmount)
        }

        if (operatorsBondedAmount[operator] === undefined) {
          operatorsBondedAmount[operator] = bondAmount
        } else {
          operatorsBondedAmount[operator].iadd(bondAmount)
        }

        totalBondedAmount.iadd(bondAmount)
      }

      return { forOperators: operatorsBondedAmount, total: totalBondedAmount }
    }

    getSeizedAmount = async function () {
      depositedEventSignature = web3.utils.sha3(
        "UnbondedValueDeposited(address,address,uint256)",
      )

      const operatorsSeizedAmount = {}
      const totalSeizedAmount = web3.utils.toBN(0)

      const events = await keepBonding.getPastEvents("BondSeized", {
        fromBlock: deploymentBlock,
      })

      eventsLoop: for (let i = 0; i < events.length; i++) {
        const event = events[i]
        const operator = event.args.operator.toLowerCase()
        const grossSeizedAmount = web3.utils.toBN(event.args.amount || 0)

        // Part of seized bond amount is being returned by tBTC as a unbonded
        // value deposit. We want to find the value that got returned so we can
        // find actual seized amount (net seized amount).
        const transaction = await web3.eth.getTransactionReceipt(
          event.transactionHash,
        )

        // Check other events emitted in the same transaction that bond has been
        // seized.
        for (let i = 0; i < transaction.logs.length; i++) {
          const log = transaction.logs[i]

          encodedOperator = web3.eth.abi.encodeParameter("address", operator)

          if (
            log.topics[0] === depositedEventSignature &&
            log.topics[1] === encodedOperator
          ) {
            const returnedAmount = web3.utils.toBN(log.data)

            const netSeizedAmount = grossSeizedAmount.sub(returnedAmount)

            if (operatorsSeizedAmount[operator] === undefined) {
              operatorsSeizedAmount[operator] = netSeizedAmount
            } else {
              operatorsSeizedAmount[operator].iadd(netSeizedAmount)
            }

            totalSeizedAmount.iadd(netSeizedAmount)
          }
        }
      }

      return { forOperators: operatorsSeizedAmount, total: totalSeizedAmount }
    }

    // Operators' Deposited Amount
    const depositedAmounts = await getDepositedAmount()

    // Operators' Withdrawn Amount
    const withdrawnAmounts = await getWithdrawnAmount()

    // Operators' Currently Bonded Amount
    const bondedAmounts = await getBondedAmount()

    // Operators' Seized Bonds Amount
    const bondsSeizedAmounts = await getSeizedAmount()

    // Total Values
    console.log(
      `Total Deposited Amount ETH:        ` +
        `${web3.utils.fromWei(depositedAmounts.total).toString()}`,
    )

    console.log(
      `Total Withdrawn Amount ETH:        ` +
        `${web3.utils.fromWei(withdrawnAmounts.total).toString()}`,
    )

    console.log(
      `Total Currently Bonded Amount ETH: ` +
        `${web3.utils.fromWei(bondedAmounts.total).toString()}`,
    )

    console.log(
      `Total Seized Bonds ETH:            ` +
        `${web3.utils.fromWei(bondsSeizedAmounts.total).toString()}`,
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

      const depositedAmount = web3.utils.toBN(
        depositedAmounts.forOperators[operator] || 0,
      )
      const depositedAmountEth = web3.utils.fromWei(depositedAmount)

      const withdrawnAmount = web3.utils.toBN(
        withdrawnAmounts.forOperators[operator] || 0,
      )
      const withdrawnAmountEth = web3.utils.fromWei(withdrawnAmount)

      const bondedAmount = web3.utils.toBN(
        bondedAmounts.forOperators[operator] || 0,
      )
      const bondedAmountEth = web3.utils.fromWei(bondedAmount)

      const bondsSeizedAmount = web3.utils.toBN(
        bondsSeizedAmounts.forOperators[operator] || 0,
      )
      const bondsSeizedAmountEth = web3.utils.fromWei(bondsSeizedAmount)

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

      ecdsaSummary.push({
        address: operator,
        eligibleStakeKeep: eligibleStakeKeep.toString(),
        operatorBalanceEth: operatorBalanceEth.toString(),
        depositedAmountEth: depositedAmountEth.toString(),
        withdrawnAmountEth: withdrawnAmountEth.toString(),
        unbondedValueEth: unbondedValueEth.toString(),
        bondsAmountEth: bondedAmountEth.toString(),
        seizedAmountEth: bondsSeizedAmountEth.toString(),
        isRegisteredInTbtcPool: isRegisteredInTbtcPool,
        isUpToDateInTbtcPool: isUpToDateInTbtcPool,
      })
    }

    console.log(clc.yellow(`*** ECDSA Operators ***`))

    if (process.env.OUTPUT_MODE === "text") {
      ecdsaSummary.forEach((s) =>
        console.log(
          `${s.address}    ${s.eligibleStakeKeep}    ${s.operatorBalanceEth}    ` +
            `${s.depositedAmountEth}    ${s.withdrawnAmountEth}    ${s.unbondedValueEth}    ` +
            `${s.bondsAmountEth}    ${s.seizedAmountEth}    ${s.isRegisteredInTbtcPool}    ` +
            `${s.isUpToDateInTbtcPool}`,
        ),
      )
    } else {
      console.table(ecdsaSummary)
    }

    console.log(``)

    process.exit(0)
  } catch (error) {
    console.trace(error)
    process.exit(1)
  }
}
