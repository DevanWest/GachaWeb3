// backend/controllers/chainlinkListener.js

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { getProvider } = require("../utils/ethersProvider");
const GachaAbi = require("../../artifacts/contracts/GachaGame.sol/GachaGame.json").abi;

const BITS_JSON_PATH = path.join(__dirname, "..", "..", "data", "bets.json");

/**
 * Read the content of data/bets.json (or create it as {} if missing).
 */
function readBetsFile() {
  if (!fs.existsSync(BITS_JSON_PATH)) {
    fs.mkdirSync(path.dirname(BITS_JSON_PATH), { recursive: true });
    fs.writeFileSync(BITS_JSON_PATH, JSON.stringify({}), "utf8");
    return {};
  }
  const raw = fs.readFileSync(BITS_JSON_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

/**
 * Overwrite data/bets.json with the new object.
 */
function writeBetsFile(dataObj) {
  fs.writeFileSync(BITS_JSON_PATH, JSON.stringify(dataObj, null, 2), "utf8");
}

/**
 * Start listening for BetResolved events from GachaGame.
 * Whenever we see one, write or update an entry in data/bets.json.
 */
async function startListener(gachaAddress) {
  console.log("[Listener] Starting Chainlink event listener...");

  const provider = getProvider();
  if (!provider) {
    console.error("[Listener] No provider found. Make sure Hardhat node is running.");
    process.exit(1);
  }

  // Attach to GachaGame
  const gacha = new ethers.Contract(gachaAddress, GachaAbi, provider);

  gacha.on("BetResolved", (requestId, player, won, payout, event) => {
    const idStr = requestId.toString();
    console.log(
      `[Listener] BetResolved event: requestId=${idStr}, player=${player}, won=${won}, payout=${ethers.utils.formatEther(
        payout
      )} ETH`
    );

    const bets = readBetsFile();
    bets[idStr] = {
      requestId: idStr,
      player:    player,
      won:       won,
      payout:    payout.toString(),
      timestamp: Date.now()
    };
    writeBetsFile(bets);
  });

  console.log(`[Listener] Listening for BetResolved events on GachaGame: ${gachaAddress}`);
}

module.exports = {
  startListener,
};
