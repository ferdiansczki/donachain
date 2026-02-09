const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying Voting Contract...");

    // Address Contract NFT yang sudah ada
    const NFT_CONTRACT_ADDRESS = "0x18F2DaF080C9FeD516a1bAf2f44EC6dffe258100";

    // Deploy Voting
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(NFT_CONTRACT_ADDRESS);

    await voting.waitForDeployment();

    const votingAddress = await voting.getAddress();
    console.log("✅ Voting Contract deployed to:", votingAddress);
    console.log("Linked with NFT Contract at:", NFT_CONTRACT_ADDRESS);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
