/**
 * @file ui.js
 * @description Modul untuk manipulasi DOM dan update tampilan UI
 * 
 * FILE INI MENANGANI:
 * 1. Render komponen UI (cards, tables, modals)
 * 2. Update navbar berdasarkan status wallet
 * 3. Tampilkan success/error messages dengan SweetAlert2
 * 4. Format dan display data dari blockchain
 * 
 * DEPENDENCY:
 * - config.js (konfigurasi)
 * - wallet.js (status wallet)
 * - SweetAlert2 (dari CDN)
 * 
 * @author Donachain Team
 */

// ============================================
// NAVBAR UI - Update Navbar
// ============================================

/**
 * Update tampilan navbar berdasarkan status wallet
 * 
 * @param {boolean} isConnected - Status koneksi wallet
 * @param {string} address - Alamat wallet (jika terkoneksi)
 * 
 * PENJELASAN:
 * - Jika belum terkoneksi: Tampilkan tombol "Connect Wallet"
 * - Jika terkoneksi: Tampilkan alamat wallet dan dropdown menu
 */
function updateWalletUI(isConnected, address) {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');

    if (!connectBtn || !walletInfo) return;

    if (isConnected && address) {
        // Sembunyikan tombol connect, tampilkan info wallet
        connectBtn.classList.add('hidden');
        walletInfo.classList.remove('hidden');

        if (walletAddress) {
            walletAddress.textContent = window.DonaWallet.formatAddress(address);
        }

        // Update admin menu visibility
        updateAdminMenuVisibility(address);

    } else {
        // Tampilkan tombol connect, sembunyikan info wallet
        connectBtn.classList.remove('hidden');
        walletInfo.classList.add('hidden');
    }
}

/**
 * Tampilkan/sembunyikan menu admin
 * 
 * @param {string} address - Alamat wallet
 */
function updateAdminMenuVisibility(address) {
    const adminLink = document.getElementById('admin-link');
    if (!adminLink) return;

    if (window.DonaWallet.isAdmin(address)) {
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }
}

/**
 * Toggle dropdown menu di navbar
 */
function toggleDropdown() {
    const dropdown = document.getElementById('wallet-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// ============================================
// MOBILE MENU - Hamburger Navigation
// ============================================

/**
 * Toggle mobile menu open/close
 */
function toggleMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (!hamburger || !mobileMenu || !overlay) return;

    const isOpen = mobileMenu.classList.contains('active');

    if (isOpen) {
        // Close menu
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        // Open menu
        hamburger.classList.add('active');
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Initialize mobile menu event listeners
 * Should be called on DOMContentLoaded
 */
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const overlay = document.getElementById('mobile-menu-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    // Toggle menu on hamburger click
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }

    // Close menu on overlay click
    if (overlay) {
        overlay.addEventListener('click', toggleMobileMenu);
    }

    // Close menu when clicking nav links
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggleMobileMenu();
        });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                toggleMobileMenu();
            }
        }
    });
}

// ============================================
// CAMPAIGN UI - Render Kampanye
// ============================================

/**
 * Render grid kampanye di homepage
 * 
 * @param {Array} campaigns - Array data kampanye
 * @param {string} containerId - ID container element
 * 
 * PENJELASAN:
 * Membuat card untuk setiap kampanye dengan:
 * - Gambar kampanye
 * - Judul
 * - Progress bar
 * - Info raised/target
 */
