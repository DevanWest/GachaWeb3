require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const PRIVATE_KEY     = process.env.PRIVATE_KEY      || "";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },

  defaultNetwork: "hardhat",

  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url:    "http://127.0.0.1:8545",
      chainId: 31337,
    },
    goerli: {
      url: process.env.ALCHEMY_API_KEY
        ? `https://eth‐goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`
        : "",
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : []
    }
  }
};
