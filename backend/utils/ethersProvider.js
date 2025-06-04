// backend/utils/ethersProvider.js

const { ethers } = require("ethers");
require("dotenv").config();

let provider;
let signer;

/**
 * Returns a JsonRpcProvider pointing at localhost:8545 (our Hardhat node).
 */
function getProvider() {
  if (!provider) {
    const rpcUrl = "http://127.0.0.1:8545";
    provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

/**
 * Returns a Wallet signer using the first Hardhat account.
 * Hardhat exposes ten accounts by default on localhost:8545, so we can simply:
 *   provider.getSigner(0)
 */
function getSigner() {
  if (!signer) {
    signer = getProvider().getSigner(0); // use Hardhat’s first account as “dummy”
  }
  return signer;
}

module.exports = {
  getProvider,
  getSigner,
};
