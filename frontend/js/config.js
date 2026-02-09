/**
 * @file config.js
 * @description Konfigurasi global untuk aplikasi Donachain
 * 
 * FILE INI BERISI:
 * 1. Alamat kontrak yang sudah di-deploy
 * 2. ABI (Application Binary Interface) kontrak
 * 3. Konfigurasi jaringan Sepolia
 * 4. URL Etherscan untuk verifikasi transaksi
 * 5. Konfigurasi IPFS gateway
 * 
 * @author Donachain Team
 */

// ============================================
// NETWORK CONFIGURATION - Konfigurasi Jaringan
// ============================================

const NETWORK_CONFIG = {
    chainId: '0xaa36a7', // 11155111 dalam hexadecimal
    chainIdDecimal: 11155111,
    chainName: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
        name: 'SepoliaETH',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/a4817bd7a0b34023ae88f910f9683cd2'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
};

// ============================================
// CONTRACT ADDRESSES - Alamat Kontrak
// ============================================

// PENTING: Update alamat ini setelah deploy kontrak baru!
const DONATION_MANAGER_ADDRESS = '0x6cE174d0c343cCbD0152A431645F9ec31aFA1BeF'; // TODO: Update setelah deploy
const NFT_ADDRESS = '0x18F2DaF080C9FeD516a1bAf2f44EC6dffe258100'; // TODO: Update setelah deploy
const VOTING_ADDRESS = '0x0767723b505C88D4beF91106C1dB6bAd1b55aa8c'; // TODO: Update setelah deploy Voting.sol
const ADMIN_ADDRESS = '0xEaEdf9E1175E6CA7B7F400e3fAaC1D3dE2F7Fe0e';

// ============================================
// ETHERSCAN CONFIGURATION
// ============================================

const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io';

function getEtherscanTxUrl(txHash) {
    return `${ETHERSCAN_BASE_URL}/tx/${txHash}`;
}

function getEtherscanAddressUrl(address) {
    return `${ETHERSCAN_BASE_URL}/address/${address}`;
}

// ============================================
// IPFS CONFIGURATION
// ============================================

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

function getIpfsUrl(cid) {
    if (!cid) return '';
    // Jika CID adalah URL lengkap (http/https), kembalikan langsung
    if (cid.startsWith('http://') || cid.startsWith('https://')) {
        return cid;
    }
    const cleanCid = cid.replace('ipfs://', '');
    return `${IPFS_GATEWAY}${cleanCid}`;
}

// ============================================
// APPLICATION CONSTANTS
// ============================================

const MIN_DONATION_FOR_NFT = 0.01;
const LEADERBOARD_COUNT = 5;
const LIVE_FEED_COUNT = 10;

// NFT Tier thresholds (dalam ETH)
const NFT_TIERS = {
    BRONZE: { min: 0.01, max: 0.049, name: 'Bronze' },
    SILVER: { min: 0.05, max: 0.099, name: 'Silver' },
    GOLD: { min: 0.1, max: Infinity, name: 'Gold' },
    SPECIAL: { name: 'Special', chance: '1-5%' }
};

// ============================================
// CONTRACT ABI - DonationManager
// ============================================

