const truffleContract = require("@truffle/contract")

const BondedECDSAKeepFactoryJson = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeepFactory.json")
const BondedECDSAKeepJson = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeep.json")
const contractHelper = require("./lib/contract-helper")

module.exports = async function () {
  try {
    const BondedECDSAKeepFactory = truffleContract(BondedECDSAKeepFactoryJson)
    const BondedECDSAKeep = truffleContract(BondedECDSAKeepJson)
    BondedECDSAKeepFactory.setProvider(web3.currentProvider)
    BondedECDSAKeep.setProvider(web3.currentProvider)

    const factoryDeploymentBlock = await contractHelper.getDeploymentBlockNumber(
      BondedECDSAKeepFactoryJson,
      web3
    )

    const factory = await BondedECDSAKeepFactory.deployed()

    const keepCount = await factory.getKeepCount()
    console.log(`created keeps count: ${keepCount}`)

    const allOperators = new Set()
    const goodOperators = new Set()

    for (i = 0; i < keepCount; i++) {
      const keepAddress = await callWithRetry(() => factory.getKeepAtIndex(i))
      const keep = await BondedECDSAKeep.at(keepAddress)
      const keepPublicKey = await callWithRetry(() => keep.publicKey())
      const members = await callWithRetry(() => keep.getMembers())
      const isActive = await callWithRetry(() => keep.isActive())
      const bond = await callWithRetry(() => keep.checkBondAmount())

      const signatureRequestedEvents = await keep.getPastEvents(
        "SignatureRequested",
        {
          fromBlock: factoryDeploymentBlock,
          toBlock: "latest",
        }
      )

      console.log(`keep address:        ${keepAddress}`)
      console.log(`keep index:          ${i}`)
      console.log(`pubkey:              ${keepPublicKey}`)
      console.log(`members:             ${members}`)
      console.log(`isActive:            ${isActive}`)
      console.log(`bond [wei]:          ${bond}`)
      console.log(`bond [eth]:          ${web3.utils.fromWei(bond)}`)
      console.log(`bond [eth]:          ${web3.utils.fromWei(bond)}`)

      if (signatureRequestedEvents.length == 0) {
        console.log(`signature requested: no`)
      } else {
        console.log(
          `signature requested: yes, [${signatureRequestedEvents.length}] times`
        )

        const signatureSubmittedEvents = await keep.getPastEvents(
          "SignatureSubmitted",
          {
            fromBlock: factoryDeploymentBlock,
            toBlock: "latest",
          }
        )
        if (signatureRequestedEvents.length == 0) {
          console.log(`signature submitted: no`)
        } else {
          console.log(
            `signature submitted: yes, [${signatureSubmittedEvents.length}] times`
          )
        }
      }

      members.forEach((member) => allOperators.add(member))
      if (keepPublicKey) {
        members.forEach((member) => goodOperators.add(member))
      }

      console.log(``)
    }

    // if the operator is a member of at least one keep and that operator
    // is NOT a member of at least one keep which successfully generated
    // a public key, this operator is here
    let potentiallyBadOperators = new Set(allOperators)
    for (let goodOperator of goodOperators) {
      potentiallyBadOperators.delete(goodOperator)
    }
    console.log(
      `potentially bad operators = ${new Array(...potentiallyBadOperators).join(
        ", "
      )}`
    )

    process.exit()
  } catch (error) {
    console.log(error)
  }
}

async function callWithRetry(fn) {
  try {
    return await fn()
  } catch (error) {
    console.log(`Error ${error} occurred; retrying...`)
    return await fn()
  }
}
