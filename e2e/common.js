
export const getTBTCTokenBalance = async (web3, tbtc, account) => {
    const balance = await tbtc.Deposit.tokenContract.methods
        .balanceOf(account).call();

    return web3.utils.toBN(balance)
}

export const getReceivedBtcAmount = async (bitcoinRpc, address) => {
    const received = (await bitcoinRpc.listreceivedbyaddressAsync(1, false, true, address)).result

    let receivedBtcAmount = 0

    for (let i = 0; i < received.length; i++) {
        if (received[i].address === address) {
            receivedBtcAmount += received[i].amount
        }
    }

    return receivedBtcAmount
}