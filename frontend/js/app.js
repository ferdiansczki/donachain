/**
 * @file app.js
 * @description Main Application Orchestrator - Modul utama yang mengorkestrasi semua modul lainnya
 * 
 * FILE INI MENANGANI:
 * 1. Inisialisasi aplikasi
 * 2. Event listeners untuk interaksi user
 * 3. Koordinasi antar modul (wallet, contract, ui)
 * 4. Page-specific initialization
 * 
 * DEPENDENCY:
 * - config.js (konfigurasi)
 * - wallet.js (koneksi wallet)
 * - contract.js (interaksi kontrak)
 * - ui.js (manipulasi DOM)
 * 
 * @author Donachain Team
 */

// ============================================
// APPLICATION STATE - State Aplikasi
// ============================================

/**
 * State global aplikasi
 */
const AppState = {
    currentPage: null,      // Halaman saat ini
    isInitialized: false,   // Status inisialisasi
    currentCampaignId: null // ID kampanye (untuk halaman detail)
};

// ============================================
// INITIALIZATION - Inisialisasi
// ============================================

/**
 * Inisialisasi aplikasi saat DOM loaded
 * 
 * PENJELASAN FLOW:
 * 1. Deteksi halaman saat ini
 * 2. Inisialisasi read contracts
 * 3. Setup event listeners global
 * 4. Coba reconnect wallet (jika sudah pernah connect)
 * 5. Load data sesuai halaman
 */
async function initApp() {
    try {
        console.log('🚀 Initializing Donachain App...');

        // EXPERIMENTAL: Optimistic UI Update untuk mencegah flickering
        // Jika ada local storage flag, ubah UI seolah-olah sudah connect
        // sebelum proses async connect yang sebenarnya berjalan
        if (localStorage.getItem('dona_wallet_connected') === 'true') {
            const connectBtn = document.getElementById('connect-wallet-btn');
            const walletInfo = document.getElementById('wallet-info');

            if (connectBtn && walletInfo) {
                // Sembunyikan tombol connect
                connectBtn.classList.add('hidden');
                // Tampilkan wallet info tapi kosong/loading dulu agar layout stabil
                walletInfo.classList.remove('hidden');
                // Opsional: set text loading
                const walletAddress = document.getElementById('wallet-address');
                if (walletAddress) walletAddress.textContent = 'Menghubungkan...';
            }
        }

        // Deteksi halaman
        detectCurrentPage();

        // Inisialisasi read contracts
        await window.DonaContract.initReadContracts();

        // Setup event listeners global
        setupGlobalEventListeners();

        // Coba reconnect wallet
        await window.DonaWallet.tryReconnect();

        // Update UI berdasarkan status wallet
        updateWalletStatus();

        // Load data sesuai halaman
        await loadPageData();

        AppState.isInitialized = true;
        console.log('✅ Donachain App initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        window.DonaUI.showToast('Gagal memuat aplikasi. Silakan refresh.', 'error');
    }
}

/**
 * Deteksi halaman saat ini berdasarkan URL
 */
function detectCurrentPage() {
    const path = window.location.pathname;
    // Ambil bagian terakhir dari URL
    // Contoh: /campaigns.html -> campaigns.html
    // Contoh: /campaigns -> campaigns
    let filename = path.split('/').pop();

    // Hapus query string jika ada (antisipasi jika ada di pathname)
    filename = filename.split('?')[0];

    // Jika kosong atau index variants, set ke home
    if (filename === '' || filename === 'index.html' || filename === 'index') {
        AppState.currentPage = 'home';
    } 
    // Handle detail page (with or without .html)
    else if (filename === 'detail.html' || filename === 'detail') {
        AppState.currentPage = 'detail';
        // Ambil campaign ID dari URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        AppState.currentCampaignId = parseInt(urlParams.get('id')) || null;
    } 
    // Handle campaigns page
    else if (filename === 'campaigns.html' || filename === 'campaigns') {
        AppState.currentPage = 'campaigns';
    } 
    // Handle audit page
    else if (filename === 'audit.html' || filename === 'audit') {
        AppState.currentPage = 'audit';
    } 
    // Handle audit-detail page
    else if (filename === 'audit-detail.html' || filename === 'audit-detail') {
        AppState.currentPage = 'audit-detail';
        // Ambil tab dari URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        AppState.currentTab = urlParams.get('tab') || 'all';
    } 
    // Handle profile page
    else if (filename === 'profile.html' || filename === 'profile') {
        AppState.currentPage = 'profile';
    } 
    // Handle admin page
    else if (filename === 'admin.html' || filename === 'admin') {
        AppState.currentPage = 'admin';
    } 
    // Handle leaderboard page
    else if (filename === 'leaderboard.html' || filename === 'leaderboard') {
        AppState.currentPage = 'leaderboard';
    } 
    // Handle about page
    else if (filename === 'about.html' || filename === 'about') {
        AppState.currentPage = 'about';
    }

    console.log('📍 Current page detected:', AppState.currentPage, '(Filename:', filename, ')');
}

/**
 * Setup event listeners global
 * 
 * PENJELASAN:
 * Event listeners yang berlaku di semua halaman
 */
function setupGlobalEventListeners() {
    // Initialize Mobile Menu
    window.DonaUI.initMobileMenu();

    // Connect Wallet Button
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', handleConnectWallet);
    }

    // Disconnect Button
    const disconnectBtn = document.getElementById('disconnect-btn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', handleDisconnectWallet);
    }

    // Profile dropdown toggle
    const walletInfo = document.getElementById('wallet-info');
    if (walletInfo) {
        walletInfo.addEventListener('click', () => window.DonaUI.toggleDropdown());
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const walletInfo = document.getElementById('wallet-info');
        const dropdown = document.getElementById('wallet-dropdown');
        if (walletInfo && dropdown && !walletInfo.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Listen for wallet events
    window.addEventListener('walletAccountChanged', handleAccountChanged);
    window.addEventListener('walletNetworkChanged', handleNetworkChanged);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);

    // Page-specific event listeners
    setupPageEventListeners();
}

/**
 * Setup event listeners spesifik per halaman
 */
function setupPageEventListeners() {
    switch (AppState.currentPage) {
        case 'detail':
            setupDetailPageListeners();
            break;
        case 'campaigns':
            setupCampaignsPageListeners();
            break;
        case 'audit-detail':
            setupAuditDetailPageListeners();
            break;
        case 'admin':
            setupAdminPageListeners();
            break;
    }
}

/**
 * Setup event listeners untuk halaman detail
 */
