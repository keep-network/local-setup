#!/usr/bin/env node --experimental-modules

import { createRequire } from "module"
import { sendToAddress, getNewAddress } from "./../index.js"

const meow = createRequire(import.meta.url)("meow")

const cli = meow(`
  Usage
    $ bitcoind-wallet <command> <arg...>

  Commands
    sendToAddress     [address] [btc] Send btc to an address
    getNewAddress     Get an address to receive btc
`)

const [cmd, ...args] = cli.input

if (cmd === 'sendToAddress') {
  sendToAddress(...args)
} else if (cmd === 'getNewAddress') {
  getNewAddress()
} else if (cmd) {
  console.error('Unknown command')
  process.exit(1)
} else {
  cli.showHelp(2)
}
