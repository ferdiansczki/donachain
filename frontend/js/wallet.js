/**
 * @file wallet.js
 * @description Modul untuk mengelola koneksi wallet MetaMask
 * 
 * FILE INI MENANGANI:
 * 1. Koneksi ke MetaMask
 * 2. Validasi jaringan (harus Sepolia)
 * 3. Penanganan perubahan akun/jaringan
 * 4. Disconnect wallet
 * 
 * DEPENDENCY:
 * - config.js (harus dimuat terlebih dahulu)
 * - ethers.js (dari CDN)
 * 
 * @author Donachain Team
 */

// ============================================
// STATE VARIABLES - Variabel Status
// ============================================

/**
 * State wallet saat ini
 * 
 * PENJELASAN:
 * Object ini menyimpan status koneksi wallet secara global
 * sehingga bisa diakses dari modul manapun
 */
const WalletState = {
    isConnected: false,      // Status koneksi
    address: null,           // Alamat wallet terkoneksi
    provider: null,          // Ethers.js provider
    signer: null,            // Ethers.js signer untuk transaksi
    isCorrectNetwork: false  // Apakah di jaringan Sepolia
};

// ============================================
// WALLET CONNECTION - Koneksi Wallet
// ============================================

/**
 * Cek apakah MetaMask terinstall di browser
 * 
 * @returns {boolean} true jika MetaMask tersedia
 * 
 * PENJELASAN:
 * MetaMask meng-inject object 'ethereum' ke window browser.
 * Kita cek apakah object ini ada untuk mengetahui
 * apakah user sudah install MetaMask.
 */
function isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
}

/**
 * Koneksi ke MetaMask
 * 
 * @returns {Promise<object>} Object berisi status koneksi dan alamat
 * 
 * PENJELASAN FLOW:
 * 1. Cek apakah MetaMask terinstall
 * 2. Request akses ke akun user (memunculkan popup MetaMask)
 * 3. Buat provider dan signer dari ethers.js
 * 4. Cek apakah user di jaringan yang benar
 * 5. Jika salah jaringan, minta user untuk switch
 * 
 * ERROR HANDLING:
 * - Jika MetaMask tidak terinstall, lempar error
 * - Jika user menolak koneksi, tangkap error dan kembalikan status
 */
async function connectWallet() {
    try {
        // Cek MetaMask terinstall
        if (!isMetaMaskInstalled()) {
            throw new Error('MetaMask belum terinstall. Silakan install MetaMask terlebih dahulu.');
        }

        console.log('🔌 Menghubungkan ke MetaMask...');

        // Request akses ke akun
        // Ini akan memunculkan popup MetaMask meminta izin
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            throw new Error('Tidak ada akun yang terkoneksi');
        }

        // Buat provider menggunakan ethers.js
        // BrowserProvider menghubungkan ke MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);

        // Ambil signer untuk menandatangani transaksi
        const signer = await provider.getSigner();

        // Ambil alamat wallet
        const address = await signer.getAddress();

        // Cek jaringan
        const isCorrectNetwork = await checkNetwork();

        // Update state
        WalletState.isConnected = true;
        WalletState.address = address;
        WalletState.provider = provider;
        WalletState.signer = signer;
        WalletState.isCorrectNetwork = isCorrectNetwork;

        // Jika jaringan salah, minta switch
        if (!isCorrectNetwork) {
            console.log('⚠️ Jaringan salah, meminta switch ke Sepolia...');
            await switchToSepolia();
        }

        // Setup event listeners untuk perubahan akun/jaringan
        setupWalletListeners();

        // Persist connection state
        localStorage.setItem('dona_wallet_connected', 'true');
        localStorage.setItem('dona_wallet_address', address);

        console.log('✅ Wallet terkoneksi:', address);

        return {
            success: true,
            address: address,
            isCorrectNetwork: WalletState.isCorrectNetwork
        };

    } catch (error) {
        console.error('❌ Gagal koneksi wallet:', error);

        // Reset state jika gagal
        resetWalletState();
        localStorage.removeItem('dona_wallet_connected');
        localStorage.removeItem('dona_wallet_address');

        // Re-throw error dengan pesan yang lebih jelas
        if (error.code === 4001) {
            // User menolak koneksi
            throw new Error('Koneksi ditolak oleh user');
        }

        throw error;
    }
}

/**
 * Disconnect wallet (reset state)
 * 
 * PENJELASAN:
 * MetaMask tidak menyediakan fungsi disconnect secara native.
 * Yang bisa kita lakukan adalah mereset state aplikasi kita.
 * User harus disconnect manual dari MetaMask jika ingin benar-benar putus.
 */
function disconnectWallet() {
    console.log('🔌 Memutus koneksi wallet...');
    resetWalletState();
    localStorage.removeItem('dona_wallet_connected');
    localStorage.removeItem('dona_wallet_address');

    // Trigger event untuk update UI
    window.dispatchEvent(new CustomEvent('walletDisconnected'));

    console.log('✅ Wallet terputus');
}

