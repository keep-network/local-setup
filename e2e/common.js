import Web3 from "web3"

export const getTBTCTokenBalance = async (tbtc, account) => {
  const balance = await tbtc.Deposit.tokenContract.methods
    .balanceOf(account)
    .call()

  return Web3.utils.toBN(balance)
}

export const getBtcBalance = async (BitcoinHelpers, address) => {
  const balance = await BitcoinHelpers.Transaction.getBalance(address)

  return Web3.utils.toBN(balance)
}

export const importBitcoinPrivateKey = async (
  bcoin,
  wif,
  wallet,
  privateKey
) => {
  const decodedPrivateKey = wif.decode(privateKey)

  const keyRing = new bcoin.KeyRing({
    witness: true,
    privateKey: decodedPrivateKey.privateKey,
    compressed: decodedPrivateKey.compressed,
  })

  await wallet.importKey(0, keyRing)

  return keyRing
}

export const generateBitcoinPrivateKey = async (bcoin, wallet) => {
  const keyRing = bcoin.KeyRing.generate(true)
  keyRing.witness = true

  await wallet.importKey(0, keyRing)

  return keyRing
}

export const sendBitcoinTransaction = async (
  bcoin,
  BitcoinHelpers,
  targetAddress,
  amount,
  keyRing,
  subtractFee = false
) => {
  const sourceAddress = keyRing.getAddress("string")

  const sourceAddressBalance = await BitcoinHelpers.Transaction.getBalance(
    sourceAddress
  )

  console.log(
    `Sending transaction from ${sourceAddress} to ${targetAddress}\n` +
      `BTC balance of source address is ${sourceAddressBalance}`
  )

  const utxos = await BitcoinHelpers.Transaction.findAllUnspent(sourceAddress)

  const coins = []
  let coinsAmount = 0

  // Start from the oldest UTXO.
  for (const utxo of utxos.reverse()) {
    // Make sure the selected coins amount covers the 120% of the amount.
    // The additional 20% is taken as a big reserve to make sure that input
    // coins will cover the transaction fee.
    if (coinsAmount >= 1.2 * amount.toNumber()) {
      break
    }

    const tx = await BitcoinHelpers.withElectrumClient(
      async (electrumClient) => {
        return electrumClient.getTransaction(utxo.transactionID)
      }
    )

    coins.push(
      bcoin.Coin.fromTX(
        bcoin.MTX.fromRaw(tx.hex, "hex"),
        utxo.outputPosition,
        -1
      )
    )

    coinsAmount += utxo.value
  }

  const transaction = new bcoin.MTX()

  transaction.addOutput({
    script: bcoin.Script.fromAddress(targetAddress),
    value: amount.toNumber(),
  })

  await transaction.fund(coins, {
    rate: null, // set null explicitly to always use the default value
    changeAddress: sourceAddress,
    subtractFee: subtractFee,
  })

  transaction.sign(keyRing)

  const broadcastOutcome = await BitcoinHelpers.Transaction.broadcast(
    transaction.toRaw().toString("hex")
  )

  console.log(`Transaction ${broadcastOutcome.transactionID} sent`)
}

export const returnBitcoinToDepositor = async (
  bcoin,
  BitcoinHelpers,
  depositorKeyRing,
  redeemerKeyRing
) => {
  const redeemerBalance = await getBtcBalance(
    BitcoinHelpers,
    redeemerKeyRing.getAddress("string")
  )

  const depositorAddress = depositorKeyRing.getAddress("string")

  console.log(
    `Returning ${redeemerBalance} satoshis to depositor ${depositorAddress}`
  )

  await sendBitcoinTransaction(
    bcoin,
    BitcoinHelpers,
    depositorAddress,
    redeemerBalance,
    redeemerKeyRing,
    true
  )
}

export const promiseTimeout = function (ms, promise) {
  let timeout = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id)
      resolve(false)
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout])
}
