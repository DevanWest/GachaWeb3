// backend/index.js

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { startListener } = require("./controllers/chainlinkListener");
const betRoutes         = require("./routes/bet");
const statusRoutes      = require("./routes/status");

const DEPLOYED_JSON_PATH = path.join(__dirname, "..", "deployed.json");

async function main() {
  // 1) Ensure deployed.json exists
  if (!fs.existsSync(DEPLOYED_JSON_PATH)) {
    console.error("ERROR: deployed.json not found. Run the deploy script first.");
    process.exit(1);
  }

  // 2) Read GachaGame address
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_JSON_PATH, "utf8"));
  const gachaAddress = deployed.GachaGame;
  if (!gachaAddress) {
    console.error("ERROR: GachaGame address missing in deployed.json");
    process.exit(1);
  }

  // 3) Start the Chainlink (VRF mock) listener
  await startListener(gachaAddress);

  // 4) Set up Express
  const app = express();
  app.use(bodyParser.json());

  // Mount routes
  app.use("/api", betRoutes);    // POST /api/bet
  app.use("/api", statusRoutes); // GET  /api/bet/:requestId/status

  // 404 fallback
  app.use((req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n=== Express server listening on http://localhost:${PORT} ===`);
    console.log(`POST /api/bet { multiplier, betAmount } to place a bet`);
    console.log(`GET  /api/bet/:requestId/status to fetch bet result\n`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