function setupDetailPageListeners() {
    // Form donasi
    const donateForm = document.getElementById('donate-form');
    if (donateForm) {
        donateForm.addEventListener('submit', handleDonateSubmit);
    }

    // Quick amount buttons
    const quickAmountBtns = document.querySelectorAll('.quick-amount-btn');
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            const amountInput = document.getElementById('donate-amount');
            if (amountInput) {
                amountInput.value = amount;
            }
        });
    });

    // Tab switching (Donations / Audit / Voting)
    const tabDonations = document.getElementById('tab-donations');
    const tabAudit = document.getElementById('tab-audit');
    const tabVoting = document.getElementById('tab-voting');

    const donationsContent = document.getElementById('donations-tab-content');
    const auditContent = document.getElementById('audit-tab-content');
    const votingContent = document.getElementById('voting-tab-content');

    if (tabDonations && tabAudit && tabVoting) {
        tabDonations.addEventListener('click', () => {
            setActiveTab(tabDonations, [tabAudit, tabVoting]);
            showContent(donationsContent, [auditContent, votingContent]);
        });

        tabAudit.addEventListener('click', () => {
            setActiveTab(tabAudit, [tabDonations, tabVoting]);
            showContent(auditContent, [donationsContent, votingContent]);
            // Load campaign audit data
            loadCampaignAuditData();
        });

        tabVoting.addEventListener('click', () => {
            setActiveTab(tabVoting, [tabDonations, tabAudit]);
            showContent(votingContent, [donationsContent, auditContent]);
        });
    }

    // Helper for tabs
    function setActiveTab(active, others) {
        active.classList.add('active');
        others.forEach(t => t.classList.remove('active'));
    }

    function showContent(show, hides) {
        show.classList.remove('hidden');
        hides.forEach(h => h.classList.add('hidden'));
    }

    // Audit sub-tabs (Dana Masuk / Dana Keluar)
    const subTabIn = document.getElementById('audit-sub-tab-in');
    const subTabOut = document.getElementById('audit-sub-tab-out');
    const incomingContent = document.getElementById('audit-incoming-content');
    const outgoingContent = document.getElementById('audit-outgoing-content');

    if (subTabIn && subTabOut) {
        subTabIn.addEventListener('click', () => {
            subTabIn.classList.add('active');
            subTabOut.classList.remove('active');
            if (incomingContent) incomingContent.classList.remove('hidden');
            if (outgoingContent) outgoingContent.classList.add('hidden');
        });

        subTabOut.addEventListener('click', () => {
            subTabOut.classList.add('active');
            subTabIn.classList.remove('active');
            if (outgoingContent) outgoingContent.classList.remove('hidden');
            if (incomingContent) incomingContent.classList.add('hidden');
        });
    }

    // Vote Button
    const voteBtn = document.getElementById('vote-btn');
    if (voteBtn) {
        voteBtn.addEventListener('click', handleVoteClick);
    }
}

/**
 * Setup event listeners untuk halaman campaigns
 */
function setupCampaignsPageListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterCampaigns);
    }

    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterCampaigns);
    }

    // Sort filter
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', filterCampaigns);
    }
}

/**
 * Setup event listeners untuk halaman audit-detail
 */
function setupAuditDetailPageListeners() {
    // Filter tabs
    const filterAll = document.getElementById('filter-all');
    const filterIncoming = document.getElementById('filter-incoming');
    const filterOutgoing = document.getElementById('filter-outgoing');

    [filterAll, filterIncoming, filterOutgoing].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                // Remove active from all
                [filterAll, filterIncoming, filterOutgoing].forEach(b => b?.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                // Filter transactions
                filterAuditTransactions(btn.id.replace('filter-', ''));
            });
        }
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAuditTransactions());
    }

    // Date range inputs
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');

    if (dateFrom && dateTo) {
        dateFrom.addEventListener('change', () => filterAuditTransactions());
        dateTo.addEventListener('change', () => filterAuditTransactions());
    }
}

/**
 * Setup event listeners untuk halaman admin
 */
function setupAdminPageListeners() {
    // Form buat kampanye
    const campaignForm = document.getElementById('create-campaign-form');
    if (campaignForm) {
        campaignForm.addEventListener('submit', handleCreateCampaign);
    }

    // Form withdraw with log (merged expense + withdraw)
    const withdrawForm = document.getElementById('withdraw-form');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', handleWithdraw);
    }

    // Image file preview
    const imageInput = document.getElementById('campaign-image-file');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');

    if (imageInput && previewContainer && previewImage) {
        imageInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewImage.src = e.target.result;
                    previewContainer.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            } else {
                previewContainer.classList.add('hidden');
                previewImage.src = '';
            }
        });
    }
}

// ============================================
// DATA LOADING - Load Data per Halaman
// ============================================

/**
 * Load data sesuai halaman saat ini
 */
async function loadPageData() {
    switch (AppState.currentPage) {
        case 'home':
            await loadHomepageData();
            break;
        case 'detail':
            await loadDetailPageData();
            break;
        case 'campaigns':
            await loadCampaignsPageData();
            break;
        case 'audit':
            await loadAuditPageData();
            break;
        case 'audit-detail':
            await loadAuditDetailPageData();
            break;
        case 'profile':
            await loadProfilePageData();
            break;
        case 'admin':
            await loadAdminPageData();
            break;
        case 'leaderboard':
            await loadLeaderboardPageData();
            break;
        case 'about':
            // About page doesn't need data loading
            break;
    }
}

/**
 * Load data untuk homepage (Urgent campaigns)
 */
async function loadHomepageData() {
    try {
        console.log('🔄 Loading homepage data...');
        const startTime = Date.now();

        // Load data concurrently for better performance
        const [allCampaigns, leaderboard, stats] = await Promise.all([
            window.DonaContract.getActiveCampaigns(),
            window.DonaContract.getLeaderboard(5),
            window.DonaContract.getStats()
        ]);

        console.log(`⏱️ Data fetched in ${Date.now() - startTime}ms`);

        // 1. Fetch votes for all active campaigns
        const campaignsWithVotes = await Promise.all(allCampaigns.map(async c => {
            try {
                if (typeof window.DonaContract.getCampaignVotes === 'function') {
                    const votes = await window.DonaContract.getCampaignVotes(c.id);
                    return { ...c, votes: Number(votes) };
                }
                return { ...c, votes: 0 };
            } catch (e) {
                console.warn(`Failed to fetch votes for campaign ${c.id}`, e);
                return { ...c, votes: 0 };
            }
        }));

        // 2. Curated Selection Logic
        let pool = campaignsWithVotes.filter(c => c.isActive && !c.isExpired);
        const curated = [];
        const now = Date.now();

        // Helper to remove from pool
        const removeFromPool = (id) => {
            pool = pool.filter(c => c.id !== id);
        };

        // A. Deadline (Closest, must be > now)
        const deadlineCandidates = [...pool].sort((a, b) => a.deadline - b.deadline);
        if (deadlineCandidates.length > 0) {
            const selected = { ...deadlineCandidates[0] };
            selected.customBadge = { text: "Mendesak", className: "bg-red-500 text-white" };
            curated.push(selected);
            removeFromPool(selected.id);
        }

        // B. Target (Highest Progress < 100%)
        const targetCandidates = pool.filter(c => parseFloat(c.progress) < 100)
            .sort((a, b) => parseFloat(b.progress) - parseFloat(a.progress));
        if (targetCandidates.length > 0) {
            const selected = { ...targetCandidates[0] };
            selected.customBadge = { text: "Hampir Tercapai", className: "bg-orange-500 text-white" };
            curated.push(selected);
            removeFromPool(selected.id);
        }

        // C. Votes (Most Voted)
        const voteCandidates = [...pool].sort((a, b) => b.votes - a.votes);
        if (voteCandidates.length > 0) {
            const selected = { ...voteCandidates[0] };
            selected.customBadge = { text: "Terfavorit", className: "bg-purple-500 text-white" };
            curated.push(selected);
            removeFromPool(selected.id);
        }

        // Render
        const displayCampaigns = curated.length > 0 ? curated : allCampaigns.slice(0, 3);
        window.DonaUI.renderCampaignCards(displayCampaigns);

        // Render leaderboard
        window.DonaUI.renderLeaderboard(leaderboard);

        // Render stats
        window.DonaUI.renderTransparencyStats(stats);

        console.log('✅ Homepage data loaded');

    } catch (error) {
        console.error('❌ Failed to load homepage data:', error);
    }
}

/**
 * Load data untuk halaman campaigns (all campaigns)
 */
