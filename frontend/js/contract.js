/**
 * @file contract.js
 * @description Modul untuk interaksi dengan Smart Contract Donachain
 * 
 * FILE INI MENANGANI:
 * 1. Inisialisasi instance kontrak
 * 2. Membaca data dari blockchain (view functions)
 * 3. Menulis data ke blockchain (write functions)
 * 4. Format data dari/ke kontrak
 * 
 * DEPENDENCY:
 * - config.js (alamat dan ABI kontrak)
 * - wallet.js (provider dan signer)
 * - ethers.js (dari CDN)
 * 
 * @author Donachain Team
 */

// ============================================
// CONTRACT INSTANCES - Instance Kontrak
// ============================================

/**
 * Instance kontrak yang akan digunakan
 * 
 * PENJELASAN:
 * - readContract: Kontrak dengan provider (hanya baca)
 * - writeContract: Kontrak dengan signer (bisa tulis)
 */
let donationManagerRead = null;
let donationManagerWrite = null;
let nftContractRead = null;
let nftContractWrite = null;
let votingContractRead = null;
let votingContractWrite = null;

// ============================================
// INITIALIZATION - Inisialisasi
// ============================================

/**
 * Inisialisasi kontrak untuk operasi baca (view)
 * 
 * PENJELASAN:
 * Kontrak read menggunakan provider publik sehingga
 * bisa digunakan bahkan tanpa koneksi wallet.
 * Ini untuk menampilkan data kampanye, donasi, dll.
 */
async function initReadContracts() {
    try {
        const config = window.DonaConfig;

        // Buat provider dari RPC publik
        const provider = new ethers.JsonRpcProvider(
            config.NETWORK_CONFIG.rpcUrls[0]
        );

        // Inisialisasi DonationManager (read only)
        donationManagerRead = new ethers.Contract(
            config.DONATION_MANAGER_ADDRESS,
            config.DONATION_MANAGER_ABI,
            provider
        );

        // Inisialisasi NFT Contract (read only)
        nftContractRead = new ethers.Contract(
            config.NFT_ADDRESS,
            config.NFT_ABI,
            provider
        );

        // Inisialisasi Voting Contract (read only)
        votingContractRead = new ethers.Contract(
            config.VOTING_ADDRESS,
            config.VOTING_ABI,
            provider
        );

        console.log('✅ Read contracts initialized');
        return true;

    } catch (error) {
        console.error('❌ Gagal inisialisasi read contracts:', error);
        return false;
    }
}

/**
 * Inisialisasi kontrak untuk operasi tulis
 * 
 * @returns {Promise<boolean>} true jika berhasil
 * 
 * PENJELASAN:
 * Kontrak write membutuhkan signer dari wallet yang terkoneksi.
 * Signer digunakan untuk menandatangani transaksi.
 * 
 * PENTING: Pastikan wallet sudah terkoneksi sebelum memanggil ini!
 */
async function initWriteContracts() {
    try {
        const config = window.DonaConfig;
        const wallet = window.DonaWallet;

        // Cek wallet terkoneksi
        if (!wallet.isWalletConnected()) {
            throw new Error('Wallet belum terkoneksi');
        }

        const signer = wallet.getSigner();

        // Inisialisasi DonationManager (read + write)
        donationManagerWrite = new ethers.Contract(
            config.DONATION_MANAGER_ADDRESS,
            config.DONATION_MANAGER_ABI,
            signer
        );

        // Inisialisasi NFT Contract (read + write)
        nftContractWrite = new ethers.Contract(
            config.NFT_ADDRESS,
            config.NFT_ABI,
            signer
        );

        // Inisialisasi Voting Contract (write)
        votingContractWrite = new ethers.Contract(
            config.VOTING_ADDRESS,
            config.VOTING_ABI,
            signer
        );

        console.log('✅ Write contracts initialized');
        return true;

    } catch (error) {
        console.error('❌ Gagal inisialisasi write contracts:', error);
        return false;
    }
}

