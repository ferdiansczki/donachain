/**
 * @file deploy.js
 * @description Script deployment untuk kontrak Donachain ke jaringan Sepolia
 * 
 * CARA PENGGUNAAN:
 * 1. Pastikan file .env sudah diisi dengan INFURA_API_KEY dan PRIVATE_KEY
 * 2. Jalankan: npx hardhat run scripts/deploy.js --network sepolia
 * 
 * URUTAN DEPLOYMENT:
 * 1. Deploy DonachainNFT terlebih dahulu
 * 2. Deploy DonationManager dengan admin address
 * 3. Set DonationManager di DonachainNFT
 * 4. Set NFTContract di DonationManager
 * 
 * @author Donachain Team
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 Memulai deployment Donachain ke Sepolia...\n");

    // Ambil deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer address:", deployer.address);

    // Cek balance deployer
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

    // ============================================
    // STEP 1: Deploy DonachainNFT
    // ============================================
    console.log("📦 [1/4] Deploying DonachainNFT...");

    const DonachainNFT = await hre.ethers.getContractFactory("DonachainNFT");
    const nftContract = await DonachainNFT.deploy(deployer.address);
    await nftContract.waitForDeployment();

    const nftAddress = await nftContract.getAddress();
    console.log("✅ DonachainNFT deployed to:", nftAddress);

    // ============================================
    // STEP 2: Deploy DonationManager
    // ============================================
    console.log("\n📦 [2/4] Deploying DonationManager...");

    const DonationManager = await hre.ethers.getContractFactory("DonationManager");
    const donationManager = await DonationManager.deploy(deployer.address);
    await donationManager.waitForDeployment();

    const managerAddress = await donationManager.getAddress();
    console.log("✅ DonationManager deployed to:", managerAddress);

    // ============================================
    // STEP 3: Connect NFT to DonationManager
    // ============================================
    console.log("\n🔗 [3/4] Connecting DonachainNFT to DonationManager...");

    const setManagerTx = await nftContract.setDonationManager(managerAddress);
    await setManagerTx.wait();
    console.log("✅ DonationManager set in NFT contract");

    // ============================================
    // STEP 4: Connect DonationManager to NFT
    // ============================================
    console.log("\n🔗 [4/4] Connecting DonationManager to DonachainNFT...");

    const setNftTx = await donationManager.setNFTContract(nftAddress);
    await setNftTx.wait();
    console.log("✅ NFT contract set in DonationManager");

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT BERHASIL!");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log("   DonachainNFT:     ", nftAddress);
    console.log("   DonationManager:  ", managerAddress);
    console.log("\n📋 Admin Address:    ", deployer.address);
    console.log("\n🔗 Etherscan Links:");
    console.log("   NFT:     https://sepolia.etherscan.io/address/" + nftAddress);
    console.log("   Manager: https://sepolia.etherscan.io/address/" + managerAddress);
    console.log("\n" + "=".repeat(60));

    // ============================================
    // SAVE ADDRESSES TO FILE
    // ============================================
    const fs = require("fs");
    const deploymentInfo = {
        network: "sepolia",
        deployedAt: new Date().toISOString(),
        contracts: {
            DonachainNFT: nftAddress,
            DonationManager: managerAddress
        },
        admin: deployer.address
    };

    fs.writeFileSync(
        "./deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n💾 Deployment info saved to deployment-info.json");

    // Return addresses untuk verifikasi
    return {
        nftAddress,
        managerAddress
    };
}

// Jalankan deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment gagal:", error);
        process.exit(1);
    });
