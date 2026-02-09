// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DonachainNFT.sol";

/**
 * @title DonationManager
 * @dev Kontrak utama untuk mengelola kampanye donasi di platform Donachain
 * 
 * PENJELASAN KONTRAK:
 * Kontrak ini adalah jantung dari platform Donachain yang menangani:
 * 1. Pembuatan dan pengelolaan kampanye donasi dengan deadline
 * 2. Penerimaan donasi dari pengguna
 * 3. Penarikan dana dengan pencatatan pengeluaran otomatis
 * 4. Integrasi dengan DonachainNFT untuk reward sertifikat tiered
 * 
 * @author Donachain Team
 */
contract DonationManager is Ownable, ReentrancyGuard {
    
    // ============================================
    // CONSTANTS - Konstanta
    // ============================================
    
    /// @dev Minimum donasi untuk mendapat NFT sertifikat (0.01 ETH)
    uint256 public constant MIN_DONATION_FOR_NFT = 0.01 ether;
    
    // ============================================
    // STATE VARIABLES - Variabel Penyimpanan
    // ============================================
    
    /// @dev Referensi ke kontrak DonachainNFT
    DonachainNFT public nftContract;
    
    /// @dev Counter untuk ID kampanye berikutnya
    uint256 private _nextCampaignId;
    
    /// @dev Counter untuk ID pengeluaran berikutnya
    uint256 private _nextExpenseId;
    
    /// @dev Total dana yang sudah diterima (semua kampanye)
    uint256 public totalDonationsReceived;
    
    /// @dev Total dana yang sudah dikeluarkan
    uint256 public totalExpensesLogged;
    
    // ============================================
    // STRUCTS - Struktur Data
    // ============================================
    
    /**
     * @dev Struktur data untuk kampanye donasi
     * 
     * PENJELASAN FIELD:
     * - id: Identifier unik kampanye
     * - title: Judul kampanye (max 100 karakter)
     * - description: Deskripsi lengkap kampanye
     * - imageCID: IPFS Content ID untuk gambar kampanye
     * - targetAmount: Target dana yang ingin dicapai (dalam wei)
     * - totalRaised: Total dana yang sudah terkumpul
     * - isActive: Status aktif kampanye (masih menerima donasi)
     * - createdAt: Timestamp pembuatan kampanye
     * - deadline: Timestamp batas waktu kampanye
     * - creator: Alamat pembuat kampanye (admin)
     */
    struct Campaign {
        uint256 id;
        string title;
        string description;
        string imageCID;
        uint256 targetAmount;
        uint256 totalRaised;
        bool isActive;
        uint256 createdAt;
        uint256 deadline;       // NEW: Deadline kampanye
        address creator;
    }
    
    /**
     * @dev Struktur data untuk catatan donasi
     */
    struct Donation {
        uint256 id;
        address donor;
        uint256 campaignId;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
        bool nftMinted;
    }
    
    /**
     * @dev Struktur data untuk catatan pengeluaran/penarikan
     * 
     * PENJELASAN:
     * Sekarang expense = withdrawal. Setiap penarikan dana
     * otomatis tercatat sebagai expense untuk transparansi.
     */
    struct Expense {
        uint256 id;
        string description;
        uint256 amount;
        address recipient;
        uint256 timestamp;
        bytes32 txHash;
        uint256 campaignId;
    }
    
    // ============================================
    // MAPPINGS - Pemetaan Data
    // ============================================
    
    mapping(uint256 => Campaign) public campaigns;
    uint256[] public campaignIds;
    Donation[] public allDonations;
    mapping(address => uint256[]) public donorDonations;
    mapping(uint256 => uint256[]) public campaignDonations;
    Expense[] public allExpenses;
    mapping(address => uint256) public donorTotalAmount;
    address[] public uniqueDonors;
    mapping(address => bool) public hasDonated;
    
    // ============================================
    // EVENTS - Event untuk Tracking
    // ============================================
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        uint256 targetAmount,
        uint256 deadline,
        address indexed creator
    );
    
    event CampaignUpdated(
        uint256 indexed campaignId,
        bool isActive
    );
    
    event DonationReceived(
        uint256 indexed donationId,
        address indexed donor,
        uint256 indexed campaignId,
        uint256 amount,
        bytes32 txHash
    );
    
    /**
     * @dev Event saat dana ditarik dengan catatan pengeluaran
     * 
     * PENJELASAN:
     * Event ini menggabungkan ExpenseLogged dan FundsWithdrawn
     */
    event FundsWithdrawnWithLog(
        uint256 indexed expenseId,
        string description,
        uint256 amount,
        address indexed recipient,
        uint256 campaignId,
        bytes32 txHash
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _nextCampaignId = 1;
        _nextExpenseId = 1;
    }
    
    // ============================================
    // ADMIN FUNCTIONS - Fungsi Admin
    // ============================================
    
    /**
     * @dev Set alamat kontrak NFT
     * @param _nftContract Alamat kontrak DonachainNFT
     */
    function setNFTContract(address _nftContract) external onlyOwner {
        require(_nftContract != address(0), "DonationManager: Alamat tidak valid");
        nftContract = DonachainNFT(_nftContract);
    }
    
    /**
     * @dev Buat kampanye donasi baru dengan deadline
     * @param title Judul kampanye
     * @param description Deskripsi kampanye
     * @param imageCID IPFS CID untuk gambar
     * @param targetAmount Target dana dalam wei
     * @param deadline Unix timestamp untuk batas waktu
     * @return campaignId ID kampanye yang baru dibuat
     */
    function createCampaign(
        string memory title,
        string memory description,
        string memory imageCID,
        uint256 targetAmount,
        uint256 deadline
    ) external onlyOwner returns (uint256) {
        // Validasi input
        require(bytes(title).length > 0, "DonationManager: Judul tidak boleh kosong");
        require(bytes(title).length <= 100, "DonationManager: Judul terlalu panjang");
        require(bytes(description).length > 0, "DonationManager: Deskripsi tidak boleh kosong");
        require(targetAmount > 0, "DonationManager: Target harus lebih dari 0");
        require(deadline > block.timestamp, "DonationManager: Deadline harus di masa depan");
        
        uint256 campaignId = _nextCampaignId++;
        
        campaigns[campaignId] = Campaign({
            id: campaignId,
            title: title,
            description: description,
            imageCID: imageCID,
            targetAmount: targetAmount,
            totalRaised: 0,
            isActive: true,
            createdAt: block.timestamp,
            deadline: deadline,
            creator: msg.sender
        });
        
        campaignIds.push(campaignId);
        
        emit CampaignCreated(campaignId, title, targetAmount, deadline, msg.sender);
        
        return campaignId;
    }
    
    /**
     * @dev Update status aktif kampanye
     * @param campaignId ID kampanye
     * @param isActive Status aktif baru
     */
    function updateCampaignStatus(uint256 campaignId, bool isActive) external onlyOwner {
        require(campaigns[campaignId].id != 0, "DonationManager: Kampanye tidak ada");
        campaigns[campaignId].isActive = isActive;
        emit CampaignUpdated(campaignId, isActive);
    }
    
    /**
     * @dev Tarik dana dengan catatan pengeluaran otomatis (MERGED FUNCTION)
     * @param description Deskripsi pengeluaran
     * @param recipient Alamat penerima dana
     * @param amount Jumlah yang ditarik dalam wei
     * @param campaignId ID kampanye terkait (0 jika general)
     * 
     * PENJELASAN:
     * Fungsi ini menggabungkan logExpense() dan withdrawFunds().
     * Setiap penarikan dana akan:
     * 1. Mencatat expense untuk transparansi
     * 2. Mentransfer dana ke recipient
     * 3. Emit event untuk tracking
     */
    function withdrawWithLog(
        string memory description,
        address payable recipient,
        uint256 amount,
        uint256 campaignId
    ) external onlyOwner nonReentrant {
        // Validasi
        require(bytes(description).length > 0, "DonationManager: Deskripsi tidak boleh kosong");
        require(recipient != address(0), "DonationManager: Alamat penerima tidak valid");
        require(amount > 0, "DonationManager: Jumlah harus lebih dari 0");
        require(address(this).balance >= amount, "DonationManager: Saldo tidak cukup");
        
        uint256 expenseId = _nextExpenseId++;
        
        // Simpan txHash sebelum transfer (menggunakan blockhash)
        bytes32 txHash = blockhash(block.number - 1);
        
        // Buat record pengeluaran
        Expense memory expense = Expense({
            id: expenseId,
            description: description,
            amount: amount,
            recipient: recipient,
            timestamp: block.timestamp,
            txHash: txHash,
            campaignId: campaignId
        });
        
        allExpenses.push(expense);
        totalExpensesLogged += amount;
        
        // Transfer dana
        recipient.transfer(amount);
        
        emit FundsWithdrawnWithLog(expenseId, description, amount, recipient, campaignId, txHash);
    }
    
    // ============================================
    // PUBLIC FUNCTIONS - Fungsi Publik
    // ============================================
    
    /**
     * @dev Fungsi utama untuk menerima donasi
     * @param campaignId ID kampanye yang akan didonasikan
     * 
     * PENJELASAN:
     * 1. Cek kampanye aktif dan belum melewati deadline
     * 2. Catat donasi
     * 3. Mint NFT jika >= 0.01 ETH
     */
    function donate(uint256 campaignId) external payable nonReentrant {
        // Validasi dasar
        require(msg.value > 0, "DonationManager: Donasi harus lebih dari 0");
        require(campaigns[campaignId].id != 0, "DonationManager: Kampanye tidak ada");
        require(campaigns[campaignId].isActive, "DonationManager: Kampanye tidak aktif");
        
        // Validasi deadline
        require(
            block.timestamp <= campaigns[campaignId].deadline,
            "DonationManager: Kampanye sudah melewati deadline"
        );
        
        Campaign storage campaign = campaigns[campaignId];
        
        uint256 donationId = allDonations.length + 1;
        
        Donation memory donation = Donation({
            id: donationId,
            donor: msg.sender,
            campaignId: campaignId,
            amount: msg.value,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1),
            nftMinted: false
        });
        
        allDonations.push(donation);
        uint256 donationIndex = allDonations.length - 1;
        
        donorDonations[msg.sender].push(donationIndex);
        campaignDonations[campaignId].push(donationIndex);
        
        campaign.totalRaised += msg.value;
        totalDonationsReceived += msg.value;
        donorTotalAmount[msg.sender] += msg.value;
        
        if (!hasDonated[msg.sender]) {
            hasDonated[msg.sender] = true;
            uniqueDonors.push(msg.sender);
        }
        
        // Mint NFT jika donasi >= 0.01 ETH
        if (msg.value >= MIN_DONATION_FOR_NFT && address(nftContract) != address(0)) {
            nftContract.mintCertificate(
                msg.sender,
                msg.value,
                campaignId,
                campaign.title,
                donation.txHash
            );
            allDonations[donationIndex].nftMinted = true;
        }
        
        emit DonationReceived(donationId, msg.sender, campaignId, msg.value, donation.txHash);
    }
    
    // ============================================
    // VIEW FUNCTIONS - Fungsi Baca Data
    // ============================================
    
    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory result = new Campaign[](campaignIds.length);
        for (uint256 i = 0; i < campaignIds.length; i++) {
            result[i] = campaigns[campaignIds[i]];
        }
        return result;
    }
    
    /**
     * @dev Ambil kampanye yang masih aktif DAN belum melewati deadline
     * @return Array kampanye aktif
     */
    function getActiveCampaigns() external view returns (Campaign[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            Campaign memory c = campaigns[campaignIds[i]];
            if (c.isActive && block.timestamp <= c.deadline) {
                activeCount++;
            }
        }
        
        Campaign[] memory result = new Campaign[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            Campaign memory c = campaigns[campaignIds[i]];
            if (c.isActive && block.timestamp <= c.deadline) {
                result[index] = c;
                index++;
            }
        }
        
        return result;
    }
    
    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        require(campaigns[campaignId].id != 0, "DonationManager: Kampanye tidak ada");
        return campaigns[campaignId];
    }
    
    function getDonationsForCampaign(uint256 campaignId) external view returns (Donation[] memory) {
        uint256[] memory indices = campaignDonations[campaignId];
        Donation[] memory result = new Donation[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            result[i] = allDonations[indices[i]];
        }
        
        return result;
    }
    
    function getDonationsByDonor(address donor) external view returns (Donation[] memory) {
        uint256[] memory indices = donorDonations[donor];
        Donation[] memory result = new Donation[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            result[i] = allDonations[indices[i]];
        }
        
        return result;
    }
    
    function getAllDonations() external view returns (Donation[] memory) {
        return allDonations;
    }
    
    function getAllExpenses() external view returns (Expense[] memory) {
        return allExpenses;
    }
    
    function getLeaderboard(uint256 count) 
        external 
        view 
        returns (address[] memory addresses, uint256[] memory amounts) 
    {
        uint256 donorCount = uniqueDonors.length;
        if (count > donorCount) {
            count = donorCount;
        }
        
        address[] memory donors = new address[](donorCount);
        uint256[] memory totals = new uint256[](donorCount);
        
        for (uint256 i = 0; i < donorCount; i++) {
            donors[i] = uniqueDonors[i];
            totals[i] = donorTotalAmount[uniqueDonors[i]];
        }
        
        // Simple bubble sort
        for (uint256 i = 0; i < donorCount; i++) {
            for (uint256 j = i + 1; j < donorCount; j++) {
                if (totals[j] > totals[i]) {
                    (totals[i], totals[j]) = (totals[j], totals[i]);
                    (donors[i], donors[j]) = (donors[j], donors[i]);
                }
            }
        }
        
        addresses = new address[](count);
        amounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            addresses[i] = donors[i];
            amounts[i] = totals[i];
        }
        
        return (addresses, amounts);
    }
    
    function getStats() 
        external 
        view 
        returns (
            uint256 totalCampaigns,
            uint256 activeCampaigns,
            uint256 totalDonations,
            uint256 totalReceived,
            uint256 totalSpent,
            uint256 contractBalance
        ) 
    {
        totalCampaigns = campaignIds.length;
        
        for (uint256 i = 0; i < campaignIds.length; i++) {
            Campaign memory c = campaigns[campaignIds[i]];
            if (c.isActive && block.timestamp <= c.deadline) {
                activeCampaigns++;
            }
        }
        
        return (
            totalCampaigns,
            activeCampaigns,
            allDonations.length,
            totalDonationsReceived,
            totalExpensesLogged,
            address(this).balance
        );
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {
        revert("DonationManager: Gunakan fungsi donate()");
    }
}
