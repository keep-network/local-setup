const PASSWORD = "password";
const UNLOCK_DURATION = 600;

function newAccount(web3) {
  return new Promise((resolve, reject) => {
    web3.eth.personal.newAccount(PASSWORD, (error, accounts) => {
      resolve(accounts);
    });
  });
}

async function newFundedAccount(web3) {
  const accounts = await getAccounts(web3);
  const owner = accounts[0];

  const account = await newAccount(web3);

  await web3.eth.personal.unlockAccount(account, PASSWORD, UNLOCK_DURATION);

  await web3.eth.sendTransaction({
    from: owner,
    to: account,
    value: web3.utils.toWei("1"),
  });

  return account;
}

function getAccounts(web3) {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      resolve(accounts);
    });
  });
}

module.exports = {
  newAccount,
  newFundedAccount,
  getAccounts,
};