function renderCampaignCards(campaigns, containerId = 'campaign-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (campaigns.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-lg">
                    <i class="fas fa-inbox text-4xl mb-4"></i>
                    <p>Belum ada kampanye donasi</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = campaigns.map(campaign => `
        <div class="campaign-card bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer group"
             onclick="window.location.href='detail.html?id=${campaign.id}'">
            
            <!-- Campaign Image -->
            <div class="relative h-48 overflow-hidden">
                <img src="${campaign.imageUrl || 'https://placehold.co/400x200/f3f4f6/467ac6?text=Campaign'}" 
                     alt="${campaign.title}"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                     onerror="this.src='https://placehold.co/400x200/f3f4f6/467ac6?text=Campaign'">
                
                <!-- Status Badge -->
                <!-- Status Badge -->
                ${campaign.customBadge
            ? `<span class="absolute top-3 right-3 ${campaign.customBadge.className} text-xs px-3 py-1 rounded-full font-medium shadow-sm">${campaign.customBadge.text}</span>`
            : (campaign.isActive && (!campaign.deadline || campaign.deadline * 1000 > Date.now()))
                ? '<span class="absolute top-3 right-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">Aktif</span>'
                : '<span class="absolute top-3 right-3 bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">Selesai</span>'
        }
            </div>
            
            <!-- Campaign Info -->
            <div class="p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    ${campaign.title}
                </h3>
                
                <!-- Progress Bar -->
                <div class="mb-3">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-500">Terkumpul</span>
                        <span class="text-blue-600 font-bold">${campaign.progress}%</span>
                    </div>
                    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full transition-all duration-500"
                             style="width: ${Math.min(campaign.progress, 100)}%; background-color: #467ac6;"></div>
                    </div>
                </div>
                
                <!-- Stats -->
                <div class="flex justify-between items-center text-sm">
                    <div>
                        <span class="text-gray-900 font-bold">${parseFloat(campaign.totalRaised).toFixed(3)} ETH</span>
                        <span class="text-gray-500"> / ${parseFloat(campaign.targetAmount).toFixed(3)} ETH</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render detail kampanye di halaman detail
 * 
 * @param {object} campaign - Data kampanye
 */
function renderCampaignDetail(campaign) {
    // Update judul
    const titleEl = document.getElementById('campaign-title');
    if (titleEl) titleEl.textContent = campaign.title;

    // Update gambar
    const imageEl = document.getElementById('campaign-image');
    if (imageEl) {
        // Add placeholder styling
        imageEl.classList.add('bg-gray-300', 'animate-pulse');

        imageEl.onload = function () {
            this.classList.remove('bg-gray-300', 'animate-pulse');
        };

        imageEl.src = campaign.imageUrl || 'https://placehold.co/800x400/e5e7eb/4b5563?text=Campaign';

        imageEl.onerror = function () {
            this.src = 'https://placehold.co/800x400/e5e7eb/4b5563?text=Campaign';
            this.classList.remove('bg-gray-300', 'animate-pulse');
        };
    }

    // Update deskripsi
    const descEl = document.getElementById('campaign-description');
    if (descEl) descEl.textContent = campaign.description;

    // Update progress
    const progressEl = document.getElementById('campaign-progress');
    if (progressEl) progressEl.style.width = `${Math.min(campaign.progress, 100)}%`;

    const progressTextEl = document.getElementById('campaign-progress-text');
    if (progressTextEl) progressTextEl.textContent = `${campaign.progress}%`;

    // Update raised amount
    const raisedEl = document.getElementById('campaign-raised');
    if (raisedEl) raisedEl.textContent = `${parseFloat(campaign.totalRaised).toFixed(3)} ETH`;

    // Update target amount
    const targetEl = document.getElementById('campaign-target');
    if (targetEl) targetEl.textContent = `${parseFloat(campaign.targetAmount).toFixed(3)} ETH`;

    // Update status
    const statusEl = document.getElementById('campaign-status');
    if (statusEl) {
        if (campaign.isActive && (!campaign.deadline || campaign.deadline * 1000 > Date.now())) {
            statusEl.innerHTML = '<span class="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">Aktif</span>';
        } else {
            statusEl.innerHTML = '<span class="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-sm">Selesai</span>';
        }
    }

    // Update tanggal dibuat
    const dateEl = document.getElementById('campaign-date');
    if (dateEl) dateEl.textContent = campaign.createdDate;
}

// ============================================
// LEADERBOARD UI - Render Leaderboard
// ============================================

/**
 * Render tabel leaderboard top donatur
 * 
 * @param {Array} leaderboard - Array data leaderboard
 * @param {string} containerId - ID container element
 */
function renderLeaderboard(leaderboard, containerId = 'leaderboard-table') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (leaderboard.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-8 text-gray-400">
                    Belum ada donatur
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = leaderboard.map((donor, index) => {
        // Badge untuk top 3
        let rankBadge = '';
        if (index === 0) rankBadge = '🥇';
        else if (index === 1) rankBadge = '🥈';
        else if (index === 2) rankBadge = '🥉';
        else rankBadge = `#${index + 1}`;

        return `
            <tr class="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                <td class="py-3 px-4 text-center">
                    <span class="text-lg">${rankBadge}</span>
                </td>
                <td class="py-3 px-4">
                    <a href="${window.DonaConfig.getEtherscanAddressUrl(donor.address)}" 
                       target="_blank"
                       class="text-blue-600 hover:text-blue-800 font-mono text-sm">
                        ${window.DonaWallet.formatAddress(donor.address)}
                    </a>
                </td>
                <td class="py-3 px-4 text-right">
                    <span class="text-blue-600 font-bold">${parseFloat(donor.amount).toFixed(3)}</span>
                    <span class="text-blue-600 text-sm"> ETH</span>
                </td>
                <td class="py-3 px-4 text-center text-sm text-gray-500">
                    ${donor.txCount || 1} Tx
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// DONATION FEED UI - Render Live Feed
// ============================================

/**
 * Render live donation feed
 * 
 * @param {Array} donations - Array data donasi
 * @param {string} containerId - ID container element
 * @param {number} limit - Jumlah donasi yang ditampilkan
 */
function renderDonationFeed(donations, containerId = 'donation-feed', limit = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Ambil donasi terbaru
    const recentDonations = donations.slice(-limit).reverse();

    if (recentDonations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-hand-holding-heart text-3xl mb-3"></i>
                <p>Belum ada donasi</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recentDonations.map(donation => `
        <div class="donation-item flex items-center gap-4 p-4 bg-gray-100 rounded-xl transition-colors shadow-sm">
            <!-- Avatar -->
            <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-blue-600">
                <i class="fas fa-user"></i>
            </div>
            
            <!-- Info -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <a href="${window.DonaConfig.getEtherscanAddressUrl(donation.donor)}" 
                       target="_blank"
                       class="text-blue-600 hover:text-blue-800 font-mono text-sm truncate font-medium">
                        ${donation.donorShort}
                    </a>
                    ${donation.nftMinted ? '<span class="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded">🏆 NFT</span>' : ''}
                </div>
                <p class="text-gray-500 text-xs">${donation.timeAgo}</p>
            </div>
            
            <!-- Amount -->
            <div class="text-right">
                <p class="text-gray-900 font-bold">${parseFloat(donation.amount).toFixed(3)} ETH</p>
                <a href="${donation.txUrl}" target="_blank" class="text-xs text-blue-500 hover:text-blue-700">
                    <i class="fas fa-external-link-alt"></i> Tx
                </a>
            </div>
        </div>
    `).join('');
}

// ============================================
// AUDIT TABLES UI - Tabel Audit
// ============================================

/**
 * Render tabel dana masuk untuk halaman audit
 * 
 * @param {Array} donations - Array data donasi
 * @param {string} containerId - ID container element
 * @param {Array} campaigns - Array data kampanye untuk lookup judul
 */
function renderIncomingFundsTable(donations, containerId = 'incoming-funds-table', campaigns = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build campaign lookup map
    const campaignMap = {};
    campaigns.forEach(c => {
        campaignMap[c.id] = c.title;
    });

    if (donations.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-400">
                    Belum ada transaksi masuk
                </td>
            </tr>
        `;
        return;
    }

    // Sort by descending
    const sortedDonations = [...donations].reverse();
    container.innerHTML = sortedDonations.map(donation => {
        // Determine tier based on amount (same logic as profile page)
        let tier = 'Bronze';
        let tierClass = 'tier-bronze';
        const amount = parseFloat(donation.amount);

        if (donation.tier) {
            tier = donation.tier;
            tierClass = `tier-${donation.tier.toLowerCase()}`;
        } else if (amount >= 0.1) {
            tier = 'Gold';
            tierClass = 'tier-gold';
        } else if (amount >= 0.05) {
            tier = 'Silver';
            tierClass = 'tier-silver';
        }

        const tierBadge = donation.nftMinted
            ? `<span class="tier-badge ${tierClass}">${tier}</span>`
            : '<span class="text-gray-500"><i class="fas fa-minus"></i></span>';

        const campaignTitle = campaignMap[donation.campaignId] || `Kampanye #${donation.campaignId}`;

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-sm text-gray-500">${donation.date}</td>
            <td class="py-3 px-4">
                <a href="detail.html?id=${donation.campaignId}" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    ${campaignTitle}
                </a>
            </td>
            <td class="py-3 px-4 text-sm text-gray-900">Donasi diterima</td>
            <td class="py-3 px-4">
                <span class="font-medium text-sm" style="color: #3fbb52;">+${amount.toFixed(3)} ETH</span>
            </td>
            <td class="py-3 px-4">
                <a href="${window.DonaConfig.getEtherscanAddressUrl(donation.donor)}" 
                   target="_blank"
                   class="text-gray-600 hover:text-blue-600 font-mono text-sm">
                    ${donation.donorShort}
                </a>
            </td>
            <td class="py-3 px-4">
                <a href="${donation.txUrl}" 
                   target="_blank"
                   class="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1">
                    <span class="font-mono truncate max-w-[100px]">${donation.txHash.substring(0, 10)}...</span>
                    <i class="fas fa-external-link-alt text-xs"></i>
                </a>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Render tabel dana keluar untuk halaman audit
 * 
 * @param {Array} expenses - Array data pengeluaran
 * @param {string} containerId - ID container element
 * @param {Array} campaigns - Array data kampanye untuk lookup judul
 */
function renderOutgoingFundsTable(expenses, containerId = 'outgoing-funds-table', campaigns = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build campaign lookup map
    const campaignMap = {};
    campaigns.forEach(c => {
        campaignMap[c.id] = c.title;
    });

    if (expenses.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-400">
                    Belum ada transaksi keluar
                </td>
            </tr>
        `;
        return;
    }

    // Sort by descending
    const sortedExpenses = [...expenses].reverse();
    container.innerHTML = sortedExpenses.map(expense => {
        const campaignTitle = expense.campaignId
            ? (campaignMap[expense.campaignId] || `Kampanye #${expense.campaignId}`)
            : '-';
        const campaignLink = expense.campaignId
            ? `<a href="detail.html?id=${expense.campaignId}" class="text-blue-600 hover:text-blue-800 text-sm font-medium">${campaignTitle}</a>`
            : '<span class="text-gray-500">-</span>';

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-sm text-gray-500">${expense.date}</td>
            <td class="py-3 px-4">
                ${campaignLink}
            </td>
            <td class="py-3 px-4 text-sm text-gray-900">${expense.description}</td>
            <td class="py-3 px-4">
                <span class="font-medium text-sm" style="color: #ff3746;">-${parseFloat(expense.amount).toFixed(3)} ETH</span>
            </td>
            <td class="py-3 px-4">
                <a href="${window.DonaConfig.getEtherscanAddressUrl(expense.recipient)}" 
                   target="_blank"
                   class="text-gray-600 hover:text-blue-600 font-mono text-sm">
                    ${expense.recipientShort}
                </a>
            </td>
            <td class="py-3 px-4">
                <a href="${expense.txUrl}" 
                   target="_blank"
                   class="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1">
                    <span class="font-mono truncate max-w-[100px]">${expense.txHash.substring(0, 10)}...</span>
                    <i class="fas fa-external-link-alt text-xs"></i>
                </a>
            </td>
        </tr>
    `;
    }).join('');
}

// ============================================
// NFT GALLERY UI - Gallery NFT
// ============================================

/**
 * Render gallery NFT di halaman profil
 * 
 * @param {Array} nfts - Array data NFT
 * @param {string} containerId - ID container element
 */
function renderNFTGallery(nfts, containerId = 'nft-gallery') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (nfts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400">
                    <i class="fas fa-image text-4xl mb-4"></i>
                    <p>Belum memiliki NFT sertifikat</p>
                    <p class="text-sm mt-2">Donasi minimal 0.01 ETH untuk mendapatkan NFT</p>
                </div>
            </div>
        `;
        return;
    }

    // Sort NFTs by tokenId descending (Newest First)
    const sortedNFTs = [...nfts].sort((a, b) => b.tokenId - a.tokenId);

    container.innerHTML = sortedNFTs.map(nft => {
        // Parse image dari tokenURI (format data:application/json;base64,...)
        let imageUrl = '';
        let tierName = 'Bronze';
        try {
            const base64Data = nft.tokenURI.split(',')[1];
            const jsonString = atob(base64Data);
            const metadata = JSON.parse(jsonString);
            imageUrl = metadata.image;

            // Konversi ipfs:// ke gateway URL
            if (imageUrl.startsWith('ipfs://')) {
                const cid = imageUrl.replace('ipfs://', '');
                imageUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
            }

            // Ambil tier dari attributes
            const tierAttr = metadata.attributes?.find(a => a.trait_type === 'Tier');
            if (tierAttr) tierName = tierAttr.value;
        } catch (e) {
            imageUrl = 'https://placehold.co/300x300/1f2937/6366f1?text=NFT';
        }

        // Tier badge class
        const tierClass = `tier-${tierName.toLowerCase()}`;

        return `
            <div class="nft-card-square w-[280px] flex-shrink-0 snap-center">
                <!-- Tier Badge -->
                <div class="nft-tier-badge">
                    <span class="tier-badge ${tierClass}">
                        <i class="fas fa-gem text-xs"></i>
                        ${tierName}
                    </span>
                </div>
                
                <!-- Token ID Badge -->
                <div class="nft-id-badge">#${nft.tokenId}</div>
                
                <!-- NFT Image -->
                <img src="${imageUrl}" 
                     alt="Certificate #${nft.tokenId}"
                     onerror="this.src='https://placehold.co/300x300/1f2937/6366f1?text=NFT'">
                
                <!-- Overlay Info -->
                <div class="nft-overlay">
                    <p class="text-white font-semibold text-sm truncate">${nft.campaignTitle}</p>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-white font-bold text-sm">${parseFloat(nft.amount).toFixed(3)} ETH</span>
                        <span class="text-blue-100 text-xs">${nft.date}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render tabel riwayat donasi di halaman profil
 * 
 * @param {Array} donations - Array data donasi
 * @param {string} containerId - ID container element
 */
function renderDonationHistory(donations, containerId = 'donation-history-table', campaigns = [], page = 1, itemsPerPage = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build campaign lookup map
    const campaignMap = {};
    campaigns.forEach(c => {
        campaignMap[c.id] = c.title;
    });

    if (donations.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-400">
                    Belum ada riwayat donasi
                </td>
            </tr>
        `;
        return;
    }

    // Sort by descending
    const sortedDonations = [...donations].reverse();

    // PAGINATION LOGIC
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDonations = sortedDonations.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedDonations.length / itemsPerPage);

    // Render Rows
    container.innerHTML = paginatedDonations.map(donation => {
        // Determine tier based on amount
        let tier = 'Bronze';
        let tierClass = 'tier-bronze';
        const amount = parseFloat(donation.amount);

        if (donation.tier) {
            tier = donation.tier;
            tierClass = `tier-${donation.tier.toLowerCase()}`;
        } else if (amount >= 0.1) {
            tier = 'Gold';
            tierClass = 'tier-gold';
        } else if (amount >= 0.05) {
            tier = 'Silver';
            tierClass = 'tier-silver';
        }

        const tierBadge = donation.nftMinted
            ? `<span class="tier-badge ${tierClass}">${tier}</span>`
            : '<span class="text-gray-500">-</span>';

        const campaignTitle = campaignMap[donation.campaignId] || `Kampanye #${donation.campaignId}`;
        // Attach title to donation object for PDF generation
        donation.campaignTitle = campaignTitle;

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-sm text-gray-500">${donation.date}</td>
            <td class="py-3 px-4">
                <a href="detail.html?id=${donation.campaignId}" class="text-blue-600 hover:text-blue-800 font-medium text-sm line-clamp-1">
                    ${campaignTitle}
                </a>
            </td>
            <td class="py-3 px-4">
                <span class="text-green-600 font-medium text-sm">${amount.toFixed(3)} ETH</span>
            </td>
            <td class="py-3 px-4 text-center">
                ${tierBadge}
            </td>
            <td class="py-3 px-4">
                <button onclick="window.DonaUI.downloadCertificatePDF(${JSON.stringify(donation).replace(/"/g, '&quot;')})"
                        class="text-blue-500 hover:text-blue-600 text-sm">
                    <i class="fas fa-download"></i> PDF
                </button>
            </td>
        </tr>
    `;
    }).join('');

    // RENDER PAGINATION CONTROLS
    const paginationContainer = document.getElementById('donation-pagination');
    if (paginationContainer) {
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            paginationContainer.classList.add('hidden');
        } else {
            paginationContainer.classList.remove('hidden');
            paginationContainer.innerHTML = `
                <button 
                    onclick="window.handleDonationPagination(${page - 1})"
                    class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    ${page === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <span class="text-sm text-gray-600 font-medium">
                    Halaman ${page} dari ${totalPages}
                </span>

                <button 
                    onclick="window.handleDonationPagination(${page + 1})"
                    class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    ${page === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
    }
}

// ============================================
// STATS UI - Render Statistik
// ============================================

/**
 * Render statistik transparansi di homepage
 * 
 * @param {object} stats - Data statistik dari kontrak
 */
function renderTransparencyStats(stats) {
    // Total dana tersalurkan
    const totalSpentEl = document.getElementById('total-spent');
    if (totalSpentEl) {
        totalSpentEl.textContent = `${parseFloat(stats.totalSpent).toFixed(3)} ETH`;
    }

    // Total dana terkumpul
    const totalReceivedEl = document.getElementById('total-received');
    if (totalReceivedEl) {
        totalReceivedEl.textContent = `${parseFloat(stats.totalReceived).toFixed(3)} ETH`;
    }

    // Jumlah donasi
    const totalDonationsEl = document.getElementById('total-donations-count');
    if (totalDonationsEl) {
        totalDonationsEl.textContent = stats.totalDonations;
    }

    // Saldo kontrak
    const balanceEl = document.getElementById('contract-balance');
    if (balanceEl) {
        balanceEl.textContent = `${parseFloat(stats.contractBalance).toFixed(3)} ETH`;
    }
}

// ============================================
// SWEETALERT2 MODALS - Pop-up Messages
// ============================================

/**
 * Tampilkan modal sukses donasi
 * 
 * @param {string} amount - Jumlah donasi dalam ETH
 * @param {string} txHash - Hash transaksi
 * @param {boolean} nftMinted - Apakah NFT di-mint
 * 
 * PENJELASAN:
 * Menggunakan SweetAlert2 untuk menampilkan popup yang menarik
 * setelah donasi berhasil
 */
function showDonationSuccessModal(amount, txHash, nftMinted) {
    const config = window.DonaConfig;

    // Buat HTML untuk info NFT jika di-mint
    const nftInfo = nftMinted
        ? '<p class="text-green-400 mt-3"><i class="fas fa-certificate"></i> Sertifikat NFT telah dikirim ke wallet Anda!</p>'
        : '';

    Swal.fire({
        icon: 'success',
        title: 'Donasi Berhasil!',
        html: `
            <div class="text-center">
                <p class="text-xl font-bold text-blue-600 mb-2">${amount} ETH</p>
                <p class="text-gray-600">Terima kasih atas donasi Anda</p>
                ${nftInfo}
            </div>
        `,
        footer: `<a href="${config.getEtherscanTxUrl(txHash)}" target="_blank" class="text-blue-500 hover:text-blue-700">
            <i class="fas fa-external-link-alt"></i> Lihat di Etherscan
        </a>`,
        background: '#ffffff',
        color: '#1f2122',
        confirmButtonColor: '#467ac6',
        confirmButtonText: 'Tutup'
    });
}

/**
 * Tampilkan modal error
 * 
 * @param {string} title - Judul error
 * @param {string} message - Pesan error
 */
function showErrorModal(title, message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        background: '#ffffff',
        color: '#1f2122',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tutup'
    });
}

/**
 * Tampilkan modal sukses umum
 * 
 * @param {string} title - Judul
 * @param {string} message - Pesan
 */
function showSuccessModal(title, message) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: message,
        background: '#ffffff',
        color: '#1f2122',
        confirmButtonColor: '#467ac6',
        confirmButtonText: 'OK'
    });
}

