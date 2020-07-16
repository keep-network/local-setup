const BitcoinRpc = require('bitcoind-rpc')
const Bluebird = require('bluebird')
const config = require("../configs/bitcoin/config.json")

const bitcoinRpc = new BitcoinRpc(config)
Bluebird.promisifyAll(bitcoinRpc)

async function run() {
    try {
        const blockCount = (await bitcoinRpc.getblockcountAsync()).result

        const genesisBlock = blockCount - 5
        const genesisBlockHash = (await bitcoinRpc.getblockhashAsync(genesisBlock)).result
        const genesisBlockHeader = (await bitcoinRpc.getblockheaderAsync(genesisBlockHash, false)).result

        const epochStartBlock = genesisBlock - (genesisBlock % 2016)
        const epochStartBlockHash = (await bitcoinRpc.getblockhashAsync(epochStartBlock)).result
        const epochStartBlockHashReversed = changeEndianness(epochStartBlockHash)

        const result = {
            genesis: `0x${genesisBlockHeader}`,
            height: genesisBlock,
            epochStart: `0x${epochStartBlockHashReversed}`
        }

        console.log(JSON.stringify(result))
    } catch (e) {
        console.log(e)
    }
}

const changeEndianness = (string) => {
    const result = [];
    let len = string.length - 2;
    while (len >= 0) {
        result.push(string.substr(len, 2));
        len -= 2;
    }
    return result.join('');
}

run()