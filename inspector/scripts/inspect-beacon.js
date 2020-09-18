const truffleContract = require("@truffle/contract")
const KeepRandomBeaconOperatorJson = require("@keep-network/keep-core/artifacts/KeepRandomBeaconOperator.json")

module.exports = async function() {
    const deploymentBlock = 10834116

    try {
        const KeepRandomBeaconOperator = truffleContract(KeepRandomBeaconOperatorJson)
        KeepRandomBeaconOperator.setProvider(web3.currentProvider)

        const keepRandomBeaconOperator = await KeepRandomBeaconOperator.deployed()

        const numberOfGroups = await keepRandomBeaconOperator.numberOfGroups()
        const entryRequestedEvents = await keepRandomBeaconOperator.getPastEvents(
            "RelayEntryRequested",
            {
                fromBlock: deploymentBlock,
                toBlock: "latest",
            }
        )
        const entrySubmittedEvents = await keepRandomBeaconOperator.getPastEvents(
            "RelayEntrySubmitted",
            {
                fromBlock: deploymentBlock,
                toBlock: "latest",
            }
        )
        const timeoutEvents = await keepRandomBeaconOperator.getPastEvents(
            "RelayEntryTimeoutReported",
            {
                fromBlock: deploymentBlock,
                toBlock: "latest",
            }
        )

        console.log(`Number of groups:            ${numberOfGroups}`)
        console.log(`Relay entries requested:     ${entryRequestedEvents.length}`)
        console.log(`Relay entries submitted:     ${entrySubmittedEvents.length}`)
        console.log(`Number of timed-out entries: ${timeoutEvents.length}`)
        if (timeoutEvents.length > 0) {
            console.log(`timed out entry group indices: ${timeoutEvents.map(event => event.returnValues.groupIndex)}`)
        }
        console.log(``)

        const dkgSubmittedEvents = (await keepRandomBeaconOperator.getPastEvents(
            "DkgResultSubmittedEvent",
            {
                fromBlock: deploymentBlock,
                toBlock: "latest",
            }
        ))

        const allOperators = new Set()

        for (i = 0; i < numberOfGroups; i++) {
            const groupPubKey = await keepRandomBeaconOperator.getGroupPublicKey(i)
            const groupMembers = await keepRandomBeaconOperator.getGroupMembers(groupPubKey)

            const uniqueMembers = new Set()
            groupMembers.forEach((member) => {
                uniqueMembers.add(member)
                allOperators.add(member)
            })

            const dkgSubmittedEvent = dkgSubmittedEvents.find((event) => {
                return event.returnValues.groupPubKey == groupPubKey
            })

            const {memberIndex, misbehaved} = dkgSubmittedEvent.returnValues
        
            console.log(`Group ${groupPubKey}:`)
            console.log(` - has index ${i}`)
            console.log(` - has ${groupMembers.length} members`)
            console.log(` - its DKG result was submitted by member ${memberIndex}`)
            console.log(` - misbehaved members bytes: ${misbehaved}`)    
            console.log(` - has ${uniqueMembers.size} unique members`)    
            console.log(``)    
        }

        console.log(`There are ${allOperators.size} unique operators in all groups`)

        process.exit()
    } catch (error) {
      console.log(error)
      process.exit()
    }
}