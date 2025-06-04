/**
 * scripts/deploy.js
 *
 * This script deploys VRFCoordinatorV2Mock (for local Hardhat), creates
 * a subscription, funds it, and then deploys GachaGame with that subscription.
 *
 * To run on a plain Hardhat network (in‐memory):
 *   npx hardhat run scripts/deploy.js
 *
 * To run on localhost (if you already spun up `npx hardhat node` separately):
 *   npx hardhat run scripts/deploy.js --network localhost
 */

const { ethers, network } = require("hardhat");

async function main() {
  // 1. Deploy VRFCoordinatorV2Mock
  console.log("Deploying VRFCoordinatorV2Mock...");
  // The mock constructor expects: (uint96 baseFee, uint96 gasPriceLink)
  // Chainlink docs: baseFee = 0.25 LINK (25e16), gasPriceLink = 1e9 (1 Gwei)
  const baseFee       = ethers.utils.parseEther("0.25"); // 0.25 LINK in wei
  const gasPriceLink  = 1e9;                             // 1 gwei
  const VRFMockFactory = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const vrfMock         = await VRFMockFactory.deploy(baseFee, gasPriceLink);
  await vrfMock.deployed();
  console.log(" → VRFCoordinatorV2Mock deployed at:", vrfMock.address);

  // 2. Create a subscription
  console.log("Creating subscription...");
  const tx = await vrfMock.createSubscription();
  const receipt = await tx.wait();
  // The event SubscriptionCreated(indexed subId, owner) is emitted; we can parse logs.
  // Hardhat’s VRFCoordinatorV2Mock emits SubscriptionCreated(uint64, address);
  const subId = receipt.events[0].args.subId;
  console.log(" → Subscription ID:", subId.toString());

  // 3. Fund subscription with some LINK. In the mock, LINK is just an internal balance.
  const fundAmount = ethers.utils.parseEther("10"); // 10 LINK
  await vrfMock.fundSubscription(subId, fundAmount);
  console.log(" → Funded subscription with 10 LINK.");

  // 4. Deploy GachaGame with the mock address, subId, and a dummy keyHash
  // We can pick any bytes32 for keyHash; in Chainlink docs examples they use a known testnet keyHash.
  // For a local mock, it’s never validated. We’ll just hardcode one here:
  const dummyKeyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7d3d1e0a7a0be4d8c12";

  console.log("Deploying GachaGame contract...");
  const GachaFactory = await ethers.getContractFactory("GachaGame");
  const gacha = await GachaFactory.deploy(vrfMock.address, subId, dummyKeyHash);
  await gacha.deployed();
  console.log(" → GachaGame deployed at:", gacha.address);

  // 5. Add GachaGame as consumer to VRF subscription (so that fulfillRandomWords will succeed)
  console.log("Adding GachaGame as VRF consumer...");
  await vrfMock.addConsumer(subId, gacha.address);
  console.log(" → Added as consumer.");

  console.log("\n=== Deployment Summary ===");
  console.log("VRF Coordinator Mock:", vrfMock.address);
  console.log("Subscription ID:", subId.toString());
  console.log("GachaGame Address:", gacha.address);
  console.log("==========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
