const web3 = require("web3");

const BN = web3.utils.BN;

const bnChain = require("bn-chai")(BN);
const chai = require("chai").use(bnChain);
const expect = chai.expect;

function formatAmount(amount, decimals) {
  return web3.utils
    .toBN(amount)
    .mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
}

function getAccounts(web3) {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      resolve(accounts);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  BN,
  expect,
  formatAmount,
  getAccounts,
  sleep,
};