/**
 * Reset state wallet ke kondisi awal
 */
function resetWalletState() {
    WalletState.isConnected = false;
    WalletState.address = null;
    WalletState.provider = null;
    WalletState.signer = null;
    WalletState.isCorrectNetwork = false;
}

// ============================================
// NETWORK MANAGEMENT - Pengelolaan Jaringan
// ============================================

/**
 * Cek apakah user di jaringan Sepolia
 * 
 * @returns {Promise<boolean>} true jika di Sepolia
 * 
 * PENJELASAN:
 * Setiap blockchain memiliki chainId unik.
 * Sepolia memiliki chainId 11155111 (0xaa36a7 dalam hex).
 * Kita bandingkan chainId user dengan chainId Sepolia.
 */
async function checkNetwork() {
    try {
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });

        const config = window.DonaConfig;
        const isCorrect = chainId === config.NETWORK_CONFIG.chainId;

        console.log('🌐 Current chain:', chainId, '| Expected:', config.NETWORK_CONFIG.chainId);

        return isCorrect;

    } catch (error) {
        console.error('❌ Gagal cek jaringan:', error);
        return false;
    }
}

/**
 * Minta user untuk switch ke jaringan Sepolia
 * 
 * @returns {Promise<boolean>} true jika berhasil switch
 * 
 * PENJELASAN FLOW:
 * 1. Coba switch ke Sepolia dengan wallet_switchEthereumChain
 * 2. Jika Sepolia belum ada di MetaMask user, akan error 4902
 * 3. Jika error 4902, tambahkan Sepolia dulu dengan wallet_addEthereumChain
 * 4. Setelah ditambahkan, coba switch lagi
 */
async function switchToSepolia() {
    const config = window.DonaConfig;

    try {
        // Coba switch ke Sepolia
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: config.NETWORK_CONFIG.chainId }]
        });

        WalletState.isCorrectNetwork = true;
        console.log('✅ Berhasil switch ke Sepolia');
        return true;

    } catch (switchError) {
        // Error 4902 berarti chain belum ditambahkan ke MetaMask
        if (switchError.code === 4902) {
            console.log('📥 Menambahkan jaringan Sepolia ke MetaMask...');

            try {
                // Tambahkan Sepolia ke MetaMask
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: config.NETWORK_CONFIG.chainId,
                        chainName: config.NETWORK_CONFIG.chainName,
                        nativeCurrency: config.NETWORK_CONFIG.nativeCurrency,
                        rpcUrls: config.NETWORK_CONFIG.rpcUrls,
                        blockExplorerUrls: config.NETWORK_CONFIG.blockExplorerUrls
                    }]
                });

                WalletState.isCorrectNetwork = true;
                console.log('✅ Sepolia berhasil ditambahkan dan diaktifkan');
                return true;

            } catch (addError) {
                console.error('❌ Gagal menambahkan Sepolia:', addError);
                throw new Error('Gagal menambahkan jaringan Sepolia ke MetaMask');
            }
        }

        // Error lain (misalnya user menolak)
        if (switchError.code === 4001) {
            throw new Error('User menolak pergantian jaringan');
        }

        throw switchError;
    }
}

// ============================================
// EVENT LISTENERS - Pendengar Event
// ============================================

/**
 * Setup event listeners untuk perubahan wallet
 * 
 * PENJELASAN:
 * MetaMask emit event saat:
 * 1. User ganti akun (accountsChanged)
 * 2. User ganti jaringan (chainChanged)
 * 
 * Kita perlu menangani event ini untuk update UI dan state
 */
function setupWalletListeners() {
    // Hapus listener lama untuk mencegah duplikasi
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);

    // Tambahkan listener baru
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    console.log('👂 Wallet event listeners aktif');
}

/**
 * Handler saat akun berubah
 * 
 * @param {string[]} accounts - Array akun baru
 * 
 * PENJELASAN:
 * Jika user ganti akun di MetaMask, kita perlu:
 * 1. Update state dengan akun baru
 * 2. Jika tidak ada akun (user disconnect), reset state
 * 3. Trigger event untuk update UI
 */
async function handleAccountsChanged(accounts) {
    console.log('🔄 Akun berubah:', accounts);

    if (accounts.length === 0) {
        // User disconnect dari MetaMask
        localStorage.removeItem('dona_wallet_connected');
        localStorage.removeItem('dona_wallet_address');
        disconnectWallet();
    } else {
        // Update ke akun baru
        WalletState.address = accounts[0];
        localStorage.setItem('dona_wallet_connected', 'true');
        localStorage.setItem('dona_wallet_address', accounts[0]);

        // Update signer
        if (WalletState.provider) {
            WalletState.signer = await WalletState.provider.getSigner();
        }

        // Trigger event untuk update UI
        window.dispatchEvent(new CustomEvent('walletAccountChanged', {
            detail: { address: accounts[0] }
        }));
    }
}