/**
 * Tampilkan toast notification
 * 
 * @param {string} message - Pesan
 * @param {string} type - Tipe (success/error/warning/info)
 */
function showToast(message, type = 'info') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#ffffff',
        color: '#1f2122',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    Toast.fire({
        icon: type,
        title: message
    });
}

/**
 * Tampilkan loading overlay
 * 
 * @param {string} message - Pesan loading
 */
function showLoading(message = 'Memproses...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1f2122',
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Tutup loading overlay
 */
function hideLoading() {
    Swal.close();
}

/**
 * Tampilkan konfirmasi
 * 
 * @param {string} title - Judul
 * @param {string} message - Pesan
 * @returns {Promise<boolean>} true jika user konfirmasi
 */
async function showConfirm(title, message) {
    const result = await Swal.fire({
        icon: 'question',
        title: title,
        text: message,
        showCancelButton: true,
        confirmButtonColor: '#467ac6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal',
        background: '#ffffff',
        color: '#1f2122'
    });

    return result.isConfirmed;
}

// ============================================
// PDF GENERATION - Cetak Sertifikat
// ============================================

/**
 * Download sertifikat donasi sebagai PDF
 * 
 * @param {object} donation - Data donasi
 * 
 * PENJELASAN:
 * Menggunakan jsPDF untuk generate PDF sertifikat
 * yang berisi informasi donasi
 */
/**
 * Generate dan download sertifikat donasi sebagai PDF
 * 
 * @param {object} donation - Data donasi
 */
async function downloadCertificatePDF(donation) {
    // Pastikan jsPDF tersedia
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        window.DonaUI.showErrorModal('Error', 'Library jsPDF tidak tersedia');
        return;
    }

    try {
        window.DonaUI.showLoading('Menyiapkan sertifikat...');

        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Load Assets (Logo & NFT)
        const logoUrl = 'img/logo pdf.png';
        let logoBase64 = null;
        let nftImageBase64 = null;

        try {
            logoBase64 = await loadImageToBase64(logoUrl);
        } catch (e) {
            console.warn('Failed to load logo:', e);
        }

        // Fetch NFT Image if eligible
        if (donation.amount >= 0.01) {
            try {
                // Try to find the specific NFT for this donation
                const nfts = await window.DonaContract.getNFTsByOwner(donation.donor);
                // Match by txHash if possible, or fallback
                const match = nfts.find(n => n.txHash && n.txHash.toLowerCase() === donation.txHash.toLowerCase());

                if (match && match.tokenURI) {
                    // Parse tokenURI to get image URL
                    let imageUrl = match.imageUrl; // getNFTsByOwner already parses it hopefully, or we use tokenURI logic
                    if (!imageUrl) {
                        // Manual parse if needed (simplified from renderNFTGallery logic)
                        const base64Data = match.tokenURI.split(',')[1];
                        const metadata = JSON.parse(atob(base64Data));
                        imageUrl = metadata.image;
                        if (imageUrl.startsWith('ipfs://')) {
                            imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.replace('ipfs://', '')}`;
                        }
                    }

                    if (imageUrl) {
                        nftImageBase64 = await loadImageToBase64(imageUrl);
                    }
                }
            } catch (e) {
                console.warn('Failed to load NFT image:', e);
            }
        }

        // 2. Setup Document Defaults (Background Putih)
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
        doc.setTextColor(31, 41, 55); // Gray-900

        // 3. Header Section
        let yPos = 20;

        // Logo
        if (logoBase64) {
            const logoW = 60;
            const logoH = 15; // Proper aspect ratio for donachain text logo
            doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, yPos, logoW, logoH);
            yPos += logoH + 5;
        } else {
            yPos += 5;
        }

        // Subtitle
        doc.setFont('helvetica', 'normal'); // Fallback for Poppins
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // Gray-500
        doc.text('Platform Donasi Transparan Berbasis Blockchain', pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        // Main Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55); // Gray-900
        doc.text('Detail transaksi donasi Anda tercatat di blockchain.', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // 4. Content Section
        doc.setFontSize(14);
        doc.setTextColor(75, 85, 99); // Gray-600
        doc.text('Informasi Donasi', 20, yPos);

        // Line separator
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPos + 3, pageWidth - 20, yPos + 3);
        yPos += 12;

        // Data Fields
        const startXLabel = 20;
        const startXValue = 70;
        const lineHeight = 10;
        doc.setFontSize(11);

        // Helper to draw row
        const drawRow = (label, value) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128); // Label color
            doc.text(label, startXLabel, yPos);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55); // Value color
            // Handle long values (like address/title)
            const splitValue = doc.splitTextToSize(value, pageWidth - startXValue - 20);
            doc.text(splitValue, startXValue, yPos);

            yPos += (lineHeight * splitValue.length);
        };

        drawRow('Judul Donasi', donation.campaignTitle || `Kampanye #${donation.campaignId}`);
        drawRow('Tanggal', donation.date || '-');
        drawRow('Jumlah', `${parseFloat(donation.amount).toFixed(4)} ETH`); // Use 4 decimals for precision
        drawRow('Alamat Donatur', donation.donor);

        yPos += 5; // Extra spacing

        // Transaction Hash
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('Transaction Hash:', 20, yPos);
        yPos += 7;

        doc.setFont('helvetica', 'bold'); // Courier for monospace look? User said bigger font.
        doc.setFontSize(12); // Bigger
        doc.setTextColor(37, 99, 235); // Blue link color
        const txHash = donation.txHash || '-';
        doc.textWithLink(txHash, 20, yPos, { url: window.DonaConfig.getEtherscanTxUrl(txHash) });
        yPos += 20;

        // 5. NFT Section
        if (nftImageBase64) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(34, 197, 94); // Green
            doc.text('* NFT Sertifikat telah dikirim ke wallet Anda', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;

            // Draw NFT Image
            const imgSize = 80;
            // Check remaining space
            if (yPos + imgSize > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                yPos = 30;
            }

            doc.addImage(nftImageBase64, 'PNG', (pageWidth - imgSize) / 2, yPos, imgSize, imgSize);
            yPos += imgSize + 10;
        } else if (donation.amount >= 0.01) {
            // Text only if image failed
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(34, 197, 94);
            doc.text('* NFT Sertifikat telah dikirim ke wallet Anda', pageWidth / 2, yPos, { align: 'center' });
        }
        // 6. Thank You Message
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55); // Gray-900
        doc.text('Terima kasih telah melakukan donasi', pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;
        doc.text('melalui platform kami.', pageWidth / 2, yPos, { align: 'center' });

        // 7. Footer
        const footerY = doc.internal.pageSize.getHeight() - 20;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175); // Gray-400
        doc.text('Dokumen ini dihasilkan secara otomatis oleh platform Donachain.', pageWidth / 2, footerY, { align: 'center' });

        // Save PDF
        doc.save(`donachain-certificate-${donation.id}.pdf`);

        window.DonaUI.hideLoading();
        window.DonaUI.showToast('Sertifikat berhasil diunduh!', 'success');

    } catch (error) {
        console.error('PDF Generation Error:', error);
        window.DonaUI.hideLoading();
        window.DonaUI.showErrorModal('Gagal', 'Terjadi kesalahan saat membuat PDF: ' + error.message);
    }
}

/**
 * Helper to load image from URL to Base64
 */
function loadImageToBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(e);
        img.src = url;
    });
}