// ============================================
// READ FUNCTIONS - Fungsi Baca Data
// ============================================

/**
 * Ambil semua kampanye dari blockchain
 * 
 * @returns {Promise<Array>} Array kampanye yang sudah diformat
 * 
 * PENJELASAN:
 * Memanggil fungsi getAllCampaigns() di smart contract.
 * Data dikembalikan dalam format yang lebih mudah digunakan frontend.
 */
async function getCampaigns() {
    try {
        await ensureReadContract();

        const campaigns = await donationManagerRead.getAllCampaigns();

        // Format data untuk frontend
        return campaigns.map(formatCampaign);

    } catch (error) {
        console.error('❌ Gagal mengambil kampanye:', error);
        throw error;
    }
}

/**
 * Ambil kampanye yang masih aktif saja
 * 
 * @returns {Promise<Array>} Array kampanye aktif
 */
async function getActiveCampaigns() {
    try {
        await ensureReadContract();

        const campaigns = await donationManagerRead.getActiveCampaigns();
        return campaigns.map(formatCampaign);

    } catch (error) {
        console.error('❌ Gagal mengambil kampanye aktif:', error);
        throw error;
    }
}

/**
 * Ambil detail satu kampanye berdasarkan ID
 * 
 * @param {number} campaignId - ID kampanye
 * @returns {Promise<object>} Data kampanye
 */
async function getCampaignById(campaignId) {
    try {
        await ensureReadContract();

        const campaign = await donationManagerRead.getCampaign(campaignId);
        return formatCampaign(campaign);

    } catch (error) {
        console.error('❌ Gagal mengambil kampanye:', error);
        throw error;
    }
}

/**
 * Ambil semua donasi untuk halaman audit
 * 
 * @returns {Promise<Array>} Array semua donasi
 * 
 * PENJELASAN:
 * Mengambil txHash yang sebenarnya dari event logs blockchain,
 * bukan dari storage kontrak yang hanya menyimpan blockhash.
 */
async function getAllDonations() {
    try {
        await ensureReadContract();

        const donations = await donationManagerRead.getAllDonations();

        // Ambil event logs untuk mendapatkan txHash asli
        const filter = donationManagerRead.filters.DonationReceived();
        const events = await donationManagerRead.queryFilter(filter);

        // Buat mapping donationId -> txHash dari event logs
        const txHashMap = {};
        events.forEach(event => {
            const donationId = Number(event.args[0]); // args[0] = donationId
            txHashMap[donationId] = event.transactionHash;
        });

        // Format donasi dengan txHash yang benar dari event
        return donations.map(donation => {
            const formatted = formatDonation(donation);
            // Override txHash dengan yang dari event log
            const realTxHash = txHashMap[formatted.id] || formatted.txHash;
            formatted.txHash = realTxHash;
            formatted.txUrl = window.DonaConfig.getEtherscanTxUrl(realTxHash);
            return formatted;
        });

    } catch (error) {
        console.error('❌ Gagal mengambil donasi:', error);
        throw error;
    }
}

/**
 * Ambil donasi untuk kampanye tertentu
 * 
 * @param {number} campaignId - ID kampanye
 * @returns {Promise<Array>} Array donasi untuk kampanye tersebut
 * 
 * PENJELASAN:
 * Sama seperti getAllDonations, txHash diambil dari event logs.
 */
async function getDonationsForCampaign(campaignId) {
    try {
        await ensureReadContract();

        const donations = await donationManagerRead.getDonationsForCampaign(campaignId);

        // Ambil event logs untuk txHash asli
        const filter = donationManagerRead.filters.DonationReceived();
        const events = await donationManagerRead.queryFilter(filter);

        const txHashMap = {};
        events.forEach(event => {
            const donationId = Number(event.args[0]);
            txHashMap[donationId] = event.transactionHash;
        });

        return donations.map(donation => {
            const formatted = formatDonation(donation);
            const realTxHash = txHashMap[formatted.id] || formatted.txHash;
            formatted.txHash = realTxHash;
            formatted.txUrl = window.DonaConfig.getEtherscanTxUrl(realTxHash);
            return formatted;
        });

    } catch (error) {
        console.error('❌ Gagal mengambil donasi kampanye:', error);
        throw error;
    }
}

