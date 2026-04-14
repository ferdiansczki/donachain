# Implementasi Kode Smart Contract

Bagian ini menguraikan struktur dasar dan implementasi kode penting pada smart contract `DonationManager.sol` serta cuplikan integrasi sistem.

## 1. Pembatasan Hak Akses (Access Control)

Sistem mengimplementasikan pembatasan hak akses menggunakan modifier `onlyOwner` menggunakan pustaka `Ownable` dari OpenZeppelin.

**Implementasi Modifier onlyOwner:**

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

// Kontrak mewarisi Ownable, menjadikan deployer sebagai admin
contract DonachainNFT is ERC721, Ownable {

    // ... deklarasi state variables ...

    // Fungsi setDonationManager hanya bisa dipanggil oleh Admin
    function setDonationManager(address _donationManager) external onlyOwner {
        // ...
    }
}
```

## 2. Mitigasi Serangan Reentrancy

Keamanan smart contract dikelola menggunakan modifier `nonReentrant` dari pustaka `ReentrancyGuard` OpenZeppelin untuk mencegah pemanggilan rekursif.

**Cuplikan Kode:**

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DonationManager is Ownable, ReentrancyGuard {

    // ...

    // Contoh penerapan modifier nonReentrant pada fungsi transaksi eksternal
    function donate(uint256 campaignId) external payable nonReentrant {
        // ... (Logika donasi yang memicu minting NFT aman terhadap reentrancy) ...
    }
}
```

## 3. Logika Bisnis dan Validasi Kampanye

Sebelum memproses dana, smart contract harus memvalidasi kelayakan melalui pengecekan kondisi.

**Cuplikan Kode pada Fungsi `donate`:**

```solidity
function donate(uint256 campaignId) external payable nonReentrant {
    // Pengecekan validasi sebelum mengeksekusi logika pencatatan donasi
    require(campaignId > 0 && campaignId <= _nextCampaignId, "...");
    require(campaigns[campaignId].isActive, "...");
    require(block.timestamp <= campaigns[campaignId].deadline, "...");
    require(msg.value > 0, "...");

    // ...
}
```

## 4. Integrasi NFT sebagai Bukti Donasi

Pencetakan NFT dipicu secara otomatis antar-kontrak.

**Cuplikan Kode pada Fungsi `donate`:**

```solidity
    // ... lanjutan dari fungsi donate ...

    // Memastikan kontrak NFT terhubung & donasi melebihi batas minimum
    if (address(nftContract) != address(0) && msg.value >= MIN_DONATION_FOR_NFT) {
        // Memanggil fungsi kontrak sekunder untuk minting NFT
        nftContract.mintCertificate(
            msg.sender,
            msg.value,
            campaignId,
            campaigns[campaignId].title,
            newDonation.txHash
        );
    }
```

## 5. Transparansi Penarikan Dana

Setiap kali administrator melakukan penarikan dana, dilakukan pencatatan state internal kemudian dipancarkan event log ke jaringan.

**Cuplikan Kode:**

```solidity
function withdrawWithLog(
    string memory description,
    address payable recipient,
    uint256 amount,
    uint256 campaignId
) external onlyOwner nonReentrant {
    // 1. Logika validasi dan pencatatan state internal
    // ...

    // 2. Transaksi transfer on-chain ke akun penerima manfaat
    // ...

    // 3. Emit event rekaman publik transparan ke jaringan Ethereum
    // ...
}
```

## 6. Cuplikan Artefak Integrasi Sistem (ABI)

Integrasi Frontend bergantung pada Application Binary Interface (ABI) dalam konfigurasi.

**Cuplikan Kode pada `config.js`:**

```javascript
// ... Definisi Event dan Function Signature yang dipanggil Frontend ...
const DONATION_MANAGER_ABI = [
  // Event Logs
  "event CampaignCreated(...)",
  "event DonationReceived(...)",

  // Fungsi Read
  "function getActiveCampaigns() view returns (...)",
  "function getStats() view returns (...)",

  // Fungsi Write
  "function donate(uint256 campaignId) payable",
  "function withdrawWithLog(string description, address recipient, uint256 amount, uint256 campaignId)",
];
```
