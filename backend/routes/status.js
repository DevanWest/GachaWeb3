// backend/routes/bet.js

const express = require("express");
const { ethers } = require("ethers");
const { getProvider, getSigner } = require("../utils/ethersProvider");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const GachaAbi   = require("../../artifacts/contracts/GachaGame.sol/GachaGame.json").abi;
const VRFMockAbi = require("@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.json").abi;

const DEPLOYED_JSON_PATH = path.join(__dirname, "..", "..", "deployed.json");

/**
 * POST /api/bet
 *
 * Body:
 * {
 *   "multiplier": 3,
 *   "betAmount": "0.1"
 * }
 *
 * Returns: { "requestId": "XX" }
 */
router.post("/bet", async (req, res) => {
  try {
    const { multiplier, betAmount } = req.body;
    if (!multiplier || !betAmount) {
      return res.status(400).json({ error: "Provide multiplier and betAmount (string in ETH)" });
    }

    // Load addresses from deployed.json
    const deployed = JSON.parse(fs.readFileSync(DEPLOYED_JSON_PATH, "utf8"));
    const gachaAddress   = deployed.GachaGame;
    const vrfMockAddress = deployed.VRFCoordinatorV2Mock;

    const provider = getProvider();
    const signer   = getSigner(); // Hardhat’s first account

    // Attach to GachaGame
    const gacha = new ethers.Contract(gachaAddress, GachaAbi, signer);

    // Convert betAmount (e.g. "0.1") to wei
    let amountWei;
    try {
      amountWei = ethers.utils.parseEther(betAmount);
    } catch {
      return res.status(400).json({ error: "Invalid betAmount. Must be a numeric string like '0.1'" });
    }

    // Validate multiplier
    if (multiplier < 2 || multiplier > 10) {
      return res.status(400).json({ error: "Multiplier must be between 2 and 10" });
    }

    // Place the bet
    console.log(`[BetRoute] placeBet(multiplier=${multiplier}, value=${betAmount} ETH)`);
    const tx = await gacha.placeBet(multiplier, { value: amountWei });
    const receipt = await tx.wait();

    let requestId;
    for (const e of receipt.events) {
      if (e.event === "BetPlaced") {
        requestId = e.args.requestId;
        break;
      }
    }
    if (!requestId) {
      return res.status(500).json({ error: "BetPlaced event not found" });
    }
    const idStr = requestId.toString();
    console.log(`[BetRoute] Got requestId: ${idStr}`);

    // Immediately simulate the VRF callback
    console.log(`[BetRoute] Simulating VRF callback for requestId ${idStr}`);
    const VRFMock = new ethers.Contract(vrfMockAddress, VRFMockAbi, signer);
    await VRFMock.fulfillRandomWords(requestId, gachaAddress);

    return res.json({ requestId: idStr });
  } catch (err) {
    console.error("[BetRoute] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