/**
 * Ambil riwayat donasi untuk user tertentu
 * 
 * @param {string} address - Alamat donatur
 * @returns {Promise<Array>} Array donasi user
 * 
 * PENJELASAN:
 * Digunakan untuk halaman profil user.
 * txHash diambil dari event logs.
 */
async function getDonationsByDonor(address) {
    try {
        await ensureReadContract();

        const donations = await donationManagerRead.getDonationsByDonor(address);

        // Ambil event logs untuk txHash asli
        const filter = donationManagerRead.filters.DonationReceived();
        const events = await donationManagerRead.queryFilter(filter);

        const txHashMap = {};
        events.forEach(event => {
            const donationId = Number(event.args[0]);
            txHashMap[donationId] = event.transactionHash;
        });

        return donations.map(donation => {
            const formatted = formatDonation(donation);
            const realTxHash = txHashMap[formatted.id] || formatted.txHash;
            formatted.txHash = realTxHash;
            formatted.txUrl = window.DonaConfig.getEtherscanTxUrl(realTxHash);
            return formatted;
        });

    } catch (error) {
        console.error('❌ Gagal mengambil donasi user:', error);
        throw error;
    }
}

/**
 * Ambil semua pengeluaran untuk halaman audit
 * 
 * @returns {Promise<Array>} Array semua pengeluaran
 * 
 * PENJELASAN:
 * Mencoba mengambil txHash dari event logs, tapi jika gagal tetap
 * mengembalikan data dengan txHash dari storage.
 */
async function getAllExpenses() {
    try {
        await ensureReadContract();

        const expenses = await donationManagerRead.getAllExpenses();

        // Try to get real txHash from events, but don't fail if it doesn't work
        let txHashMap = {};
        try {
            const filter = donationManagerRead.filters.FundsWithdrawnWithLog();
            if (filter) {
                const events = await donationManagerRead.queryFilter(filter);
                events.forEach(event => {
                    const expenseId = Number(event.args[0]);
                    txHashMap[expenseId] = event.transactionHash;
                });
            }
        } catch (eventError) {
            console.warn('⚠️ Could not fetch FundsWithdrawnWithLog events, using stored txHash:', eventError.message);
        }

        // Format expense dengan txHash dari event jika ada, atau dari storage
        return expenses.map(expense => {
            const formatted = formatExpense(expense);
            // Override txHash jika ada dari event log
            if (txHashMap[formatted.id]) {
                formatted.txHash = txHashMap[formatted.id];
                formatted.txUrl = window.DonaConfig.getEtherscanTxUrl(formatted.txHash);
            }
            return formatted;
        });

    } catch (error) {
        console.error('❌ Gagal mengambil pengeluaran:', error);
        throw error;
    }
}

/**
 * Ambil leaderboard top donatur
 * 
 * @param {number} count - Jumlah top donatur (default: 5)
 * @returns {Promise<Array>} Array {address, amount} top donatur
 */
async function getLeaderboard(count = 5) {
    try {
        await ensureReadContract();

        const [addresses, amounts] = await donationManagerRead.getLeaderboard(count);

        // Gabungkan addresses dan amounts
        const leaderboard = [];
        for (let i = 0; i < addresses.length; i++) {
            if (addresses[i] !== ethers.ZeroAddress) {
                // Fetch tx count for this donor
                let txCount = 0;
                try {
                    // We can use the contract function directly to get array length
                    const donorDonations = await donationManagerRead.getDonationsByDonor(addresses[i]);
                    txCount = donorDonations.length;
                } catch (e) {
                    console.warn(`Could not fetch tx count for ${addresses[i]}`, e);
                }

                leaderboard.push({
                    rank: i + 1,
                    address: addresses[i],
                    amount: ethers.formatEther(amounts[i]),
                    amountWei: amounts[i].toString(),
                    txCount: txCount
                });
            }
        }

        return leaderboard;

    } catch (error) {
        console.error('❌ Gagal mengambil leaderboard:', error);
        throw error;
    }
}

