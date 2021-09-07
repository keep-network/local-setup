const BitcoinRpc = require("bitcoind-rpc")
const Bluebird = require("bluebird")
const config = require("../configs/bitcoin/config.json")

const MockRelay = artifacts.require("MockRelay.sol")

const bitcoinRpc = new BitcoinRpc(config)
Bluebird.promisifyAll(bitcoinRpc)

module.exports = async function () {
  try {
    const difficulty = new web3.utils.BN(
      (await bitcoinRpc.getdifficultyAsync()).result
    )

    console.log(`chain difficulty is ${difficulty}`)

    const mockRelay = await MockRelay.deployed()

    await mockRelay.setCurrentEpochDifficulty(difficulty)
    await mockRelay.setPrevEpochDifficulty(difficulty)
  } catch (e) {
    console.log(e)
  }
}
