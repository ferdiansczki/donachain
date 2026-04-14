const hre = require("hardhat");

async function main() {
    const NFT_ADDRESS = "0xd75B9662422c3313189be64541150Fa9B3A95B19";
    const DonachainNFT = await hre.ethers.getContractAt("DonachainNFT", NFT_ADDRESS);
    
    // Kita cek mapping manual kalau bisa, atau getter donationDetails
    const details = await DonachainNFT.donationDetails(2); // Cek tokenId 2
    console.log("Donation Details for TokenID 2:", details);
    
    const token1 = await DonachainNFT.donationDetails(1);
    console.log("Donation Details for TokenID 1:", token1);

    const token3 = await DonachainNFT.donationDetails(3);
    console.log("Donation Details for TokenID 3:", token3);
}

main().catch(console.error);
