const { ethers } = require("hardhat");

// 0.00001 ETH entry fee
const ENTRY_FEE = ethers.parseEther("0.00001");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const TypeRacerGame = await ethers.getContractFactory("TypeRacerGame");
  const game = await TypeRacerGame.deploy(ENTRY_FEE);
  await game.waitForDeployment();

  const address = await game.getAddress();
  console.log("TypeRacerGame deployed to:", address);
  console.log(`Entry fee: ${ethers.formatEther(ENTRY_FEE)} ETH`);
  console.log("\nAdd this to your .env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