/**
 * Handler saat jaringan berubah
 * 
 * @param {string} chainId - Chain ID baru dalam hex
 * 
 * PENJELASAN:
 * Jika user ganti jaringan, kita perlu:
 * 1. Cek apakah jaringan baru adalah Sepolia
 * 2. Update state isCorrectNetwork
 * 3. Jika bukan Sepolia, tampilkan warning dan minta switch
 */
async function handleChainChanged(chainId) {
    console.log('🔄 Jaringan berubah ke:', chainId);

    const config = window.DonaConfig;
    const isCorrect = chainId === config.NETWORK_CONFIG.chainId;

    WalletState.isCorrectNetwork = isCorrect;

    // Trigger event untuk update UI
    window.dispatchEvent(new CustomEvent('walletNetworkChanged', {
        detail: {
            chainId: chainId,
            isCorrectNetwork: isCorrect
        }
    }));

    // Jika jaringan salah, tampilkan warning
    if (!isCorrect) {
        console.warn('⚠️ Jaringan salah! Harap gunakan Sepolia.');
    }
}

// ============================================
// UTILITY FUNCTIONS - Fungsi Utilitas
// ============================================

/**
 * Ambil alamat wallet yang terkoneksi
 * 
 * @returns {string|null} Alamat wallet atau null jika tidak terkoneksi
 */
function getWalletAddress() {
    return WalletState.address;
}

/**
 * Cek apakah wallet terkoneksi
 * 
 * @returns {boolean} true jika terkoneksi
 */
function isWalletConnected() {
    return WalletState.isConnected;
}

/**
 * Ambil signer untuk transaksi
 * 
 * @returns {object|null} Ethers.js signer atau null
 */
function getSigner() {
    return WalletState.signer;
}

/**
 * Ambil provider untuk read operations
 * 
 * @returns {object|null} Ethers.js provider atau null
 */
function getProvider() {
    return WalletState.provider;
}

/**
 * Cek apakah alamat adalah admin
 * 
 * @param {string} address - Alamat yang akan dicek
 * @returns {boolean} true jika alamat adalah admin
 */
function isAdmin(address) {
    if (!address) return false;
    const config = window.DonaConfig;
    return address.toLowerCase() === config.ADMIN_ADDRESS.toLowerCase();
}

/**
 * Format alamat wallet untuk tampilan
 * 
 * @param {string} address - Alamat lengkap
 * @returns {string} Alamat yang sudah diformat (0x1234...5678)
 * 
 * PENJELASAN:
 * Alamat Ethereum panjangnya 42 karakter.
 * Untuk tampilan, kita potong jadi: 6 karakter awal + ... + 4 karakter akhir
 */
function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Coba reconnect jika sudah pernah connect sebelumnya
 * 
 * PENJELASAN:
 * Fungsi ini dipanggil saat halaman dimuat.
 * Jika user sudah pernah connect dan masih terkoneksi di MetaMask,
 * kita bisa langsung ambil akun tanpa meminta izin lagi.
 */
async function tryReconnect() {
    try {
        if (!isMetaMaskInstalled()) return false;

        // Cek akun yang sudah terkoneksi (tanpa popup)
        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });

        if (accounts.length > 0) {
            console.log('🔄 Reconnecting ke wallet yang sudah terkoneksi...');
            await connectWallet();
            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Gagal reconnect:', error);
        return false;
    }
}

/**
 * Ambil saldo ETH wallet yang terkoneksi
 * 
 * @returns {Promise<string>} Saldo dalam ETH (string)
 */
async function getBalance() {
    try {
        if (!WalletState.isConnected || !WalletState.address) {
            return '0';
        }

        // Gunakan provider untuk mendapatkan balance
        if (WalletState.provider) {
            const balance = await WalletState.provider.getBalance(WalletState.address);
            return ethers.formatEther(balance);
        }

        // Fallback: gunakan window.ethereum langsung
        const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [WalletState.address, 'latest']
        });

        // Convert hex to ETH
        return ethers.formatEther(balance);

    } catch (error) {
        console.error('❌ Gagal mengambil saldo:', error);
        return '0';
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export semua fungsi wallet ke global scope
 * 
 * PENGGUNAAN DI FILE LAIN:
 * - await window.DonaWallet.connectWallet()
 * - window.DonaWallet.getWalletAddress()
 * - dll
 */
window.DonaWallet = {
    // Connection
    connectWallet,
    disconnectWallet,
    tryReconnect,

    // State getters
    getWalletAddress,
    isWalletConnected,
    getSigner,
    getProvider,
    getBalance,

    // Network
    checkNetwork,
    switchToSepolia,

    // Utilities
    isMetaMaskInstalled,
    isAdmin,
    formatAddress,

    // Raw state (untuk debugging)
    getState: () => ({ ...WalletState })
};

console.log('✅ Donachain Wallet module loaded successfully');
