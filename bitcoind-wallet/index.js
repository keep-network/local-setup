import BitcoinRpc from "bitcoind-rpc"
import Bluebird from "bluebird"
import config from "../configs/bitcoin/config.json"

const bitcoinRpc = new BitcoinRpc(config)
Bluebird.promisifyAll(bitcoinRpc)

export async function sendToAddress(address, btc) {
  return bitcoinRpc.sendtoaddressAsync(address, btc)
}

export async function getNewAddress() {
  const address = (await bitcoinRpc.getnewaddressAsync()).result
  console.log(address)
  return address
}
