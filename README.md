# 🔗 Donachain

<div align="center">

![Donachain Logo](frontend/img/donachain.png)

**Platform Donasi Transparan Berbasis Blockchain**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?logo=ethereum)](https://sepolia.etherscan.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.4.0-4E5EE4?logo=openzeppelin)](https://openzeppelin.com/)

[Demo](#demo) • [Fitur](#-fitur-utama) • [Tech Stack](#-tech-stack) • [Instalasi](#-instalasi) • [Deployment](#-deployment)

</div>

---

## 📖 Tentang

**Donachain** adalah platform donasi terdesentralisasi yang memanfaatkan teknologi blockchain Ethereum untuk memastikan transparansi penuh dalam setiap transaksi donasi. Setiap donasi tercatat secara permanen di blockchain dan dapat diverifikasi oleh siapa saja.

### Mengapa Donachain?

- 🔍 **100% Transparan** - Semua transaksi tercatat di blockchain publik
- 🎖️ **NFT Rewards** - Donatur mendapat sertifikat NFT sebagai apresiasi
- 🗳️ **Voting System** - Komunitas dapat berpartisipasi dalam pengambilan keputusan
- 📊 **Real-time Tracking** - Pantau progress kampanye secara langsung
- 🔒 **Secure & Trustless** - Tidak ada pihak ketiga yang mengelola dana

---

## ✨ Fitur Utama

### Untuk Donatur

- 💳 Connect wallet MetaMask dengan mudah
- 💰 Donasi menggunakan ETH (Sepolia Testnet)
- 🎨 NFT Sertifikat otomatis untuk donasi ≥ 0.01 ETH
- 📄 Download bukti donasi dalam format PDF
- 👤 Profil personal dengan riwayat donasi
- 🏆 Leaderboard donatur top

### Untuk Pengelola Kampanye

- 📝 Buat kampanye donasi dengan mudah
- 💵 Tarik dana dengan sistem approval
- 📈 Dashboard statistik real-time
- 📋 Laporan transparansi otomatis

### Sistem Transparansi

- 🔎 Audit trail untuk setiap transaksi
- 📊 Statistik platform real-time
- 🔗 Verifikasi langsung ke Etherscan
- 📑 Log aktivitas lengkap

---

## 🛠 Tech Stack

### Smart Contracts

| Technology   | Version | Description             |
| ------------ | ------- | ----------------------- |
| Solidity     | ^0.8.20 | Smart contract language |
| Hardhat      | ^2.19.0 | Development framework   |
| OpenZeppelin | ^5.4.0  | Security standards      |
| Ethereum     | Sepolia | Test network            |

### Frontend

| Technology        | Description            |
| ----------------- | ---------------------- |
| HTML5/CSS3        | Structure & styling    |
| JavaScript (ES6+) | Application logic      |
| Tailwind CSS      | Utility-first CSS      |
| Ethers.js         | Blockchain interaction |
| jsPDF             | PDF generation         |

---

## 📁 Struktur Proyek

```
donachain/
├── contracts/                 # Smart contracts
│   ├── DonationManager.sol   # Kelola kampanye & donasi
│   ├── DonachainNFT.sol      # NFT sertifikat donatur
│   └── Voting.sol            # Sistem voting
├── frontend/                  # Web interface
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript modules
│   ├── img/                  # Assets
│   └── *.html                # Pages
├── scripts/                   # Deployment scripts
├── artifacts/                 # Compiled contracts
├── hardhat.config.js         # Hardhat configuration
└── package.json              # Dependencies
```

---

## 🚀 Instalasi

### Prerequisites

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [MetaMask](https://metamask.io/) browser extension
- Sepolia ETH untuk testing (dari [faucet](https://sepoliafaucet.com/))

### Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/username/donachain.git
   cd donachain
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` dengan konfigurasi Anda:

   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   PRIVATE_KEY=your_wallet_private_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

4. **Compile smart contracts**
   ```bash
   npm run compile
   ```

---

## 📦 Deployment

### Deploy ke Sepolia Testnet

```bash
npm run deploy:sepolia
```

Setelah deployment berhasil, update alamat kontrak di `frontend/js/config.js`:

```javascript
const CONFIG = {
  DONATION_MANAGER_ADDRESS: "0x...",
  DONACHAIN_NFT_ADDRESS: "0x...",
  VOTING_ADDRESS: "0x...",
};
```

### Menjalankan Frontend

Gunakan live server atau buka `frontend/index.html` di browser:

```bash
# Menggunakan Live Server (VS Code Extension)
# Atau gunakan http-server
npx http-server frontend -p 5500
```

---

## 📱 Screenshots

| Homepage                      | Kampanye                                | Detail                            |
| ----------------------------- | --------------------------------------- | --------------------------------- |
| ![Home](screenshots/home.png) | ![Campaigns](screenshots/campaigns.png) | ![Detail](screenshots/detail.png) |

| Transparansi                    | Leaderboard                                 | Profil                              |
| ------------------------------- | ------------------------------------------- | ----------------------------------- |
| ![Audit](screenshots/audit.png) | ![Leaderboard](screenshots/leaderboard.png) | ![Profile](screenshots/profile.png) |

---

## 🔐 Smart Contracts

### DonationManager.sol

Mengelola kampanye dan donasi:

- Buat, edit, dan tutup kampanye
- Proses donasi dengan validasi
- Sistem withdrawal dengan approval
- Event logging untuk transparansi

### DonachainNFT.sol

NFT sertifikat untuk donatur:

- Auto-mint untuk donasi ≥ 0.01 ETH
- Metadata on-chain
- One NFT per donation per campaign
- ERC-721 compliant

### Voting.sol

Sistem voting untuk komunitas:

- Buat proposal
- Voting dengan token
- Hasil transparan

---

## 🧪 Testing

```bash
npm run test
```

---

## 🤝 Contributing

Kontribusi sangat diterima! Silakan:

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📞 Kontak

- **Email**: donachain@example.com
- **Twitter**: [@donachain](https://twitter.com/donachain)
- **Discord**: [Donachain Community](https://discord.gg/donachain)

---

<div align="center">

**Made with ❤️ for transparent donations**

⭐ Star this repo if you find it useful!

</div>
