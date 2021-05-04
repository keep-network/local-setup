const { mkdirSync, copyFileSync } = require("fs")
const { resolve, dirname } = require("path")
const { expect } = require("chai")

const { readExternalContractAddress } = require("../src/contracts.js")

describe("Contracts", function () {
  describe("readExternalContractAddress", function () {
    const packageName = "@keep-network/test-project"
    const contractName = "TestContract"

    before(function () {
      const testFile = resolve(
        `./node_modules/${packageName}/artifacts/${contractName}.json`,
      )

      mkdirSync(dirname(testFile), { recursive: true })

      copyFileSync(resolve(`test/data/${contractName}.json`), testFile)
    })

    it("reads addresses from test file", async () => {
      expect(
        readExternalContractAddress(packageName, contractName, "1707"),
      ).to.equal("0xa90505c0EC23F776631557143ABF3ff5602D0947")

      expect(
        readExternalContractAddress(packageName, contractName, "2"),
      ).to.equal("0xEDDD3D1737021e3B716FE88433c1382D9eBCEF76")
    })

    it("reads network id from deployer object", async () => {
      expect(
        readExternalContractAddress(packageName, contractName, {
          network_id: "1707",
        }),
      ).to.equal("0xa90505c0EC23F776631557143ABF3ff5602D0947")
    })

    it("throws an error if address is missing", async () => {
      expect(() =>
        readExternalContractAddress(packageName, contractName, "13"),
      ).to.throw(Error, "missing address for network 13 in TestContract")
    })

    it("throws an error if network is missing", async () => {
      expect(() =>
        readExternalContractAddress(packageName, contractName, "777"),
      ).to.throw(
        Error,
        "configuration for network 777 not found in TestContract",
      )
    })

    it("throws an error if contract artifact is missing", async () => {
      expect(() =>
        readExternalContractAddress(packageName, "MissingContract", "1"),
      ).to.throw(
        Error,
        "failed to read artifact file: ENOENT: no such file or directory",
      )
    })
  })
})
