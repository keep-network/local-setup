
export const getTBTCTokenBalance = async (web3, tbtc, account) => {
    const balance = await tbtc.Deposit.tokenContract.methods
        .balanceOf(account).call();

    return web3.utils.toBN(balance)
}

export const getBtcBalance = async (web3, BitcoinHelpers, address) => {
    const balance = await BitcoinHelpers.Transaction.getBalance(address);

    return web3.utils.toBN(balance)
}