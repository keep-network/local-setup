#!/usr/bin/env -S node --experimental-modules --experimental-json-modules

import { createRequire } from "module"
import { sendToAddress, getNewAddress, sendRawTransaction, getBalance } from "./../index.js"

const meow = createRequire(import.meta.url)("meow")

const cli = meow(`
  Usage
    $ bitcoind-wallet <command> <arg...>

  Commands
    sendToAddress         <address> <btc> Send btc to an address
    getNewAddress         [address_type] Get an address to receive btc
                            Values: legacy, p2sh-segwit, bech32 (default)
    sendRawTransaction    <transaction> Broadcast a raw transaction
    getBalance            <address> Get the balance of an address
`)

const [cmd, ...args] = cli.input

if (cmd === 'sendToAddress') {
  sendToAddress(...args)
} else if (cmd === 'getNewAddress') {
  getNewAddress(...args)
} else if (cmd === 'sendRawTransaction') {
  sendRawTransaction(...args)
} else if (cmd === 'getBalance') {
  getBalance(...args)
} else if (cmd) {
  console.error('Unknown command')
  process.exit(1)
} else {
  cli.showHelp(2)
}
