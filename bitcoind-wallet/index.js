import BitcoinRpc from "bitcoind-rpc"
import Bluebird from "bluebird"
import config from "../configs/bitcoin/config.json"

const bitcoinRpc = new BitcoinRpc(config)
Bluebird.promisifyAll(bitcoinRpc)

export async function sendToAddress(address, btc) {
  return bitcoinRpc.sendtoaddressAsync(address, btc)
}

/**
 * Returns a new Bitcoin address for receiving payments.
 * @param {string} [addressType=bech32] The address type to use. Options are:
 * legacy, p2sh-segwit, and bech32.
 * @returns {string} Address.
 */
export async function getNewAddress(addressType = "bech32") {
  const address = (await bitcoinRpc.getnewaddressAsync("", addressType)).result
  console.log(address)
  return address
}

export async function sendRawTransaction(transaction) {
	return bitcoinRpc.sendrawtransactionAsync(transaction)
}

export async function getBalance(address) {
	await bitcoinRpc.importaddressAsync(address)
	const balance = (await bitcoinRpc.getreceivedbyaddressAsync(address, 0)).result
	console.log(balance)
	return balance
}