/**
 * Ambil statistik platform
 * 
 * @returns {Promise<object>} Object statistik
 */
async function getStats() {
    try {
        await ensureReadContract();

        const stats = await donationManagerRead.getStats();

        return {
            totalCampaigns: Number(stats.totalCampaigns),
            activeCampaigns: Number(stats.activeCampaigns),
            totalDonations: Number(stats.totalDonations),
            totalReceived: ethers.formatEther(stats.totalReceived),
            totalReceivedWei: stats.totalReceived.toString(),
            totalSpent: ethers.formatEther(stats.totalSpent),
            totalSpentWei: stats.totalSpent.toString(),
            contractBalance: ethers.formatEther(stats.contractBalance),
            contractBalanceWei: stats.contractBalance.toString()
        };

    } catch (error) {
        console.error('❌ Gagal mengambil statistik:', error);
        throw error;
    }
}

// ============================================
// NFT READ FUNCTIONS - Fungsi Baca NFT
// ============================================

/**
 * Ambil NFT yang dimiliki user
 * 
 * @param {string} address - Alamat user
 * @returns {Promise<Array>} Array NFT dengan metadata
 * 
 * PENJELASAN:
 * Mengambil semua token ID yang dimiliki user,
 * lalu ambil metadata masing-masing token.
 */
async function getNFTsByOwner(address) {
    try {
        await ensureReadContract();

        // Ambil token IDs
        const tokenIds = await nftContractRead.getTokensByDonor(address);

        // Ambil detail untuk setiap token
        const nfts = await Promise.all(
            tokenIds.map(async (tokenId) => {
                const detail = await nftContractRead.getDonationDetail(tokenId);
                const tokenURI = await nftContractRead.tokenURI(tokenId);

                return {
                    tokenId: Number(tokenId),
                    donor: detail.donor,
                    amount: ethers.formatEther(detail.amount),
                    amountWei: detail.amount.toString(),
                    campaignId: Number(detail.campaignId),
                    campaignTitle: detail.campaignTitle,
                    timestamp: Number(detail.timestamp),
                    date: new Date(Number(detail.timestamp) * 1000).toLocaleString('id-ID'),
                    txHash: detail.txHash,
                    tokenURI: tokenURI
                };
            })
        );

        return nfts;

    } catch (error) {
        console.error('❌ Gagal mengambil NFT:', error);
        throw error;
    }
}

/**
 * Ambil total NFT yang sudah di-mint
 * 
 * @returns {Promise<number>} Total supply NFT
 */
async function getNFTTotalSupply() {
    try {
        await ensureReadContract();

        const totalSupply = await nftContractRead.totalSupply();
        return Number(totalSupply);

    } catch (error) {
        console.error('❌ Gagal mengambil total supply NFT:', error);
        throw error;
    }
}

// ============================================
// VOTING FUNCTIONS - Fungsi Voting
// ============================================

/**
 * Vote kampanye menggunakan NFT
 * 
 * @param {number} campaignId - ID kampanye
 * @param {number} tokenId - ID NFT yang digunakan
 * @returns {Promise<object>} Receipt transaksi
 */
