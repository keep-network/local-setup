const path = require("path");
const fs = require("fs");

const CONTRACT_DATA_PATH = path.resolve(__dirname, "contracts.json");

function readContractsData() {
  const dataDir = path.dirname(CONTRACT_DATA_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  if (!fs.existsSync(CONTRACT_DATA_PATH)) {
    const content = {};
    fs.writeFileSync(CONTRACT_DATA_PATH, JSON.stringify(content, null, 2));
    return content;
  }

  return require(CONTRACT_DATA_PATH);
}

function storeAddress(contractID, contractAddress) {
  const content = readContractsData();

  content[contractID] = { address: contractAddress };

  fs.writeFileSync(CONTRACT_DATA_PATH, JSON.stringify(content, null, 2));
}

function getAddress(contractID) {
  const content = readContractsData();
  return content[contractID].address;
}

module.exports = {
  getAddress,
  storeAddress,
};
