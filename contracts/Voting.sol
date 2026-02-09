// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface untuk DonachainNFT
interface IDonachainNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function donationDetails(uint256 tokenId) external view returns (
        address donor,
        uint256 amount,
        uint256 campaignId,
        string memory campaignTitle,
        uint256 timestamp,
        bytes32 txHash,
        uint8 tier 
    );
}

/**
 * @title Voting
 * @dev Kontrak untuk sistem voting kampanye berbasis kepemilikan NFT Donachain
 * 
 * ATURAN VOTING:
 * 1. Voting menggunakan NFT sebagai "Tiket"
 * 2. Satu NFT hanya bisa digunakan SATU KALI untuk campaign yang sesuai
 * 3. NFT harus berasal dari donasi campaign yang sama dengan yang divote
 */
contract Voting is Ownable, ReentrancyGuard {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @dev Interface ke kontrak NFT
    IDonachainNFT public nftContract;
    
    /// @dev Mapping jumlah vote per kampanye: campaignId => totalVotes
    mapping(uint256 => uint256) public campaignVotes;
    
    /// @dev Mapping status penggunaan NFT: tokenId => apakah sudah dipakai vote?
    /// Karena 1 NFT spesifik utk 1 campaign, cukup bool sudah dipakai atau belum
    mapping(uint256 => bool) public tokenUsed;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event Voted(uint256 indexed campaignId, address indexed voter, uint256 indexed tokenId);
    event NFTContractUpdated(address indexed newAddress);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _nftContract) Ownable(msg.sender) {
        require(_nftContract != address(0), "Voting: Address tidak valid");
        nftContract = IDonachainNFT(_nftContract);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function setNFTContract(address _nftContract) external onlyOwner {
        require(_nftContract != address(0), "Voting: Address tidak valid");
        nftContract = IDonachainNFT(_nftContract);
        emit NFTContractUpdated(_nftContract);
    }
    
    // ============================================
    // MAIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Melakukan voting menggunakan NFT tertentu
     * @param campaignId ID kampanye yang ingin didukung
     * @param tokenId ID NFT yang digunakan sebagai tiket
     */
    function vote(uint256 campaignId, uint256 tokenId) external nonReentrant {
        // 1. Cek kepemilikan NFT
        require(nftContract.ownerOf(tokenId) == msg.sender, "Voting: Anda bukan pemilik NFT ini");
        
        // 2. Cek apakah NFT sudah dipakai
        require(!tokenUsed[tokenId], "Voting: NFT ini sudah digunakan untuk voting");
        
        // 3. Ambil detail donasi dari NFT untuk validasi campaign
        (,, uint256 nftCampaignId,,,,) = nftContract.donationDetails(tokenId);
        
        // 4. Validasi: NFT harus berasal dari donasi campaign yang sama
        require(nftCampaignId == campaignId, "Voting: NFT ini bukan tiket untuk kampanye ini");
        
        // 5. Eksekusi Vote
        tokenUsed[tokenId] = true;
        campaignVotes[campaignId]++;
        
        emit Voted(campaignId, msg.sender, tokenId);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Cek apakah NFT sudah digunakan
     */
    function hasVoted(uint256 tokenId) external view returns (bool) {
        return tokenUsed[tokenId];
    }
    
    /**
     * @dev Ambil total vote untuk suatu kampanye
     */
    function getVotes(uint256 campaignId) external view returns (uint256) {
        return campaignVotes[campaignId];
    }
}