async function voteForCampaign(campaignId, tokenId) {
    try {
        await ensureWriteContract();

        if (!votingContractWrite) {
            console.warn('⚠️ Voting contract not initialized, attempting re-init...');
            await initWriteContracts();
            if (!votingContractWrite) {
                throw new Error('Voting contract failed to initialize. Please checking your configuration and wallet connection.');
            }
        }

        console.log(`🗳️ Voting campaign #${campaignId} dengan NFT #${tokenId}...`);

        const tx = await votingContractWrite.vote(campaignId, tokenId);

        console.log('⏳ Menunggu konfirmasi voting...', tx.hash);

        // Add timeout for tx.wait() (60 seconds)
        const waitPromise = tx.wait();
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.warn('⚠️ Transaction verification timed out, but likely sent.');
                resolve({ status: 1, hash: tx.hash, timedOut: true }); // Mock receipt
            }, 60000);
        });

        const receipt = await Promise.race([waitPromise, timeoutPromise]);

        console.log('✅ Vote berhasil (atau terkirim)!');

        return {
            success: receipt.status === 1,
            hash: receipt.hash || tx.hash,
            timedOut: receipt.timedOut
        };
    } catch (error) {
        console.error('❌ Gagal melakukan voting:', error);

        let errorMessage = 'Gagal melakukan voting';

        // Try to parse contract revert reason
        if (error.reason) {
            errorMessage = error.reason;
        } else if (error.data && error.data.message) {
            errorMessage = error.data.message;
        } else if (error.message) {
            // Clean up generic Metamask errors
            if (error.message.includes('user rejected')) {
                errorMessage = 'Transaksi dibatalkan oleh user';
            } else if (error.message.includes('NFT ini bukan tiket')) {
                errorMessage = 'NFT ini bukan untuk kampanye ini';
            } else if (error.message.includes('bukan pemilik')) {
                errorMessage = 'Anda bukan pemilik NFT ini';
            } else if (error.message.includes('sudah digunakan')) {
                errorMessage = 'NFT ini sudah digunakan voting';
            } else {
                // Try to strip technical details
                errorMessage = error.message.split('(')[0];
            }
        }

        console.error('Parsed error:', errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Ambil jumlah vote kampanye
 * 
 * @param {number} campaignId - ID kampanye
 * @returns {Promise<number>} Jumlah vote
 */
async function getCampaignVotes(campaignId) {
    try {
        await ensureReadContract();
        const votes = await votingContractRead.getVotes(campaignId);
        return Number(votes);
    } catch (error) {
        console.error('❌ Gagal mengambil jumlah vote:', error);
        return 0; // Return 0 if failed (or contract not deployed yet)
    }
}

/**
 * Cek apakah NFT sudah digunakan untuk vote
 * 
 * @param {number} tokenId - ID NFT
 * @returns {Promise<boolean>} true jika sudah vote
 */
async function checkHasVoted(tokenId) {
    try {
        await ensureReadContract();
        const hasVoted = await votingContractRead.hasVoted(tokenId);
        return hasVoted;
    } catch (error) {
        console.error('❌ Gagal cek status vote:', error);
        return false;
    }
}

/**
 * Ambil statistik voting (Ranking & Hari Ini)
 * 
 * @param {number} campaignId - ID kampanye saat ini
 * @returns {Promise<object>} { ranking, todayVotes }
 */
async function getVoteStats(campaignId) {
    try {
        await ensureReadContract();

        // 1. Get all votes for all campaigns to determine rank
        // Note: In a real production app with many campaigns, this should be indexed off-chain.
        // For now, we iterate through active campaigns.
        const campaigns = await donationManagerRead.getActiveCampaigns();
        const voteCounts = [];

        for (const c of campaigns) {
            const id = Number(c.id);
            const votes = await votingContractRead.getVotes(id);
            voteCounts.push({ id, votes: Number(votes) });
        }

        // Sort by votes (descending)
        voteCounts.sort((a, b) => b.votes - a.votes);

        // Find rank (1-based index)
        const rankIndex = voteCounts.findIndex(v => v.id === Number(campaignId));
        const ranking = rankIndex !== -1 ? rankIndex + 1 : '-';

        // 2. Get today's votes from events
        // Filter events for this campaign
        const filter = votingContractRead.filters.Voted(Number(campaignId));
        const events = await votingContractRead.queryFilter(filter);

        const now = Math.floor(Date.now() / 1000);
        const startOfDay = now - (now % 86400); // Midnight UTC (simplification)

        // We need block timestamps for events, but getting block for each event is heavy.
        // Optimization: Assume events within last N blocks are today? No, imprecise.
        // Better: Fetch block for each event? Yes, but limit to recent events.

        let todayVotes = 0;
        // Optimization: Only check last 100 events to save RPC calls
        const recentEvents = events.slice(-100);

        for (const event of recentEvents) {
            const block = await event.getBlock();
            if (block.timestamp >= startOfDay) {
                todayVotes++;
            }
        }

        return { ranking, todayVotes };

    } catch (error) {
        console.error('❌ Gagal mengambil statistik vote:', error);
        return { ranking: '-', todayVotes: 0 };
    }
}

// ============================================
// WRITE FUNCTIONS - Fungsi Tulis Data
// ============================================

/**
 * Kirim donasi ke kampanye
 * 
 * @param {number} campaignId - ID kampanye
 * @param {string} amountEth - Jumlah donasi dalam ETH (string)
 * @returns {Promise<object>} Receipt transaksi
 * 
 * PENJELASAN DETAIL:
 * 1. Konversi jumlah ETH ke wei
 * 2. Panggil fungsi donate() di kontrak dengan value
 * 3. Tunggu transaksi di-mine
 * 4. Return receipt dengan info transaksi
 * 
 * CATATAN:
 * - Fungsi ini membutuhkan wallet terkoneksi
 * - MetaMask akan memunculkan popup konfirmasi
 * - Jika donasi >= 0.01 ETH, NFT akan otomatis di-mint
 */
async function donate(campaignId, amountEth) {
    try {
        await ensureWriteContract();

        // Konversi ETH ke wei
        const amountWei = ethers.parseEther(amountEth);

        console.log(`💰 Mengirim donasi ${amountEth} ETH ke kampanye #${campaignId}...`);

        // Panggil fungsi donate dengan value
        const tx = await donationManagerWrite.donate(campaignId, {
            value: amountWei
        });

        console.log('⏳ Menunggu konfirmasi transaksi...', tx.hash);

        // Tunggu transaksi selesai
        const receipt = await tx.wait();

        console.log('✅ Donasi berhasil!', receipt);

        return {
            success: true,
            hash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };

    } catch (error) {
        console.error('❌ Gagal mengirim donasi:', error);

        // Parse error message
        let message = 'Gagal mengirim donasi';
        if (error.code === 'ACTION_REJECTED') {
            message = 'Transaksi dibatalkan oleh user';
        } else if (error.reason) {
            message = error.reason;
        }

        throw new Error(message);
    }
}

/**
 * Buat kampanye baru dengan deadline (admin only)
 * 
 * @param {string} title - Judul kampanye
 * @param {string} description - Deskripsi kampanye
 * @param {string} imageCID - IPFS CID untuk gambar
 * @param {string} targetAmountEth - Target dalam ETH
 * @param {number} deadline - Unix timestamp untuk deadline
 * @returns {Promise<object>} Receipt dan ID kampanye baru
 */
async function createCampaign(title, description, imageCID, targetAmountEth, deadline) {
    try {
        await ensureWriteContract();

        const targetWei = ethers.parseEther(targetAmountEth);

        console.log('📝 Membuat kampanye baru...');

        const tx = await donationManagerWrite.createCampaign(
            title,
            description,
            imageCID,
            targetWei,
            deadline
        );

        console.log('⏳ Menunggu konfirmasi...', tx.hash);

        const receipt = await tx.wait();

        // Parse event untuk ambil campaign ID
        const campaignId = receipt.logs[0]?.topics[1];

        console.log('✅ Kampanye berhasil dibuat!');

        return {
            success: true,
            hash: receipt.hash,
            campaignId: campaignId ? Number(campaignId) : null
        };

    } catch (error) {
        console.error('❌ Gagal membuat kampanye:', error);
        throw new Error(error.reason || 'Gagal membuat kampanye');
    }
}

/**
 * Tarik dana dengan catatan pengeluaran (MERGED FUNCTION - admin only)
 * 
 * @param {string} description - Deskripsi pengeluaran
 * @param {string} recipient - Alamat penerima
 * @param {string} amountEth - Jumlah dalam ETH
 * @param {number} campaignId - ID kampanye terkait (0 jika general)
 * @returns {Promise<object>} Receipt transaksi
 * 
 * PENJELASAN:
 * Fungsi ini menggabungkan logExpense() dan withdrawFunds().
 * Setiap penarikan otomatis tercatat sebagai expense untuk transparansi.
 */
async function withdrawWithLog(description, recipient, amountEth, campaignId = 0) {
    try {
        await ensureWriteContract();

        const amountWei = ethers.parseEther(amountEth);

        console.log('💸 Menarik dana dengan catatan...');

        const tx = await donationManagerWrite.withdrawWithLog(
            description,
            recipient,
            amountWei,
            campaignId
        );

        const receipt = await tx.wait();

        console.log('✅ Dana berhasil ditarik dan tercatat!');

        return {
            success: true,
            hash: receipt.hash
        };

    } catch (error) {
        console.error('❌ Gagal menarik dana:', error);
        throw new Error(error.reason || 'Gagal menarik dana');
    }
}

/**
 * Update status kampanye (admin only)
 * 
 * @param {number} campaignId - ID kampanye
 * @param {boolean} isActive - Status aktif baru
 * @returns {Promise<object>} Receipt transaksi
 */
async function updateCampaignStatus(campaignId, isActive) {
    try {
        await ensureWriteContract();

        console.log(`📝 Update status kampanye #${campaignId} ke ${isActive}...`);

        const tx = await donationManagerWrite.updateCampaignStatus(campaignId, isActive);
        const receipt = await tx.wait();

        console.log('✅ Status kampanye diupdate!');

        return {
            success: true,
            hash: receipt.hash
        };

    } catch (error) {
        console.error('❌ Gagal update status kampanye:', error);
        throw new Error(error.reason || 'Gagal update status kampanye');
    }
}

// ============================================
// DATA FORMATTING - Format Data
// ============================================

/**
 * Format data kampanye dari kontrak ke format frontend
 * 
 * @param {object} campaign - Data kampanye dari kontrak
 * @returns {object} Data kampanye yang sudah diformat
 */
function formatCampaign(campaign) {
    const config = window.DonaConfig;
    const target = ethers.formatEther(campaign.targetAmount);
    const raised = ethers.formatEther(campaign.totalRaised);
    const progress = parseFloat(target) > 0
        ? (parseFloat(raised) / parseFloat(target)) * 100
        : 0;

    // Hitung sisa waktu deadline
    const deadline = Number(campaign.deadline);
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > deadline;
    const remainingDays = isExpired ? 0 : Math.ceil((deadline - now) / 86400);

    return {
        id: Number(campaign.id),
        title: campaign.title,
        description: campaign.description,
        imageCID: campaign.imageCID,
        imageUrl: config.getIpfsUrl(campaign.imageCID),
        targetAmount: target,
        targetAmountWei: campaign.targetAmount.toString(),
        totalRaised: raised,
        totalRaisedWei: campaign.totalRaised.toString(),
        progress: Math.min(progress, 100).toFixed(1),
        isActive: campaign.isActive,
        createdAt: Number(campaign.createdAt),
        createdDate: new Date(Number(campaign.createdAt) * 1000).toLocaleString('id-ID'),
        deadline: deadline,
        deadlineDate: new Date(deadline * 1000).toLocaleString('id-ID'),
        isExpired: isExpired,
        remainingDays: remainingDays,
        creator: campaign.creator
    };
}

/**
 * Format data donasi dari kontrak ke format frontend
 * 
 * @param {object} donation - Data donasi dari kontrak
 * @returns {object} Data donasi yang sudah diformat
 */
function formatDonation(donation) {
    const config = window.DonaConfig;

    // Convert bytes32 txHash to hex string
    const txHashHex = typeof donation.txHash === 'string'
        ? donation.txHash
        : donation.txHash;

    return {
        id: Number(donation.id),
        donor: donation.donor,
        donorShort: window.DonaWallet.formatAddress(donation.donor),
        campaignId: Number(donation.campaignId),
        amount: ethers.formatEther(donation.amount),
        amountWei: donation.amount.toString(),
        timestamp: Number(donation.timestamp),
        date: new Date(Number(donation.timestamp) * 1000).toLocaleString('id-ID'),
        timeAgo: getTimeAgo(Number(donation.timestamp)),
        txHash: txHashHex,
        txUrl: config.getEtherscanTxUrl(txHashHex),
        nftMinted: donation.nftMinted
    };
}

/**
 * Format data pengeluaran dari kontrak ke format frontend
 * 
 * @param {object} expense - Data pengeluaran dari kontrak
 * @returns {object} Data pengeluaran yang sudah diformat
 */
function formatExpense(expense) {
    const config = window.DonaConfig;

    const txHashHex = typeof expense.txHash === 'string'
        ? expense.txHash
        : expense.txHash;

    return {
        id: Number(expense.id),
        description: expense.description,
        amount: ethers.formatEther(expense.amount),
        amountWei: expense.amount.toString(),
        recipient: expense.recipient,
        recipientShort: window.DonaWallet.formatAddress(expense.recipient),
        timestamp: Number(expense.timestamp),
        date: new Date(Number(expense.timestamp) * 1000).toLocaleString('id-ID'),
        txHash: txHashHex,
        txUrl: config.getEtherscanTxUrl(txHashHex),
        campaignId: Number(expense.campaignId)
    };
}

/**
 * Hitung waktu yang sudah berlalu (time ago)
 * 
 * @param {number} timestamp - Unix timestamp
 * @returns {string} String waktu yang sudah berlalu
 */
function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;

    return new Date(timestamp * 1000).toLocaleDateString('id-ID');
}

// ============================================
// HELPER FUNCTIONS - Fungsi Pembantu
// ============================================

/**
 * Pastikan read contract sudah diinisialisasi
 */
async function ensureReadContract() {
    if (!donationManagerRead) {
        await initReadContracts();
    }
}

/**
 * Pastikan write contract sudah diinisialisasi
 */
async function ensureWriteContract() {
    if (!donationManagerWrite) {
        const success = await initWriteContracts();
        if (!success) {
            throw new Error('Gagal inisialisasi kontrak. Pastikan wallet terkoneksi.');
        }
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export semua fungsi contract ke global scope
 */
window.DonaContract = {
    // Initialization
    initReadContracts,
    initWriteContracts,

    // Campaign Read
    getCampaigns,
    getAllCampaigns: getCampaigns, // Alias for campaigns.html
    getActiveCampaigns,
    getCampaignById,

    // Donation Read
    getAllDonations,
    getDonationsForCampaign,
    getDonationsByDonor,

    // Expense Read
    getAllExpenses,
    getExpensesForCampaign: async function (campaignId) {
        // Filter expenses for a specific campaign
        const allExpenses = await getAllExpenses();
        return allExpenses.filter(e => e.campaignId === campaignId);
    },

    // Stats Read
    getLeaderboard,
    getStats,

    // NFT Read
    getNFTsByOwner,
    getNFTTotalSupply,

    // Write Functions
    donate,
    createCampaign,
    withdrawWithLog,
    updateCampaignStatus,

    // Voting Functions
    voteForCampaign,
    getCampaignVotes,
    checkHasVoted,
    getVoteStats,

    // Utilities
    formatCampaign,
    formatDonation,
    formatExpense,
    getTimeAgo
};

console.log('✅ Donachain Contract module loaded successfully');
