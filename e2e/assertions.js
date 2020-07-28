import {getTBTCTokenBalance, getBtcBalance} from "./common.js";

export const assertMintedTbtcAmount = (web3, deposit, expectedTbtcAmount) => {
    const actualTbtcAmountBn = web3.utils.toBN(deposit.tbtcAmount)
    const expectedTbtcAmountBn = web3.utils.toBN(expectedTbtcAmount)

    if (!actualTbtcAmountBn.eq(expectedTbtcAmountBn)) {
        throw new Error(
            `unexpected minted TBTC amount:
                actual:   ${actualTbtcAmountBn}
                expected: ${expectedTbtcAmountBn}`
        )
    }
}

export const assertTbtcAccountBalance = async (
    web3,
    tbtc,
    account,
    expectedTbtcBalance
) => {
    const actualTbtcBalanceBn = await getTBTCTokenBalance(web3, tbtc, account)
    const expectedTbtcBalanceBn = web3.utils.toBN(expectedTbtcBalance)

    if (!actualTbtcBalanceBn.eq(expectedTbtcBalanceBn)) {
        throw new Error(
            `unexpected TBTC balance on account ${account}:
                actual:   ${actualTbtcBalanceBn}
                expected: ${expectedTbtcBalanceBn}`
        )
    }
}

export const assertBtcBalance = async (
    web3,
    BitcoinHelpers,
    address,
    expectedBtcBalance
) => {
    const actualBtcBalanceBn = await getBtcBalance(web3, BitcoinHelpers, address)
    const expectedBtcBalanceBn = web3.utils.toBN(expectedBtcBalance)

    if (!actualBtcBalanceBn.eq(expectedBtcBalanceBn)) {
        throw new Error(
            `unexpected BTC balance for address ${address}:
                actual:   ${actualBtcBalanceBn}
                expected: ${expectedBtcBalanceBn}`
        )
    }
}