async function loadCampaignsPageData() {
    try {
        // Load semua kampanye
        const allCampaigns = await window.DonaContract.getAllCampaigns();
        AppState.allCampaigns = allCampaigns; // Store for filtering

        // Update counts
        const activeCount = allCampaigns.filter(c => c.isActive && (!c.deadline || c.deadline * 1000 > Date.now())).length;
        const completedCount = allCampaigns.filter(c => c.progress >= 100).length;
        const expiredCount = allCampaigns.filter(c => c.deadline && c.deadline * 1000 < Date.now()).length;

        const activeEl = document.getElementById('active-count');
        const completedEl = document.getElementById('completed-count');
        const expiredEl = document.getElementById('expired-count');

        if (activeEl) activeEl.textContent = activeCount;
        if (completedEl) completedEl.textContent = completedCount;
        if (expiredEl) expiredEl.textContent = expiredCount;

        // Initial filter (this will trigger sort and render)
        // Ensure filterCampaigns uses the default 'active' from DOM
        filterCampaigns();

        console.log('✅ Campaigns page data loaded');

    } catch (error) {
        console.error('❌ Failed to load campaigns page data:', error);
    }
}

/**
 * Load data untuk halaman detail kampanye
 */
async function loadDetailPageData_OLD() {
    try {
        if (!AppState.currentCampaignId) {
            window.DonaUI.showErrorModal('Error', 'ID Kampanye tidak valid');
            return;
        }

        console.log('🔄 Loading detail page data...');

        const campaignId = AppState.currentCampaignId;

        console.log('🔄 Loading detail page data...');

        // Fetch campaign and donations concurrently
        const [campaign, donations] = await Promise.all([
            window.DonaContract.getCampaignById(campaignId),
            window.DonaContract.getDonationsForCampaign(campaignId)
        ]);

        // 3. Render Campaign & Donations
        window.DonaUI.renderCampaignDetail(campaign);
        renderDeadlineInfo(campaign);
        window.DonaUI.renderDonationFeed(donations, 'donation-feed', 10);
        updateWalletBalanceDisplay();

        // Check expired
        if (campaign.deadline && campaign.deadline * 1000 < Date.now()) {
            const form = document.getElementById('donate-form');
            const expiredWarning = document.getElementById('expired-warning');
            const submitBtn = document.getElementById('donate-submit-btn');
            if (form) form.classList.add('hidden');
            if (expiredWarning) expiredWarning.classList.remove('hidden');
            if (submitBtn) submitBtn.disabled = true;
        }

        // 4. Render Vote Stats
        const totalEl = document.getElementById('vote-count-total');
        const rankEl = document.getElementById('vote-count-ranking');
        const todayEl = document.getElementById('vote-count-today');

        if (totalEl) totalEl.textContent = totalVotes.toLocaleString();
        if (rankEl) rankEl.textContent = voteStats.ranking ? `#${voteStats.ranking}` : '-';
        if (todayEl) todayEl.textContent = voteStats.todayVotes.toLocaleString();

        // 5. Check Voting Eligibility (Parallel Check)
        if (isConnected && nfts.length > 0) {

            // Filter NFTs for this campaign
            const campaignNFTs = nfts.filter(nft => Number(nft.campaignId) === Number(campaignId));

            if (campaignNFTs.length > 0) {
                // Parallel check for hasVoted
                const checkPromises = campaignNFTs.map(async nft => {
                    const hasVoted = await window.DonaContract.checkHasVoted(nft.tokenId);
                    return { tokenId: nft.tokenId, hasVoted: hasVoted };
                });

                const results = await Promise.all(checkPromises);

                // Count quota
                const quota = results.filter(r => !r.hasVoted).length;
                const canVote = quota > 0;

                // Update UI
                const quotaEl = document.getElementById('vote-quota');
                if (quotaEl) quotaEl.textContent = quota;

                const voteBtn = document.getElementById('vote-btn');
                if (voteBtn) {
                    voteBtn.disabled = !canVote;
                    voteBtn.innerHTML = canVote
                        ? '<i class="fas fa-fire mr-2 group-hover:animate-pulse"></i> Vote Kampanye Ini'
                        : '<i class="fas fa-check-circle mr-2"></i> Sudah Vote / Tidak Ada Tiket';

                    if (!canVote) {
                        voteBtn.classList.add('opacity-50', 'cursor-not-allowed');
                        voteBtn.classList.remove('hover:shadow-blue-300', 'hover:-translate-y-1');
                    }
                }
            } else {
                // Has NFTs but not for this campaign
                const voteBtn = document.getElementById('vote-btn');
                if (voteBtn) {
                    voteBtn.disabled = true;
                    voteBtn.innerHTML = '<i class="fas fa-ticket-alt mr-2"></i> Butuh Tiket NFT';
                    voteBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }
        } else if (isConnected) {
            // No NFTs at all
            const voteBtn = document.getElementById('vote-btn');
            if (voteBtn) {
                voteBtn.disabled = true;
                voteBtn.innerHTML = '<i class="fas fa-ticket-alt mr-2"></i> Butuh Tiket NFT';
                voteBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        console.log('✅ Detail page data loaded & rendered');

    } catch (error) {
        console.error('❌ Failed to load detail page data:', error);
        window.DonaUI.showErrorModal('Error', 'Gagal memuat data kampanye');
    }
}

/**
 * Load voting data - DEPRECATED (Merged into loadDetailPageData)
 * Keeping empty function to avoid reference errors if called elsewhere
 */
async function loadVotingData(campaignId) {
    try {
        const totalVotes = await window.DonaContract.getCampaignVotes(campaignId);

        const totalEl = document.getElementById('vote-count-total');
        if (totalEl) totalEl.textContent = totalVotes.toLocaleString();

        // Load Ranking & Today's Vote
        const stats = await window.DonaContract.getVoteStats(campaignId);

        const rankEl = document.getElementById('vote-count-ranking');
        const todayEl = document.getElementById('vote-count-today');

        if (rankEl) rankEl.textContent = stats.ranking ? `#${stats.ranking}` : '-';
        if (todayEl) todayEl.textContent = stats.todayVotes.toLocaleString();

        // Check if user can vote (has unused NFT)
        if (window.DonaWallet.isWalletConnected()) {
            const userAddress = window.DonaWallet.getWalletAddress();
            const nfts = await window.DonaContract.getNFTsByOwner(userAddress) || []; // Default to empty array

            let canVote = false;
            let quota = 0;

            for (const nft of nfts) {
                if (Number(nft.campaignId) === Number(campaignId)) {
                    const hasVoted = await window.DonaContract.checkHasVoted(nft.tokenId);
                    if (!hasVoted) {
                        canVote = true;
                        quota++;
                    }
                }
            }

            // Update Quota UI
            const quotaEl = document.getElementById('vote-quota');
            if (quotaEl) quotaEl.textContent = quota;

            const voteBtn = document.getElementById('vote-btn');
            if (voteBtn) {
                voteBtn.disabled = !canVote;
                voteBtn.innerHTML = canVote
                    ? '<i class="fas fa-fire mr-2 group-hover:animate-pulse"></i> Vote Kampanye Ini'
                    : '<i class="fas fa-check-circle mr-2"></i> Sudah Vote / Tidak Ada Tiket';

                if (!canVote) {
                    voteBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    voteBtn.classList.remove('hover:shadow-blue-300', 'hover:-translate-y-1');
                }
            }
        }
    } catch (error) {
        console.error('Failed to load voting data', error);
    }
}

/**
 * Handle vote click
 */
async function handleVoteClick() {
    try {
        if (!window.DonaWallet.isWalletConnected()) {
            window.DonaUI.showToast('Silakan hubungkan wallet terlebih dahulu', 'warning');
            return;
        }

        const campaignId = AppState.currentCampaignId;
        const userAddress = window.DonaWallet.getWalletAddress();

        window.DonaUI.showLoading();

        // Find valid token
        const nfts = await window.DonaContract.getNFTsByOwner(userAddress) || []; // Default to empty array
        let validTokenId = null;

        for (const nft of nfts) {
            if (Number(nft.campaignId) === Number(campaignId)) {
                const hasVoted = await window.DonaContract.checkHasVoted(nft.tokenId);
                if (!hasVoted) {
                    validTokenId = nft.tokenId;
                    break;
                }
            }
        }

        if (!validTokenId) {
            window.DonaUI.showToast('Anda tidak memiliki tiket voting (NFT) yang valid.', 'error');
            window.DonaUI.hideLoading();
            return;
        }

        const result = await window.DonaContract.voteForCampaign(campaignId, validTokenId);

        if (result.success) {
            if (result.timedOut) {
                window.DonaUI.showToast('Vote terkirim! Menunggu konfirmasi jaringan...', 'info');
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Vote Berhasil!',
                    text: 'Terima kasih atas dukungan Anda pada kampanye ini.',
                    confirmButtonColor: '#467ac6'
                });
            }
            // Reload data in background
            loadVotingData(campaignId);
        }

    } catch (error) {
        console.error('Vote error:', error);
        window.DonaUI.showToast(error.message || 'Gagal melakukan voting', 'error');
    } finally {
        window.DonaUI.hideLoading();
    }
}

/**
 * Load data untuk halaman audit (limited to 3 latest)
 */
async function loadAuditPageData() {
    try {
        console.log('🔄 Loading audit page data...');
        const startTime = Date.now();

        // Load all data concurrently
        const [campaigns, donations, expenses, stats] = await Promise.all([
            window.DonaContract.getAllCampaigns(),
            window.DonaContract.getAllDonations(),
            window.DonaContract.getAllExpenses(),
            window.DonaContract.getStats()
        ]);

        console.log(`⏱️ Audit data fetched in ${Date.now() - startTime}ms`);

        AppState.allCampaigns = campaigns;

        // Process donations - limit 3 latest
        const recentDonations = donations.slice(Math.max(donations.length - 3, 0));
        window.DonaUI.renderIncomingFundsTable(recentDonations, 'incoming-funds-table', campaigns);

        // Process expenses - limit 3 latest
        const recentExpenses = expenses.slice(Math.max(expenses.length - 3, 0));
        window.DonaUI.renderOutgoingFundsTable(recentExpenses, 'outgoing-funds-table', campaigns);

        // Render stats
        window.DonaUI.renderTransparencyStats(stats);

        console.log('✅ Audit page data loaded');

    } catch (error) {
        console.error('❌ Failed to load audit page data:', error);
    }
}

/**
 * Load data untuk halaman audit-detail (full list)
 */
async function loadAuditDetailPageData() {
    try {
        // Load campaigns first for title lookup
        const campaigns = await window.DonaContract.getAllCampaigns();
        AppState.allCampaigns = campaigns;

        // Check URL params for campaign filter
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('campaignId') ? parseInt(urlParams.get('campaignId')) : null;
        const tab = urlParams.get('tab') || 'all';

        // Store campaign filter in state
        AppState.filterCampaignId = campaignId;

        // Load data based on filter
        let donations, expenses;

        if (campaignId) {
            // Filter by campaign
            donations = await window.DonaContract.getDonationsForCampaign(campaignId);
            expenses = await window.DonaContract.getExpensesForCampaign(campaignId);

            // Update header to show campaign filter
            const headerEl = document.querySelector('h1');
            if (headerEl) {
                headerEl.innerHTML = `
                    <i class="fas fa-list-alt text-blue-500 mr-3"></i>
                    Audit Kampanye #${campaignId}
                `;
            }

            // Update subtitle
            const subtitleEl = document.querySelector('h1 + p');
            if (subtitleEl) {
                subtitleEl.innerHTML = `
                    Transaksi untuk Kampanye #${campaignId} - 
                    <a href="audit-detail.html?campaignId=${campaignId}&tab=incoming" class="text-blue-400 hover:text-blue-300">
                        Lihat Semua Kampanye
                    </a>
                `;
            }
        } else {
            // Load all
            donations = await window.DonaContract.getAllDonations();
            expenses = await window.DonaContract.getAllExpenses();
        }

        AppState.allDonations = donations;
        AppState.allExpenses = expenses;

        // Calculate totals
        const totalReceived = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const contractBalance = totalReceived - totalSpent;

        // Update stats elements
        const totalReceivedEl = document.getElementById('total-received');
        const totalSpentEl = document.getElementById('total-spent');
        const contractBalanceEl = document.getElementById('contract-balance');
        const totalCountEl = document.getElementById('total-donations-count');

        if (totalReceivedEl) totalReceivedEl.textContent = `${totalReceived.toFixed(3)} ETH`;
        if (totalSpentEl) totalSpentEl.textContent = `${totalSpent.toFixed(3)} ETH`;
        if (contractBalanceEl) contractBalanceEl.textContent = `${contractBalance.toFixed(3)} ETH`;
        if (totalCountEl) totalCountEl.textContent = `${donations.length + expenses.length}`;

        // Set active tab based on URL
        const filterAll = document.getElementById('filter-all');
        const filterIncoming = document.getElementById('filter-incoming');
        const filterOutgoing = document.getElementById('filter-outgoing');

        [filterAll, filterIncoming, filterOutgoing].forEach(btn => btn?.classList.remove('active'));
        if (tab === 'incoming' && filterIncoming) filterIncoming.classList.add('active');
        else if (tab === 'outgoing' && filterOutgoing) filterOutgoing.classList.add('active');
        else if (filterAll) filterAll.classList.add('active');

        renderAllTransactions(tab);

        console.log('✅ Audit detail page data loaded', campaignId ? `(Campaign #${campaignId})` : '(All)');

    } catch (error) {
        console.error('❌ Failed to load audit detail page data:', error);
    }
}

/**
 * Load data untuk halaman profil
 */
async function loadProfilePageData() {
    try {
        const wallet = window.DonaWallet;

        if (!wallet.isWalletConnected()) {
            // Tampilkan pesan untuk connect wallet
            showConnectWalletPrompt();
            return;
        }

        const address = wallet.getWalletAddress();

        console.log('🔄 Loading profile data (parallel)...');
        const startTime = Date.now();

        // Load data concurrently
        const [nfts, campaigns, donations] = await Promise.all([
            window.DonaContract.getNFTsByOwner(address),
            window.DonaContract.getAllCampaigns(),
            window.DonaContract.getDonationsByDonor(address)
        ]);

        console.log(`⏱️ Profile data fetched in ${Date.now() - startTime}ms`);

        // Render UI
        window.DonaUI.renderNFTGallery(nfts);

        // Initialize pagination state
        AppState.profilePagination = 1;
        AppState.profileDonations = donations;
        AppState.profileCampaigns = campaigns; // Store for lookup

        // Render donation history with pagination
        window.DonaUI.renderDonationHistory(donations, 'donation-history-table', campaigns, 1, 5);

        // Update alamat di UI
        const addressEl = document.getElementById('profile-address');
        if (addressEl) addressEl.textContent = address;

        console.log('✅ Profile page data loaded');

    } catch (error) {
        console.error('❌ Failed to load profile page data:', error);
    }
}

/**
 * Handle pagination changes for donation history
 * exposes to window for onclick access
 */
window.handleDonationPagination = function (page) {
    if (!AppState.profileDonations) return;

    // Update state
    AppState.profilePagination = page;

    // Re-render
    window.DonaUI.renderDonationHistory(
        AppState.profileDonations,
        'donation-history-table',
        AppState.profileCampaigns,
        page,
        5
    );
};

/**
 * Load data untuk halaman admin
 */
async function loadAdminPageData() {
    try {
        const wallet = window.DonaWallet;

        // Cek apakah user adalah admin
        if (!wallet.isWalletConnected()) {
            showConnectWalletPrompt();
            return;
        }

        const address = wallet.getWalletAddress();
        if (!wallet.isAdmin(address)) {
            window.DonaUI.showErrorModal('Akses Ditolak', 'Halaman ini hanya untuk admin');
            return;
        }

        // Load semua kampanye untuk admin
        const campaigns = await window.DonaContract.getCampaigns();
        // Sort by newest (descending ID)
        campaigns.sort((a, b) => b.id - a.id);
        window.DonaUI.renderAdminCampaignTable(campaigns);

        // Populate campaign selector for withdraw
        const campaignSelect = document.getElementById('withdraw-campaign-id');
        if (campaignSelect) {
            let options = '<option value="" disabled selected>-</option>';
            // Sort by newest first
            [...campaigns].sort((a, b) => b.id - a.id).forEach(c => {
                options += `<option value="${c.id}">#${c.id} - ${c.title}</option>`;
            });
            campaignSelect.innerHTML = options;
        }

        // Load statistik
        const stats = await window.DonaContract.getStats();
        window.DonaUI.renderTransparencyStats(stats);

        console.log('✅ Admin page data loaded');

    } catch (error) {
        console.error('❌ Failed to load admin page data:', error);
    }
}

// ============================================
// LEADERBOARD PAGE - Halaman Leaderboard
// ============================================

// State untuk leaderboard
const LeaderboardState = {
    allDonors: [],
    currentPage: 1,
    perPage: 10
};

/**
 * Load data untuk halaman leaderboard
 */
async function loadLeaderboardPageData() {
    try {
        console.log('📊 Loading leaderboard page data...');

        // Load all donations
        const donations = await window.DonaContract.getAllDonations();

        // Aggregate donations by donor
        const donorMap = {};
        donations.forEach(d => {
            const donor = d.donor.toLowerCase();
            if (!donorMap[donor]) {
                donorMap[donor] = {
                    address: d.donor,
                    total: 0,
                    txCount: 0
                };
            }
            donorMap[donor].total += parseFloat(d.amount);
            donorMap[donor].txCount++;
        });

        // Convert to array and sort by total
        LeaderboardState.allDonors = Object.values(donorMap).sort((a, b) => b.total - a.total);

        // Render leaderboard
        renderLeaderboard();

        // Setup pagination
        setupLeaderboardPagination();

        // Show user position if connected
        showUserPosition();

        console.log('✅ Leaderboard page data loaded');

    } catch (error) {
        console.error('❌ Failed to load leaderboard page data:', error);
    }
}

/**
 * Render leaderboard table
 */
function renderLeaderboard() {
    const container = document.getElementById('leaderboard-table');
    if (!container) return;

    const config = window.DonaConfig;
    const { allDonors, currentPage, perPage } = LeaderboardState;

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageData = allDonors.slice(start, end);

    if (allDonors.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-12 text-gray-400">
                    Belum ada donatur
                </td>
            </tr>
        `;
        return;
    }

    const connectedAddress = window.DonaWallet.getWalletAddress();

    container.innerHTML = pageData.map((donor, idx) => {
        const rank = start + idx + 1;
        const isYou = connectedAddress && donor.address.toLowerCase() === connectedAddress.toLowerCase();
        const rankDisplay = rank <= 3
            ? `<span class="${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'} text-xl">
                <i class="fas fa-trophy"></i>
               </span>`
            : `#${rank}`;

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors ${isYou ? 'bg-blue-50' : ''}">
                <td class="py-3 px-4 text-center font-bold ${rank <= 3 ? 'text-xl' : 'text-gray-400'}">
                    ${rankDisplay}
                </td>
                <td class="py-3 px-4">
                    <a href="${config.getEtherscanAddressUrl(donor.address)}" 
                       target="_blank"
                       class="text-blue-600 hover:text-blue-800 font-mono text-sm flex items-center gap-2">
                        ${window.DonaWallet.formatAddress(donor.address)}
                        ${isYou ? '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Anda</span>' : ''}
                        <i class="fas fa-external-link-alt text-xs"></i>
                    </a>
                </td>
                <td class="py-3 px-4 text-right font-bold text-green-400">${donor.total.toFixed(3)} ETH</td>
                <td class="py-3 px-4 text-center text-gray-400">${donor.txCount}x</td>
            </tr>
        `;
    }).join('');

    // Update page info
    const totalPages = Math.ceil(allDonors.length / perPage);
    updateElement('current-page', currentPage);
    updateElement('total-pages', totalPages);
    updateElement('showing-start', allDonors.length > 0 ? start + 1 : 0);
    updateElement('showing-end', Math.min(end, allDonors.length));
    updateElement('total-donors', allDonors.length);
}

/**
 * Setup pagination buttons
 */
function setupLeaderboardPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const totalPages = Math.ceil(LeaderboardState.allDonors.length / LeaderboardState.perPage);

    if (prevBtn) {
        prevBtn.disabled = LeaderboardState.currentPage <= 1;
        prevBtn.onclick = () => {
            if (LeaderboardState.currentPage > 1) {
                LeaderboardState.currentPage--;
                renderLeaderboard();
                setupLeaderboardPagination();
                showUserPosition();
            }
        };
    }

    if (nextBtn) {
        nextBtn.disabled = LeaderboardState.currentPage >= totalPages;
        nextBtn.onclick = () => {
            if (LeaderboardState.currentPage < totalPages) {
                LeaderboardState.currentPage++;
                renderLeaderboard();
                setupLeaderboardPagination();
                showUserPosition();
            }
        };
    }
}

/**
 * Show user position if not in top 10
 */
function showUserPosition() {
    const card = document.getElementById('your-position-card');
    if (!card) return;

    const connectedAddress = window.DonaWallet.getWalletAddress();
    if (!connectedAddress) {
        card.classList.add('hidden');
        return;
    }

    const { allDonors, currentPage, perPage } = LeaderboardState;
    const userIndex = allDonors.findIndex(d => d.address.toLowerCase() === connectedAddress.toLowerCase());

    if (userIndex === -1) {
        card.classList.add('hidden');
        return;
    }

    const rank = userIndex + 1;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    // Only show if user is not visible on current page
    if (rank > start && rank <= end) {
        card.classList.add('hidden');
        return;
    }

    // Show user position card
    card.classList.remove('hidden');
    updateElement('your-rank', `#${rank}`);
    updateElement('your-address', window.DonaWallet.formatAddress(connectedAddress));
    updateElement('your-total', `${allDonors[userIndex].total.toFixed(3)} ETH`);
}

/**
 * Tampilkan prompt untuk connect wallet
 */
function showConnectWalletPrompt() {
    const contentContainer = document.getElementById('main-content');
    if (!contentContainer) return;

    contentContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh]">
            <div class="text-center">
                <i class="fas fa-wallet text-6xl text-purple-500 mb-6"></i>
                <h2 class="text-2xl font-bold text-white mb-4">Wallet Belum Terkoneksi</h2>
                <p class="text-gray-400 mb-6">Silakan hubungkan wallet Anda untuk mengakses halaman ini</p>
                <button onclick="window.DonaApp.handleConnectWallet()"
                        class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl font-medium transition-all">
                    <i class="fas fa-wallet mr-2"></i>Connect Wallet
                </button>
            </div>
        </div>
    `;
}

// ============================================
// WALLET HANDLERS - Handler Wallet
// ============================================

/**
 * Handler untuk tombol Connect Wallet
 */
async function handleConnectWallet() {
    try {
        window.DonaUI.showLoading('Menghubungkan wallet...');

        const result = await window.DonaWallet.connectWallet();

        window.DonaUI.hideLoading();

        if (result.success) {
            // Update UI
            updateWalletStatus();

            // Inisialisasi write contracts
            await window.DonaContract.initWriteContracts();

            // Reload data halaman
            await loadPageData();

            window.DonaUI.showToast('Wallet berhasil terhubung!', 'success');
        }

    } catch (error) {
        window.DonaUI.hideLoading();
        window.DonaUI.showErrorModal('Gagal Terhubung', error.message);
    }
}

/**
 * Handler untuk tombol Disconnect
 */
function handleDisconnectWallet() {
    window.DonaWallet.disconnectWallet();
    window.DonaUI.showToast('Wallet terputus', 'info');

    // Reload halaman untuk reset state
    if (AppState.currentPage === 'profile' || AppState.currentPage === 'admin') {
        window.location.reload();
    }
}

/**
 * Handler saat akun berubah
 */
async function handleAccountChanged(event) {
    const { address } = event.detail;

    // Update UI
    updateWalletStatus();

    // Reinitialize write contracts dengan signer baru
    await window.DonaContract.initWriteContracts();

    // Reload data halaman
    await loadPageData();

    window.DonaUI.showToast(`Akun berubah ke ${window.DonaWallet.formatAddress(address)}`, 'info');
}

/**
 * Handler saat jaringan berubah
 */
async function handleNetworkChanged(event) {
    const { isCorrectNetwork } = event.detail;

    if (!isCorrectNetwork) {
        window.DonaUI.showErrorModal(
            'Jaringan Salah',
            'Silakan gunakan jaringan Ethereum Sepolia untuk menggunakan aplikasi ini.'
        );
    } else {
        window.DonaUI.showToast('Berhasil pindah ke Sepolia', 'success');
        // Reload data
        await loadPageData();
    }
}

/**
 * Handler saat wallet disconnect
 */
function handleWalletDisconnected() {
    updateWalletStatus();

    if (AppState.currentPage === 'profile' || AppState.currentPage === 'admin') {
        showConnectWalletPrompt();
    }
}

/**
 * Update status wallet di UI
 */
function updateWalletStatus() {
    const wallet = window.DonaWallet;
    const isConnected = wallet.isWalletConnected();
    const address = wallet.getWalletAddress();

    window.DonaUI.updateWalletUI(isConnected, address);
}

// ============================================
// DONATION HANDLERS - Handler Donasi
// ============================================

/**
 * Handler untuk submit form donasi
 * 
 * @param {Event} event - Submit event
 */
async function handleDonateSubmit(event) {
    event.preventDefault();

    const wallet = window.DonaWallet;

    // Cek wallet terkoneksi
    if (!wallet.isWalletConnected()) {
        await handleConnectWallet();
        return;
    }

    // Cek jaringan
    if (!wallet.getState().isCorrectNetwork) {
        window.DonaUI.showErrorModal('Jaringan Salah', 'Silakan gunakan jaringan Sepolia');
        return;
    }

    // Ambil nilai dari form
    const amountInput = document.getElementById('donate-amount');
    const amount = amountInput?.value;

    if (!amount || parseFloat(amount) <= 0) {
        window.DonaUI.showErrorModal('Input Invalid', 'Masukkan jumlah donasi yang valid');
        return;
    }

    // Konfirmasi donasi
    const confirmed = await window.DonaUI.showConfirm(
        'Konfirmasi Donasi',
        `Anda akan mendonasikan ${amount} ETH. Lanjutkan?`
    );

    if (!confirmed) return;

    try {
        window.DonaUI.showLoading('Memproses donasi...');

        // Kirim donasi
        const result = await window.DonaContract.donate(AppState.currentCampaignId, amount);

        window.DonaUI.hideLoading();

        // Cek apakah NFT di-mint (donasi >= 0.01 ETH)
        const nftMinted = parseFloat(amount) >= window.DonaConfig.MIN_DONATION_FOR_NFT;

        // Tampilkan success modal
        window.DonaUI.showDonationSuccessModal(amount, result.hash, nftMinted);

        // Reset form
        if (amountInput) amountInput.value = '';

        // Reload data halaman
        await loadDetailPageData();

    } catch (error) {
        window.DonaUI.hideLoading();
        window.DonaUI.showErrorModal('Donasi Gagal', error.message);
    }
}

// ============================================
// ADMIN HANDLERS - Handler Admin
// ============================================

/**
 * Handler untuk submit form buat kampanye (dengan deadline)
 * 
 * @param {Event} event - Submit event
 */
async function handleCreateCampaign(event) {
    event.preventDefault();

    const wallet = window.DonaWallet;

    if (!wallet.isWalletConnected() || !wallet.isAdmin(wallet.getWalletAddress())) {
        window.DonaUI.showErrorModal('Akses Ditolak', 'Hanya admin yang dapat membuat kampanye');
        return;
    }

    // Ambil nilai dari form
    const title = document.getElementById('campaign-title-input')?.value;
    const description = document.getElementById('campaign-description-input')?.value;
    // const imageCID = document.getElementById('campaign-image-cid')?.value || ''; // Old method
    const imageFileInput = document.getElementById('campaign-image-file');
    const target = document.getElementById('campaign-target-input')?.value;
    const deadlineInput = document.getElementById('campaign-deadline-input')?.value;

    // Validasi
    if (!title || !description || !target || !deadlineInput) {
        window.DonaUI.showErrorModal('Input Invalid', 'Harap isi semua field yang diperlukan');
        return;
    }

    // Konversi deadline ke Unix timestamp
    const deadline = Math.floor(new Date(deadlineInput).getTime() / 1000);

    if (deadline <= Math.floor(Date.now() / 1000)) {
        window.DonaUI.showErrorModal('Input Invalid', 'Deadline harus di masa depan');
        return;
    }

    try {
        let imageCID = '';

        // Handle Image Upload
        if (imageFileInput && imageFileInput.files.length > 0) {
            window.DonaUI.showLoading('Mengupload gambar ke IPFS...');
            const file = imageFileInput.files[0];

            // Upload to Pinata
            imageCID = await window.DonaIPFS.uploadToPinata(file);
            console.log('Image uploaded to IPFS:', imageCID);
        }

        window.DonaUI.showLoading('Membuat kampanye di Blockchain...');

        const result = await window.DonaContract.createCampaign(title, description, imageCID, target, deadline);

        window.DonaUI.hideLoading();
        window.DonaUI.showSuccessModal('Berhasil', 'Kampanye baru berhasil dibuat!');

        // Reset form
        document.getElementById('create-campaign-form')?.reset();

        // Reset preview
        const previewContainer = document.getElementById('image-preview-container');
        if (previewContainer) previewContainer.classList.add('hidden');

        // Reload data
        await loadAdminPageData();

    } catch (error) {
        window.DonaUI.hideLoading();
        window.DonaUI.showErrorModal('Gagal', error.message);
    }
}

/**
 * Handler untuk submit form withdraw with log (MERGED FUNCTION)
 * 
 * @param {Event} event - Submit event
 * 
 * PENJELASAN:
 * Fungsi ini menggabungkan withdraw + expense logging dalam satu transaksi
 */
async function handleWithdraw(event) {
    event.preventDefault();

    const wallet = window.DonaWallet;

    if (!wallet.isWalletConnected() || !wallet.isAdmin(wallet.getWalletAddress())) {
        window.DonaUI.showErrorModal('Akses Ditolak', 'Hanya admin yang dapat menarik dana');
        return;
    }

    // Ambil nilai dari form
    const description = document.getElementById('withdraw-description')?.value;
    const recipient = document.getElementById('withdraw-recipient')?.value;
    const amount = document.getElementById('withdraw-amount')?.value;
    const campaignId = parseInt(document.getElementById('withdraw-campaign-id')?.value) || 0;

    // Validasi
    if (!description || !recipient || !amount) {
        window.DonaUI.showErrorModal('Input Invalid', 'Harap isi semua field yang diperlukan');
        return;
    }

    // Konfirmasi
    const confirmed = await window.DonaUI.showConfirm(
        'Konfirmasi Penarikan',
        `Anda akan menarik ${amount} ETH ke ${window.DonaWallet.formatAddress(recipient)}. Dana akan tercatat sebagai pengeluaran untuk transparansi. Lanjutkan?`
    );

    if (!confirmed) return;

    try {
        window.DonaUI.showLoading('Menarik dana dan mencatat pengeluaran...');

        await window.DonaContract.withdrawWithLog(description, recipient, amount, campaignId);

        window.DonaUI.hideLoading();
        window.DonaUI.showSuccessModal('Berhasil', 'Dana berhasil ditarik dan tercatat!');

        // Reset form
        document.getElementById('withdraw-form')?.reset();

        // Reload data
        await loadAdminPageData();

    } catch (error) {
        window.DonaUI.hideLoading();
        window.DonaUI.showErrorModal('Gagal', error.message);
    }
}

/**
 * Toggle status kampanye (aktif/nonaktif)
 * 
 * @param {number} campaignId - ID kampanye
 * @param {boolean} isActive - Status baru
 */
async function toggleCampaignStatus(campaignId, isActive) {
    try {
        window.DonaUI.showLoading('Mengupdate status...');

        await window.DonaContract.updateCampaignStatus(campaignId, isActive);

        window.DonaUI.hideLoading();
        window.DonaUI.showToast('Status kampanye diupdate!', 'success');

        // Reload data
        await loadAdminPageData();

    } catch (error) {
        window.DonaUI.hideLoading();
        window.DonaUI.showErrorModal('Gagal', error.message);
    }
}

// ============================================
// HELPER FUNCTIONS - Fungsi Pembantu
// ============================================

/**
 * Filter campaigns based on search, status and sort
 */
function filterCampaigns() {
    const searchInput = document.getElementById('search-input')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const sortFilter = document.getElementById('sort-filter')?.value || 'newest';

    if (!AppState.allCampaigns) return;

    let filtered = [...AppState.allCampaigns];

    // Filter by search
    if (searchInput) {
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(searchInput) ||
            c.description.toLowerCase().includes(searchInput)
        );
    }

    // Filter by status
    const now = Date.now();
    if (statusFilter === 'active') {
        filtered = filtered.filter(c => c.isActive && (!c.deadline || c.deadline * 1000 > now));
    } else if (statusFilter === 'completed') {
        filtered = filtered.filter(c => c.progress >= 100);
    } else if (statusFilter === 'expired') {
        filtered = filtered.filter(c => c.deadline && c.deadline * 1000 < now);
    }

    // Sort
    switch (sortFilter) {
        case 'deadline':
            filtered.sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
            break;
        case 'newest':
            filtered.sort((a, b) => b.id - a.id);
            break;
        case 'progress':
            filtered.sort((a, b) => b.progress - a.progress);
            break;
        case 'raised':
            filtered.sort((a, b) => parseFloat(b.totalRaised) - parseFloat(a.totalRaised));
            break;
    }

    window.DonaUI.renderCampaignCards(filtered, 'all-campaigns-grid');
}

/**
 * Filter audit transactions based on type, search and date
 */
function filterAuditTransactions(type) {
    // If type is not specified (e.g. from search/date change), use active tab
    if (!type) {
        if (document.getElementById('filter-incoming')?.classList.contains('active')) {
            type = 'incoming';
        } else if (document.getElementById('filter-outgoing')?.classList.contains('active')) {
            type = 'outgoing';
        } else {
            type = 'all';
        }
    }
    renderAllTransactions(type);
}

/**
 * Render all transactions (combined donations and expenses)
 */
function renderAllTransactions(filter = 'all') {
    const container = document.getElementById('all-transactions-table');
    if (!container) return;

    const config = window.DonaConfig;
    let transactions = [];

    // Build campaign lookup map for titles
    const campaignMap = {};
    if (AppState.allCampaigns) {
        AppState.allCampaigns.forEach(c => {
            campaignMap[c.id] = c.title;
        });
    }

    // Add donations as incoming
    if (filter === 'all' || filter === 'incoming') {
        if (AppState.allDonations) {
            transactions = transactions.concat(
                AppState.allDonations.map(d => ({
                    type: 'in',
                    date: d.date,
                    timestamp: d.timestamp || 0,
                    campaignId: d.campaignId,
                    campaignTitle: campaignMap[d.campaignId] || `Kampanye #${d.campaignId}`,
                    details: 'Donasi diterima',
                    amount: d.amount,
                    address: d.donor,
                    txHash: d.txHash
                }))
            );
        }
    }

    // Add expenses as outgoing
    if (filter === 'all' || filter === 'outgoing') {
        if (AppState.allExpenses) {
            transactions = transactions.concat(
                AppState.allExpenses.map(e => ({
                    type: 'out',
                    date: e.date,
                    timestamp: e.timestamp || 0,
                    campaignId: e.campaignId,
                    campaignTitle: e.campaignId ? (campaignMap[e.campaignId] || `Kampanye #${e.campaignId}`) : '-',
                    details: e.description,
                    amount: e.amount,
                    address: e.recipient,
                    txHash: e.txHash
                }))
            );
        }
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Apply date filter
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');

    if (dateFromInput && dateToInput) {
        const fromDate = dateFromInput.value ? new Date(dateFromInput.value).getTime() / 1000 : 0;
        const toDate = dateToInput.value ? (new Date(dateToInput.value).getTime() / 1000) + 86400 : Infinity; // +1 day for inclusive end date

        if (fromDate > 0 || toDate < Infinity) {
            transactions = transactions.filter(t => {
                const txTime = t.timestamp || 0;
                return txTime >= fromDate && txTime < toDate;
            });
        }
    }

    // Apply search filter
    const searchInput = document.getElementById('search-input')?.value?.toLowerCase();
    if (searchInput) {
        transactions = transactions.filter(t =>
            t.details.toLowerCase().includes(searchInput) ||
            t.campaignTitle.toLowerCase().includes(searchInput) ||
            t.address.toLowerCase().includes(searchInput) ||
            t.txHash?.toLowerCase().includes(searchInput)
        );
    }

    if (transactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-gray-400">
                    Tidak ada transaksi ditemukan
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = transactions.map(tx => {
        const typeBadge = tx.type === 'in'
            ? '<span class="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold"><i class="fas fa-arrow-down"></i> Masuk</span>'
            : '<span class="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold"><i class="fas fa-arrow-up"></i> Keluar</span>';

        const amountStyle = tx.type === 'in' ? 'color: #3fbb52;' : 'color: #ff3746;';
        const amountSign = tx.type === 'in' ? '+' : '-';

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4">${typeBadge}</td>
                <td class="py-3 px-4 text-sm text-gray-500">${tx.date}</td>
                <td class="py-3 px-4">
                    ${tx.campaignId ? `<a href="detail.html?id=${tx.campaignId}" class="text-blue-600 hover:text-blue-800 font-medium text-sm">${tx.campaignTitle}</a>` : '<span class="text-gray-500 text-sm">-</span>'}
                </td>
                <td class="py-3 px-4 text-sm text-gray-900">${tx.details}</td>
                <td class="py-3 px-4 font-medium text-sm" style="${amountStyle}">${amountSign}${parseFloat(tx.amount).toFixed(3)} ETH</td>
                <td class="py-3 px-4">
                    <a href="${config.getEtherscanAddressUrl(tx.address)}" 
                       target="_blank" 
                       class="text-blue-600 hover:text-blue-800 font-mono text-sm">
                        ${window.DonaWallet.formatAddress(tx.address)}
                    </a>
                </td>
                <td class="py-3 px-4">
                     <a href="${config.getEtherscanTxUrl(tx.txHash)}" target="_blank" class="text-xs text-blue-500 hover:text-blue-700">
                        <i class="fas fa-external-link-alt"></i> Tx
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render deadline info for campaign detail
 */
function renderDeadlineInfo(campaign) {
    const deadlineEl = document.getElementById('campaign-deadline');
    const countdownEl = document.getElementById('deadline-countdown');

    if (!deadlineEl) return;

    if (!campaign.deadline || campaign.deadline === 0) {
        deadlineEl.textContent = 'Tidak ada batas waktu';
        if (countdownEl) countdownEl.textContent = '';
        return;
    }

    const deadlineDate = new Date(campaign.deadline * 1000);
    const now = new Date();
    const diff = deadlineDate - now;

    // Format deadline date
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    deadlineEl.textContent = deadlineDate.toLocaleDateString('id-ID', options);

    if (diff <= 0) {
        if (countdownEl) {
            countdownEl.innerHTML = '<span class="text-red-400">Kampanye telah berakhir</span>';
        }
    } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (countdownEl) {
            if (days <= 3) {
                countdownEl.innerHTML = `<span class="text-red-400 deadline-urgent">${days} hari ${hours} jam tersisa</span>`;
            } else if (days <= 7) {
                countdownEl.innerHTML = `<span class="text-yellow-400">${days} hari ${hours} jam tersisa</span>`;
            } else {
                countdownEl.innerHTML = `<span class="text-gray-400">${days} hari tersisa</span>`;
            }
        }
    }
}

/**
 * Update wallet balance display
 */
async function updateWalletBalanceDisplay() {
    const balanceEl = document.getElementById('wallet-balance-value');
    if (!balanceEl) return;

    const wallet = window.DonaWallet;
    if (!wallet.isWalletConnected()) {
        balanceEl.textContent = '-';
        return;
    }

    try {
        const balance = await wallet.getBalance();
        balanceEl.textContent = `${parseFloat(balance).toFixed(3)} ETH`;
    } catch (e) {
        balanceEl.textContent = '-';
    }
}

/**
 * Load campaign audit data (donations and expenses for current campaign)
 */
async function loadCampaignAuditData() {
    if (!AppState.currentCampaignId) return;

    try {
        const campaignId = AppState.currentCampaignId;
        const expenses = await window.DonaContract.getExpensesForCampaign(campaignId);
        const donations = await window.DonaContract.getDonationsForCampaign(campaignId);

        // Calculate totals
        const totalIn = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        const totalOut = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        const fundsInEl = document.getElementById('audit-total-in');
        const fundsOutEl = document.getElementById('audit-total-out');

        if (fundsInEl) fundsInEl.textContent = `${totalIn.toFixed(3)} ETH`;
        if (fundsOutEl) fundsOutEl.textContent = `${totalOut.toFixed(3)} ETH`;

        // Update "Lihat Semua" links with campaign ID
        const viewAllInLink = document.getElementById('view-all-incoming-link');
        const viewAllOutLink = document.getElementById('view-all-outgoing-link');

        if (viewAllInLink) viewAllInLink.href = `audit-detail.html?campaignId=${campaignId}&tab=incoming`;
        if (viewAllOutLink) viewAllOutLink.href = `audit-detail.html?campaignId=${campaignId}&tab=outgoing`;

        // Render donations table (3 latest)
        renderCampaignDonationsTable(donations.slice(0, 3));

        // Render expenses table (3 latest)
        renderCampaignExpensesTable(expenses.slice(0, 3));

    } catch (error) {
        console.error('Failed to load campaign audit data:', error);
    }
}

/**
 * Render campaign donations table (3 latest)
 */
function renderCampaignDonationsTable(donations) {
    const container = document.getElementById('campaign-donations-table');
    if (!container) return;

    const config = window.DonaConfig;

    if (donations.length === 0) {
        container.innerHTML = `
        < tr >
        <td colspan="4" class="text-center py-4 text-gray-400 text-sm">
            Belum ada donasi
        </td>
            </tr >
        `;
        return;
    }

    container.innerHTML = donations.map(d => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-2 px-3 text-sm text-gray-500">${d.date}</td>
            <td class="py-2 px-3">
                <a href="${config.getEtherscanAddressUrl(d.donor)}" 
                   target="_blank"
                   class="text-blue-600 hover:text-blue-800 font-mono text-sm">
                    ${d.donorShort}
                </a>
            </td>
            <td class="py-2 px-3 font-medium text-sm" style="color: #3fbb52;">+${parseFloat(d.amount).toFixed(3)} ETH</td>
            <td class="py-2 px-3">
                <a href="${config.getEtherscanTxUrl(d.txHash)}" 
                   target="_blank"
                   class="text-blue-500 hover:text-blue-700 text-xs">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </td>
        </tr>
        `).join('');
}

/**
 * Render campaign expenses table (3 latest)
 */
function renderCampaignExpensesTable(expenses) {
    const container = document.getElementById('campaign-expenses-table');
    if (!container) return;

    const config = window.DonaConfig;

    if (expenses.length === 0) {
        container.innerHTML = `
        <tr>
        <td colspan="4" class="text-center py-4 text-gray-400 text-sm">
            Belum ada pengeluaran
        </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = expenses.map(e => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-2 px-3 text-sm text-gray-500">${e.date}</td>
            <td class="py-2 px-3 text-gray-900 text-sm truncate max-w-[150px]">${e.description}</td>
            <td class="py-2 px-3 font-medium text-sm" style="color: #ff3746;">-${parseFloat(e.amount).toFixed(3)} ETH</td>
            <td class="py-2 px-3">
                <a href="${config.getEtherscanTxUrl(e.txHash)}" 
                   target="_blank"
                   class="text-blue-500 hover:text-blue-700 text-xs">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </td>
        </tr>
        `).join('');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export fungsi aplikasi ke global scope
 */
window.DonaApp = {
    // Initialization
    initApp,
    loadPageData,

    // Wallet handlers
    handleConnectWallet,
    handleDisconnectWallet,

    // Donation handlers
    handleDonateSubmit,

    // Admin handlers
    handleCreateCampaign,
    handleWithdraw,
    toggleCampaignStatus,

    // Helper functions
    filterCampaigns,
    filterAuditTransactions,
    updateWalletBalanceDisplay,

    // State
    getState: () => ({ ...AppState })
};

// ============================================
// AUTO INITIALIZE
// ============================================

/**
 * Jalankan inisialisasi saat DOM loaded
 */
document.addEventListener('DOMContentLoaded', initApp);


console.log('✅ Donachain App module loaded successfully');

async function loadDetailPageData() {
    try {
        if (!AppState.currentCampaignId) {
            window.DonaUI.showErrorModal('Error', 'ID Kampanye tidak valid');
            return;
        }

        console.log('🔄 Loading detail page data...');

        const campaignId = AppState.currentCampaignId;

        // Fetch campaign and donations concurrently
        const [campaign, donations] = await Promise.all([
            window.DonaContract.getCampaignById(campaignId),
            window.DonaContract.getDonationsForCampaign(campaignId)
        ]);

        // Render detail kampanye
        window.DonaUI.renderCampaignDetail(campaign);

        // Render deadline info
        renderDeadlineInfo(campaign);

        // Check if campaign expired
        if (campaign.deadline && campaign.deadline * 1000 < Date.now()) {
            const form = document.getElementById('donate-form');
            const expiredWarning = document.getElementById('expired-warning');
            const submitBtn = document.getElementById('donate-submit-btn');
            if (form) form.classList.add('hidden');
            if (expiredWarning) expiredWarning.classList.remove('hidden');
            if (submitBtn) submitBtn.disabled = true;
        }

        // Update wallet balance display
        updateWalletBalanceDisplay();

        // Render donation feed
        window.DonaUI.renderDonationFeed(donations, 'donation-feed', 10);

        // Load Voting Data
        loadVotingData(AppState.currentCampaignId);

        console.log('✅ Detail page data loaded');

    } catch (error) {
        console.error('❌ Failed to load detail page data:', error);
        window.DonaUI.showErrorModal('Error', 'Gagal memuat data kampanye');
    }
}
