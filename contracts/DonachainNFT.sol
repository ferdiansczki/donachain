// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title DonachainNFT
 * @dev Kontrak ERC-721 untuk "Impact Certificate" dengan sistem Tier dinamis
 * 
 * PENJELASAN KONTRAK:
 * Kontrak ini mengimplementasikan NFT sebagai bukti donasi (sertifikat).
 * Setiap kali user melakukan donasi >= 0.01 ETH, mereka akan menerima NFT
 * dengan tier yang sesuai berdasarkan jumlah donasi.
 * 
 * SISTEM TIER:
 * - Bronze: 0.01 - 0.049 ETH
 * - Silver: 0.05 - 0.099 ETH  
 * - Gold: >= 0.1 ETH
 * - Special: 1-5% random chance (apapun jumlah donasi)
 * 
 * @author Donachain Team
 */
contract DonachainNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;
    
    // ============================================
    // TIER CONSTANTS - Konstanta Tier
    // ============================================
    
    /// @dev Tier types
    enum Tier { Bronze, Silver, Gold, Special }
    
    /// @dev Threshold untuk Silver tier (0.05 ETH)
    uint256 public constant SILVER_THRESHOLD = 0.05 ether;
    
    /// @dev Threshold untuk Gold tier (0.1 ETH)
    uint256 public constant GOLD_THRESHOLD = 0.1 ether;
    
    /// @dev Probabilitas Special tier (5% = 500 dari 10000)
    uint256 public constant SPECIAL_CHANCE = 500; // 5%
    
    // ============================================
    // IPFS CIDs - Content IDs untuk Gambar
    // ============================================
    
    /// @dev IPFS CID untuk tier Bronze
    string public constant BRONZE_CID = "bafybeifcs35wapkfuevf5x5ek222sjdjxknk5k2etbyxrh6grl57mlz2dq";
    
    /// @dev IPFS CID untuk tier Silver
    string public constant SILVER_CID = "bafkreif7fjesfwpmzusvbqpgvrvkqop6q33zudsa552jupi4yffymok27y";
    
    /// @dev IPFS CID untuk tier Gold
    string public constant GOLD_CID = "bafybeigxqthxigxrei74ksg7a7gtnrhyuin3wojtnldtmotx23pw3zjrwy";
    
    /// @dev IPFS CID untuk tier Special
    string public constant SPECIAL_CID = "bafybeigb7dzwnn3ydaznwhehxkqa3453pfw4gda3wgd6qdxzoiyvt52ctu";
    
    // ============================================
    // STATE VARIABLES - Variabel Penyimpanan
    // ============================================
    
    /// @dev Counter untuk ID token berikutnya
    uint256 private _nextTokenId;
    
    /// @dev Nonce untuk random number generation
    uint256 private _randomNonce;
    
    /// @dev Alamat kontrak DonationManager yang diizinkan untuk mint
    address public donationManager;
    
    /// @dev Struct untuk menyimpan detail donasi yang terkait dengan NFT
    struct DonationDetail {
        address donor;           // Alamat donatur
        uint256 amount;          // Jumlah donasi dalam wei
        uint256 campaignId;      // ID kampanye yang didonasikan
        string campaignTitle;    // Judul kampanye
        uint256 timestamp;       // Waktu donasi
        bytes32 txHash;          // Hash transaksi donasi
        Tier tier;               // Tier NFT (Bronze/Silver/Gold/Special)
    }
    
    /// @dev Mapping dari token ID ke detail donasi
    mapping(uint256 => DonationDetail) public donationDetails;
    
    /// @dev Mapping dari alamat donatur ke array token ID yang dimiliki
    mapping(address => uint256[]) public donorTokens;
    
    // ============================================
    // EVENTS - Event untuk tracking
    // ============================================
    
    /// @dev Event saat NFT sertifikat berhasil di-mint
    event CertificateMinted(
        address indexed donor,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 campaignId,
        Tier tier
    );
    
    /// @dev Event saat DonationManager address diubah
    event DonationManagerUpdated(address indexed newManager);
    
    // ============================================
    // MODIFIERS - Pengaman Fungsi
    // ============================================
    
    /// @dev Modifier untuk membatasi akses hanya dari DonationManager
    modifier onlyDonationManager() {
        require(
            msg.sender == donationManager,
            "DonachainNFT: Hanya DonationManager yang dapat memanggil"
        );
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @dev Constructor untuk inisialisasi kontrak NFT
     * @param initialOwner Alamat admin/owner kontrak
     */
    constructor(address initialOwner) 
        ERC721("Donachain Impact Certificate", "DONATE") 
        Ownable(initialOwner) 
    {
        _nextTokenId = 1;
        _randomNonce = 0;
    }
    
    // ============================================
    // ADMIN FUNCTIONS - Fungsi Admin
    // ============================================
    
    /**
     * @dev Set alamat kontrak DonationManager
     * @param _donationManager Alamat kontrak DonationManager
     */
    function setDonationManager(address _donationManager) external onlyOwner {
        require(_donationManager != address(0), "DonachainNFT: Alamat tidak valid");
        donationManager = _donationManager;
        emit DonationManagerUpdated(_donationManager);
    }
    
    // ============================================
    // MINTING FUNCTIONS - Fungsi Cetak NFT
    // ============================================
    
    /**
     * @dev Mint NFT sertifikat donasi dengan tier otomatis
     * @param donor Alamat donatur yang akan menerima NFT
     * @param amount Jumlah donasi dalam wei
     * @param campaignId ID kampanye
     * @param campaignTitle Judul kampanye
     * @param txHash Hash transaksi donasi
     * @return tokenId ID token yang baru di-mint
     * 
     * PENJELASAN DETAIL:
     * 1. Tentukan tier berdasarkan amount + random check untuk Special
     * 2. Mint NFT ke donatur
     * 3. Simpan detail donasi on-chain
     */
    function mintCertificate(
        address donor,
        uint256 amount,
        uint256 campaignId,
        string memory campaignTitle,
        bytes32 txHash
    ) external onlyDonationManager returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        // Tentukan tier
        Tier tier = _determineTier(amount, donor, tokenId);
        
        // Mint NFT ke donatur
        _safeMint(donor, tokenId);
        
        // Simpan detail donasi
        donationDetails[tokenId] = DonationDetail({
            donor: donor,
            amount: amount,
            campaignId: campaignId,
            campaignTitle: campaignTitle,
            timestamp: block.timestamp,
            txHash: txHash,
            tier: tier
        });
        
        // Tambahkan ke list token milik donatur
        donorTokens[donor].push(tokenId);
        
        emit CertificateMinted(donor, tokenId, amount, campaignId, tier);
        
        return tokenId;
    }
    
    // ============================================
    // TIER DETERMINATION - Penentuan Tier
    // ============================================
    
    /**
     * @dev Tentukan tier berdasarkan jumlah donasi dan random check
     * @param amount Jumlah donasi dalam wei
     * @param donor Alamat donatur (untuk randomness)
     * @param tokenId Token ID (untuk randomness)
     * @return Tier yang ditentukan
     * 
     * PENJELASAN:
     * 1. Cek apakah dapat Special tier (1-5% chance)
     * 2. Jika tidak, tentukan berdasarkan amount
     */
    function _determineTier(uint256 amount, address donor, uint256 tokenId) 
        internal 
        returns (Tier) 
    {
        // Generate random number (0-9999)
        uint256 random = _generateRandom(donor, tokenId);
        
        // Cek Special tier (5% chance = 0-499)
        if (random < SPECIAL_CHANCE) {
            return Tier.Special;
        }
        
        // Tentukan berdasarkan amount
        if (amount >= GOLD_THRESHOLD) {
            return Tier.Gold;
        } else if (amount >= SILVER_THRESHOLD) {
            return Tier.Silver;
        } else {
            return Tier.Bronze;
        }
    }
    
    /**
     * @dev Generate pseudo-random number
     * @param donor Alamat donatur
     * @param tokenId Token ID
     * @return Random number 0-9999
     * 
     * CATATAN: Ini adalah pseudo-random, bukan truly random.
     * Untuk production dengan nilai tinggi, gunakan Chainlink VRF.
     */
    function _generateRandom(address donor, uint256 tokenId) 
        internal 
        returns (uint256) 
    {
        _randomNonce++;
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            donor,
            tokenId,
            _randomNonce
        ))) % 10000;
    }
    
    // ============================================
    // VIEW FUNCTIONS - Fungsi Baca Data
    // ============================================
    
    /**
     * @dev Ambil semua token ID yang dimiliki oleh suatu alamat
     * @param donor Alamat donatur
     * @return Array token ID
     */
    function getTokensByDonor(address donor) external view returns (uint256[] memory) {
        return donorTokens[donor];
    }
    
    /**
     * @dev Ambil detail donasi berdasarkan token ID
     * @param tokenId ID token NFT
     * @return Detail donasi terkait token tersebut
     */
    function getDonationDetail(uint256 tokenId) external view returns (DonationDetail memory) {
        require(_ownerOf(tokenId) != address(0), "DonachainNFT: Token tidak ada");
        return donationDetails[tokenId];
    }
    
    /**
     * @dev Ambil jumlah total NFT yang sudah di-mint
     * @return Jumlah total NFT
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @dev Ambil CID berdasarkan tier
     * @param tier Tier NFT
     * @return IPFS CID string
     */
    function getCIDForTier(Tier tier) public pure returns (string memory) {
        if (tier == Tier.Special) return SPECIAL_CID;
        if (tier == Tier.Gold) return GOLD_CID;
        if (tier == Tier.Silver) return SILVER_CID;
        return BRONZE_CID;
    }
    
    /**
     * @dev Ambil nama tier sebagai string
     * @param tier Tier NFT
     * @return Nama tier
     */
    function getTierName(Tier tier) public pure returns (string memory) {
        if (tier == Tier.Special) return "Special";
        if (tier == Tier.Gold) return "Gold";
        if (tier == Tier.Silver) return "Silver";
        return "Bronze";
    }
    
    /**
     * @dev Generate token URI on-chain dengan gambar IPFS langsung
     * @param tokenId ID token
     * @return URI dalam format data:application/json;base64,...
     * 
     * PENJELASAN:
     * Gambar NFT langsung menggunakan IPFS image berdasarkan tier.
     * Tidak ada SVG styling, hanya gambar mentah dari IPFS.
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "DonachainNFT: Token tidak ada");
        
        DonationDetail memory detail = donationDetails[tokenId];
        
        // Format amount dari wei ke ETH string
        string memory amountStr = _formatEther(detail.amount);
        
        // Ambil CID dan nama tier
        string memory imageCID = getCIDForTier(detail.tier);
        string memory tierName = getTierName(detail.tier);
        
        // Build IPFS image URL langsung
        string memory imageUrl = string(abi.encodePacked(
            "ipfs://",
            imageCID
        ));
        
        // Build JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name": "Donachain Certificate #', tokenId.toString(), ' (', tierName, ')",',
            '"description": "Sertifikat Impact Certificate tier ', tierName, ' sebagai bukti donasi di platform Donachain.",',
            '"image": "', imageUrl, '",',
            '"attributes": [',
                '{"trait_type": "Tier", "value": "', tierName, '"},',
                '{"trait_type": "Campaign", "value": "', detail.campaignTitle, '"},',
                '{"trait_type": "Amount", "value": "', amountStr, ' ETH"},',
                '{"trait_type": "Campaign ID", "value": "', detail.campaignId.toString(), '"},',
                '{"trait_type": "Date", "value": "', detail.timestamp.toString(), '"}',
            ']}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }
    
    /**
     * @dev Format wei ke ETH dengan 4 desimal
     * @param weiAmount Jumlah dalam wei
     * @return String dalam format ETH
     */
    function _formatEther(uint256 weiAmount) internal pure returns (string memory) {
        uint256 ethWhole = weiAmount / 1e18;
        uint256 ethDecimal = (weiAmount % 1e18) / 1e14; // 4 desimal
        
        if (ethDecimal == 0) {
            return ethWhole.toString();
        }
        
        // Pad dengan nol di depan jika perlu
        string memory decimalStr = ethDecimal.toString();
        while (bytes(decimalStr).length < 4) {
            decimalStr = string(abi.encodePacked("0", decimalStr));
        }
        
        return string(abi.encodePacked(ethWhole.toString(), ".", decimalStr));
    }
    
    // ============================================
    // REQUIRED OVERRIDES - Override yang Diperlukan
    // ============================================
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
