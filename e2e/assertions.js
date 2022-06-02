import { getBtcBalance } from "./common.js"
import Web3 from "web3"

export const assertMintedTbtcAmount = (tbtcAmount, expectedTbtcAmount) => {
  const actualTbtcAmountBn = Web3.utils.toBN(tbtcAmount)
  const expectedTbtcAmountBn = Web3.utils.toBN(expectedTbtcAmount)

  if (!actualTbtcAmountBn.eq(expectedTbtcAmountBn)) {
    throw new Error(
      `unexpected minted TBTC amount:
                actual:   ${actualTbtcAmountBn}
                expected: ${expectedTbtcAmountBn}`
    )
  }
}

export const assertTbtcAccountBalance = async (
  account,
  actualTbtcBalanceBn,
  expectedTbtcBalance
) => {
  const expectedTbtcBalanceBn = Web3.utils.toBN(expectedTbtcBalance)

  if (!actualTbtcBalanceBn.eq(expectedTbtcBalanceBn)) {
    throw new Error(
      `unexpected TBTC balance on account ${account}:
                actual:   ${actualTbtcBalanceBn}
                expected: ${expectedTbtcBalanceBn}`
    )
  }
}

export const assertBtcBalance = async (
  BitcoinHelpers,
  address,
  expectedBtcBalance
) => {
  const actualBtcBalanceBn = await getBtcBalance(BitcoinHelpers, address)
  const expectedBtcBalanceBn = Web3.utils.toBN(expectedBtcBalance)

  if (!actualBtcBalanceBn.eq(expectedBtcBalanceBn)) {
    throw new Error(
      `unexpected BTC balance for address ${address}:
                actual:   ${actualBtcBalanceBn}
                expected: ${expectedBtcBalanceBn}`
    )
  }
}