const DONATION_MANAGER_ABI = [
    // ========== READ FUNCTIONS ==========

    // Ambil semua kampanye (dengan deadline)
    {
        "inputs": [],
        "name": "getAllCampaigns",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "title", "type": "string" },
                    { "name": "description", "type": "string" },
                    { "name": "imageCID", "type": "string" },
                    { "name": "targetAmount", "type": "uint256" },
                    { "name": "totalRaised", "type": "uint256" },
                    { "name": "isActive", "type": "bool" },
                    { "name": "createdAt", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" },
                    { "name": "creator", "type": "address" }
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil kampanye aktif
    {
        "inputs": [],
        "name": "getActiveCampaigns",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "title", "type": "string" },
                    { "name": "description", "type": "string" },
                    { "name": "imageCID", "type": "string" },
                    { "name": "targetAmount", "type": "uint256" },
                    { "name": "totalRaised", "type": "uint256" },
                    { "name": "isActive", "type": "bool" },
                    { "name": "createdAt", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" },
                    { "name": "creator", "type": "address" }
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil detail satu kampanye
    {
        "inputs": [{ "name": "campaignId", "type": "uint256" }],
        "name": "getCampaign",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "title", "type": "string" },
                    { "name": "description", "type": "string" },
                    { "name": "imageCID", "type": "string" },
                    { "name": "targetAmount", "type": "uint256" },
                    { "name": "totalRaised", "type": "uint256" },
                    { "name": "isActive", "type": "bool" },
                    { "name": "createdAt", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" },
                    { "name": "creator", "type": "address" }
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil donasi untuk kampanye tertentu
    {
        "inputs": [{ "name": "campaignId", "type": "uint256" }],
        "name": "getDonationsForCampaign",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "donor", "type": "address" },
                    { "name": "campaignId", "type": "uint256" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "timestamp", "type": "uint256" },
                    { "name": "txHash", "type": "bytes32" },
                    { "name": "nftMinted", "type": "bool" }
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil donasi berdasarkan donatur
    {
        "inputs": [{ "name": "donor", "type": "address" }],
        "name": "getDonationsByDonor",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "donor", "type": "address" },
                    { "name": "campaignId", "type": "uint256" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "timestamp", "type": "uint256" },
                    { "name": "txHash", "type": "bytes32" },
                    { "name": "nftMinted", "type": "bool" }
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil semua donasi
    {
        "inputs": [],
        "name": "getAllDonations",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "donor", "type": "address" },
                    { "name": "campaignId", "type": "uint256" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "timestamp", "type": "uint256" },
                    { "name": "txHash", "type": "bytes32" },
                    { "name": "nftMinted", "type": "bool" }
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil semua pengeluaran
    {
        "inputs": [],
        "name": "getAllExpenses",
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "description", "type": "string" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "recipient", "type": "address" },
                    { "name": "timestamp", "type": "uint256" },
                    { "name": "txHash", "type": "bytes32" },
                    { "name": "campaignId", "type": "uint256" }
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil leaderboard
    {
        "inputs": [{ "name": "count", "type": "uint256" }],
        "name": "getLeaderboard",
        "outputs": [
            { "name": "addresses", "type": "address[]" },
            { "name": "amounts", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil statistik platform
    {
        "inputs": [],
        "name": "getStats",
        "outputs": [
            { "name": "totalCampaigns", "type": "uint256" },
            { "name": "activeCampaigns", "type": "uint256" },
            { "name": "totalDonations", "type": "uint256" },
            { "name": "totalReceived", "type": "uint256" },
            { "name": "totalSpent", "type": "uint256" },
            { "name": "contractBalance", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Cek owner kontrak
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },

    // ========== WRITE FUNCTIONS ==========

    // Donasi ke kampanye
    {
        "inputs": [{ "name": "campaignId", "type": "uint256" }],
        "name": "donate",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },

    // Buat kampanye baru dengan deadline (admin only)
    {
        "inputs": [
            { "name": "title", "type": "string" },
            { "name": "description", "type": "string" },
            { "name": "imageCID", "type": "string" },
            { "name": "targetAmount", "type": "uint256" },
            { "name": "deadline", "type": "uint256" }
        ],
        "name": "createCampaign",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // Update status kampanye (admin only)
    {
        "inputs": [
            { "name": "campaignId", "type": "uint256" },
            { "name": "isActive", "type": "bool" }
        ],
        "name": "updateCampaignStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // Tarik dana dengan catatan pengeluaran (MERGED FUNCTION - admin only)
    {
        "inputs": [
            { "name": "description", "type": "string" },
            { "name": "recipient", "type": "address" },
            { "name": "amount", "type": "uint256" },
            { "name": "campaignId", "type": "uint256" }
        ],
        "name": "withdrawWithLog",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // ========== EVENTS ==========

    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "donationId", "type": "uint256" },
            { "indexed": true, "name": "donor", "type": "address" },
            { "indexed": true, "name": "campaignId", "type": "uint256" },
            { "indexed": false, "name": "amount", "type": "uint256" },
            { "indexed": false, "name": "txHash", "type": "bytes32" }
        ],
        "name": "DonationReceived",
        "type": "event"
    },

    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "expenseId", "type": "uint256" },
            { "indexed": false, "name": "description", "type": "string" },
            { "indexed": false, "name": "amount", "type": "uint256" },
            { "indexed": true, "name": "recipient", "type": "address" },
            { "indexed": false, "name": "campaignId", "type": "uint256" },
            { "indexed": false, "name": "txHash", "type": "bytes32" }
        ],
        "name": "FundsWithdrawnWithLog",
        "type": "event"
    },

    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "campaignId", "type": "uint256" },
            { "indexed": false, "name": "title", "type": "string" },
            { "indexed": false, "name": "targetAmount", "type": "uint256" },
            { "indexed": false, "name": "deadline", "type": "uint256" },
            { "indexed": true, "name": "creator", "type": "address" }
        ],
        "name": "CampaignCreated",
        "type": "event"
    }
];

// ============================================
// CONTRACT ABI - DonachainNFT (with Tier)
// ============================================

const NFT_ABI = [
    // Ambil token milik donatur
    {
        "inputs": [{ "name": "donor", "type": "address" }],
        "name": "getTokensByDonor",
        "outputs": [{ "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil detail donasi dari token (dengan tier)
    {
        "inputs": [{ "name": "tokenId", "type": "uint256" }],
        "name": "getDonationDetail",
        "outputs": [
            {
                "components": [
                    { "name": "donor", "type": "address" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "campaignId", "type": "uint256" },
                    { "name": "campaignTitle", "type": "string" },
                    { "name": "timestamp", "type": "uint256" },
                    { "name": "txHash", "type": "bytes32" },
                    { "name": "tier", "type": "uint8" }
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil token URI (metadata)
    {
        "inputs": [{ "name": "tokenId", "type": "uint256" }],
        "name": "tokenURI",
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },

    // Total supply NFT
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },

    // Cek owner token
    {
        "inputs": [{ "name": "tokenId", "type": "uint256" }],
        "name": "ownerOf",
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },

    // Ambil nama tier
    {
        "inputs": [{ "name": "tier", "type": "uint8" }],
        "name": "getTierName",
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "pure",
        "type": "function"
    }
];

// ============================================
// CONTRACT ABI - Voting
// ============================================

const VOTING_ABI = [
    // Vote function
    {
        "inputs": [
            { "name": "campaignId", "type": "uint256" },
            { "name": "tokenId", "type": "uint256" }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Check if token used
    {
        "inputs": [{ "name": "tokenId", "type": "uint256" }],
        "name": "hasVoted",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    // Get total votes
    {
        "inputs": [{ "name": "campaignId", "type": "uint256" }],
        "name": "getVotes",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // Event Voted
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "campaignId", "type": "uint256" },
            { "indexed": true, "name": "voter", "type": "address" },
            { "indexed": true, "name": "tokenId", "type": "uint256" }
        ],
        "name": "Voted",
        "type": "event"
    }
];

// ============================================
// EXPORT CONFIGURATION
// ============================================

window.DonaConfig = {
    // Network
    NETWORK_CONFIG,

    // Addresses
    DONATION_MANAGER_ADDRESS,
    DONATION_MANAGER_ADDRESS,
    NFT_ADDRESS,
    VOTING_ADDRESS,
    ADMIN_ADDRESS,
    ADMIN_ADDRESS,

    // Etherscan
    ETHERSCAN_BASE_URL,
    getEtherscanTxUrl,
    getEtherscanAddressUrl,

    // IPFS
    IPFS_GATEWAY,
    getIpfsUrl,

    // Constants
    MIN_DONATION_FOR_NFT,
    LEADERBOARD_COUNT,
    LIVE_FEED_COUNT,
    NFT_TIERS,

    // ABIs
    DONATION_MANAGER_ABI,
    DONATION_MANAGER_ABI,
    NFT_ABI,
    VOTING_ABI
};

console.log('✅ Donachain Config loaded successfully');