// ============================================
// ADMIN UI - Render Admin Panel
// ============================================

/**
 * Render tabel kampanye di admin panel
 * 
 * @param {Array} campaigns - Array data kampanye
 * @param {string} containerId - ID container element
 */
function renderAdminCampaignTable(campaigns, containerId = 'admin-campaign-table') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (campaigns.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-400">
                    Belum ada kampanye
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = campaigns.map(campaign => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-gray-900 font-medium text-sm">#${campaign.id}</td>
            <td class="py-3 px-4 text-sm">
                <a href="detail.html?id=${campaign.id}" class="text-blue-600 hover:text-blue-800 font-medium">
                    ${campaign.title}
                </a>
            </td>
            <td class="py-3 px-4 text-sm">
                <span class="text-blue-600 font-medium">${parseFloat(campaign.totalRaised).toFixed(3)}</span>
                <span class="text-gray-500"> / ${parseFloat(campaign.targetAmount).toFixed(3)} ETH</span>
            </td>
            <td class="py-3 px-4 text-gray-600 text-sm">
                ${campaign.deadlineDate}
            </td>
            <td class="py-3 px-4 text-center">
                ${(() => {
            const isFinished = (campaign.isActive && (campaign.isExpired || parseFloat(campaign.progress) >= 100));
            if (!campaign.isActive) {
                return '<span class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">Nonaktif</span>';
            } else if (isFinished) {
                return '<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">Selesai</span>';
            } else {
                return '<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Aktif</span>';
            }
        })()}
            </td>
            <td class="py-3 px-4">
                <button onclick="window.DonaApp.toggleCampaignStatus(${campaign.id}, ${!campaign.isActive})"
                        class="px-3 py-1 rounded-lg text-sm ${campaign.isActive
            ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
            : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
        } transition-colors">
                    ${campaign.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.DonaUI = {
    // Navbar
    updateWalletUI,
    updateAdminMenuVisibility,
    toggleDropdown,

    // Mobile Menu
    toggleMobileMenu,
    initMobileMenu,

    // Campaign
    renderCampaignCards,
    renderCampaignDetail,

    // Leaderboard
    renderLeaderboard,

    // Donation Feed
    renderDonationFeed,

    // Audit Tables
    renderIncomingFundsTable,
    renderOutgoingFundsTable,

    // NFT Gallery
    renderNFTGallery,
    renderDonationHistory,

    // Stats
    renderTransparencyStats,

    // Modals
    showDonationSuccessModal,
    showErrorModal,
    showSuccessModal,
    showToast,
    showLoading,
    hideLoading,
    showConfirm,

    // PDF
    downloadCertificatePDF,

    // Admin
    renderAdminCampaignTable
};

console.log('✅ Donachain UI module loaded successfully');
