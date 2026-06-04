/**
 * @file wallet.js
 * @description Modul pengelolaan koneksi dompet MetaMask, validasi jaringan, 
 * dan penanganan perubahan status akun pengguna.
 */


// VARIABEL STATUS


/**
 * Menyimpan status koneksi dompet saat ini secara global.
 * Objek ini memungkinkan akses status dari modul lain dalam aplikasi.
 */
const WalletState = {
    isConnected: false,      // Status koneksi
    address: null,           // Alamat wallet terkoneksi
    provider: null,          // Ethers.js provider
    signer: null,            // Ethers.js signer untuk transaksi
    isCorrectNetwork: false  // Apakah di jaringan Sepolia
};


// KONEKSI DOMPET


/**
 * Memeriksa apakah ekstensi MetaMask telah terpasang pada peramban.
 * 
 * @returns {boolean} True jika MetaMask tersedia.
 * 
 * Deskripsi:
 * MetaMask menyuntikkan objek 'ethereum' ke dalam objek window peramban.
 * Pemeriksaan dilakukan pada objek tersebut untuk memastikan ketersediaan MetaMask.
 */
function isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
}

/**
 * Menangani prosedur koneksi ke dompet MetaMask, validasi jaringan (Sepolia), 
 * dan inisialisasi provider/signer.
 */
async function connectWallet() {
    try {
        // Cek MetaMask terinstall
        if (!isMetaMaskInstalled()) {
            throw new Error('MetaMask belum terinstall. Silakan install MetaMask terlebih dahulu.');
        }


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
            await switchToSepolia();
        }

        // Setup event listeners untuk perubahan akun/jaringan
        setupWalletListeners();

        // Persist connection state
        localStorage.setItem('dona_wallet_connected', 'true');
        localStorage.setItem('dona_wallet_address', address);


        return {
            success: true,
            address: address,
            isCorrectNetwork: WalletState.isCorrectNetwork
        };

    } catch (error) {
        console.error('Gagal menyambungkan dompet:', error);

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
 * Memutuskan sesi koneksi dompet pada sisi aplikasi.
 * 
 * Deskripsi:
 * Karena MetaMask tidak menyediakan fungsi pemutusan koneksi secara native,
 * prosedur ini difokuskan pada pembersihan status (state) internal aplikasi.
 * Pengguna disarankan untuk memutuskan koneksi secara manual melalui MetaMask untuk keamanan penuh.
 */
function disconnectWallet() {
    resetWalletState();
    localStorage.removeItem('dona_wallet_connected');
    localStorage.removeItem('dona_wallet_address');

    // Trigger event untuk update UI
    window.dispatchEvent(new CustomEvent('walletDisconnected'));

}

/**
 * Mengembalikan variabel status dompet ke kondisi semula.
 */
function resetWalletState() {
    WalletState.isConnected = false;
    WalletState.address = null;
    WalletState.provider = null;
    WalletState.signer = null;
    WalletState.isCorrectNetwork = false;
}


// PENGELOLAAN JARINGAN


/**
 * Memvalidasi apakah akun pengguna berada pada jaringan Sepolia.
 * 
 * @returns {Promise<boolean>} True jika berada pada jaringan Sepolia.
 * 
 * Deskripsi:
 * Membandingkan Chain ID pengguna dengan Chain ID Sepolia (11155111 atau 0xaa36a7).
 */
async function checkNetwork() {
    try {
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });

        const config = window.DonaConfig;
        const isCorrect = chainId === config.NETWORK_CONFIG.chainId;


        return isCorrect;

    } catch (error) {
        console.error('Gagal memeriksa status jaringan:', error);
        return false;
    }
}

/**
 * Meminta pengguna untuk mengalihkan koneksi ke jaringan Sepolia.
 * 
 * @returns {Promise<boolean>} True jika proses pengalihan berhasil.
 * 
 * Alur Kerja:
 * 1. Mencoba mengalihkan jaringan menggunakan metode wallet_switchEthereumChain.
 * 2. Jika jaringan belum terdaftar, menangkap kesalahan dengan kode 4902.
 * 3. Mendaftarkan jaringan Sepolia menggunakan metode wallet_addEthereumChain.
 * 4. Melakukan percobaan pengalihan ulang setelah pendaftaran.
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
        return true;

    } catch (switchError) {
        // Error 4902 berarti chain belum ditambahkan ke MetaMask
        if (switchError.code === 4902) {

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
                return true;

            } catch (addError) {
                console.error('Gagal menambahkan jaringan Sepolia:', addError);
                throw new Error('Gagal menambahkan konfigurasi jaringan Sepolia ke MetaMask');
            }
        }

        // Error lain (misalnya user menolak)
        if (switchError.code === 4001) {
            throw new Error('User menolak pergantian jaringan');
        }

        throw switchError;
    }
}


// PENDENGAR KEJADIAN (EVENT LISTENERS)


/**
 * Menyiapkan pendengar kejadian (event listeners) untuk perubahan status dompet.
 * 
 * Deskripsi:
 * Menangani kejadian 'accountsChanged' saat pengguna mengganti akun, 
 * dan 'chainChanged' saat pengguna mengganti jaringan blockchain.
 */
function setupWalletListeners() {
    // Hapus listener lama untuk mencegah duplikasi
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);

    // Tambahkan listener baru
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

}

/**
 * Menangani perubahan akun yang aktif pada MetaMask.
 * 
 * @param {string[]} accounts - Kumpulan alamat akun yang baru.
 * 
 * Deskripsi:
 * Memperbarui status aplikasi berdasarkan akun yang baru dipilih atau 
 * mereset status jika tidak ada akun yang terhubung.
 */
async function handleAccountsChanged(accounts) {

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
 * Menangani perubahan jaringan blockchain pada MetaMask.
 * 
 * @param {string} chainId - ID jaringan baru dalam format heksadesimal.
 * 
 * Deskripsi:
 * Memvalidasi apakah jaringan baru sesuai dengan konfigurasi Sepolia 
 * dan memicu pembaharuan antarmuka pengguna.
 */
async function handleChainChanged(chainId) {

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
        console.warn('Peringatan: Jaringan tidak sesuai. Harap gunakan jaringan Sepolia.');
    }
}


// FUNGSI UTILITAS


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
 * Melakukan percobaan penyambungan kembali ke dompet jika sesi sebelumnya pernah tercatat.
 * 
 * Deskripsi:
 * Fungsi ini dijalankan secara otomatis saat halaman pertama kali dimuat untuk memastikan 
 * kesinambungan sesi koneksi pengguna tanpa harus memicu jendela sembul kembali.
 */
async function tryReconnect() {
    try {
        if (!isMetaMaskInstalled()) return false;

        // Cek akun yang sudah terkoneksi (tanpa popup)
        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });

        if (accounts.length > 0) {
            await connectWallet();
            return true;
        }

        return false;

    } catch (error) {
        console.error('Gagal menyambungkan kembali dompet:', error);
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
        console.error('Gagal mengambil saldo akun:', error);
        return '0';
    }
}

/**
 * Ekspor fungsi dompet ke lingkup global.
 */
window.DonaWallet = {
    // Koneksi
    connectWallet,
    disconnectWallet,
    tryReconnect,

    // Akses Status
    getWalletAddress,
    isWalletConnected,
    getSigner,
    getProvider,
    getBalance,

    // Jaringan
    checkNetwork,
    switchToSepolia,

    // Utilitas
    isMetaMaskInstalled,
    isAdmin,
    formatAddress,

    // Status Mentah (untuk keperluan debugging)
    getState: () => ({ ...WalletState })
};

