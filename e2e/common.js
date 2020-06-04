
export const getTbtcAccountBalance = async (web3, tbtc, account) => {
    const  balance = await tbtc.Deposit.tokenContract.methods
        .balanceOf(account).call();

    return web3.utils.toBN(balance)
}