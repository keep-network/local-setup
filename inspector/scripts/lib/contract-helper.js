const getDeploymentBlockNumber = async function(contractJSON, web3) {
    const networkId = Object.keys(contractJSON.networks)[0]
    const transactionHash = contractJSON.networks[networkId].transactionHash
    const transaction = await web3.eth.getTransaction(transactionHash)

    return transaction.blockNumber
}

module.exports = {
    getDeploymentBlockNumber: getDeploymentBlockNumber
}
