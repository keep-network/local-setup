import {getTbtcAccountBalance, getReceivedBtcAmount} from "./common.js";

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
    const actualTbtcBalanceBn = await getTbtcAccountBalance(web3, tbtc, account)
    const expectedTbtcBalanceBn = web3.utils.toBN(expectedTbtcBalance)

    if (!actualTbtcBalanceBn.eq(expectedTbtcBalanceBn)) {
        throw new Error(
            `unexpected TBTC balance on account ${account}:
                actual:   ${actualTbtcBalanceBn}
                expected: ${expectedTbtcBalanceBn}`
        )
    }
}

export const assertReceivedBtcAmount = async (
    bitcoinRpc,
    address,
    expectedReceivedBtcAmount
) => {
    const actualReceivedBtcAmount = await getReceivedBtcAmount(bitcoinRpc, address)

    if (actualReceivedBtcAmount !== expectedReceivedBtcAmount) {
        throw new Error(
            `unexpected received BTC amount for address ${address}:
                actual:   ${actualReceivedBtcAmount}
                expected: ${expectedReceivedBtcAmount}`
        )
    }
}