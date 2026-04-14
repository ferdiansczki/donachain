# Diagram Sistem Keseluruhan — Arsitektur BCE

Diagram di dokumen ini adalah perwujudan 100% akurat dari *source code* aslimu. Kita tidak menggunakan penamaan *Controller* palsu (seperti *AppController*). Sebaliknya, skripsimu akan menampilkan nama file HTML dan JS-mu yang sebenarnya, dikelompokkan menggunakan standarisasi **Model-View-Controller (MVC) / BCE**.

- **Boundary (View)** = File-file `.html` (Antarmuka publik)
- **Control (Controller)** = File-file `.js` (`app.js` sebagai pusat pergerakan, dibantu `wallet.js` & `contract.js`)
- **Entity (Model)** = File-file `.sol` (*Smart Contracts*)

Hanya fungsi-fungsi/variabel penting yang dipanggil di siklus utama yang dimasukkan ke kotak *Class*.

---

## 1. Class Diagram (Versi BCE — Berbasis Class Diagram Medium)

Diagram ini menggunakan fondasi visual dan kelengkapan yang sama persis dengan **Class Diagram Medium** di artifact `class_diagram.md`, namun kelas `Frontend` kini dipecah menjadi **Boundary** (kelas antarmuka) dan **Control** (kelas proses) sesuai pola BCE yang telah kita diskusikan.

```mermaid
classDiagram
    direction TB

    class Ownable {
        <<abstract>>
        +owner() address
        +onlyOwner()
    }

    class ReentrancyGuard {
        <<abstract>>
        +nonReentrant()
    }

    class ERC721 {
        <<abstract>>
        +ownerOf(tokenId) address
    }

    class IDonachainNFT {
        <<interface>>
        +ownerOf(tokenId) address
        +donationDetails(tokenId) DonationDetail
    }

    class Tier {
        <<enumeration>>
        Bronze
        Silver
        Gold
        Special
    }

    class Campaign {
        <<struct>>
        +uint256 id
        +string title
        +string description
        +string imageCID
        +uint256 targetAmount
        +uint256 totalRaised
        +bool isActive
        +uint256 createdAt
        +uint256 deadline
        +address creator
    }

    class Donation {
        <<struct>>
        +uint256 id
        +address donor
        +uint256 campaignId
        +uint256 amount
        +uint256 timestamp
        +bytes32 txHash
        +bool nftMinted
    }

    class Expense {
        <<struct>>
        +uint256 id
        +string description
        +uint256 amount
        +address recipient
        +uint256 timestamp
        +bytes32 txHash
        +uint256 campaignId
    }

    class DonationDetail {
        <<struct>>
        +address donor
        +uint256 amount
        +uint256 campaignId
        +string campaignTitle
        +uint256 timestamp
        +bytes32 txHash
        +Tier tier
    }

    class DonationManager {
        +nftContract : DonachainNFT
        +campaigns : mapping
        +allDonations : Donation[]
        +allExpenses : Expense[]
        +createCampaign(title, desc, imageCID, target, deadline) uint256
        +donate(campaignId) payable
        +withdrawWithLog(desc, recipient, amount, campaignId)
        +getAllCampaigns() Campaign[]
        +getAllDonations() Donation[]
    }

    class DonachainNFT {
        +donationManager : address
        +donorTokens : mapping
        +donationDetails : mapping
        +mintCertificate(donor, amount, campaignId, title, txHash) uint256
        +getTokensByDonor(donor) uint256[]
    }

    class Voting {
        +nftContract : IDonachainNFT
        +campaignVotes : mapping
        +tokenUsed : mapping
        +vote(campaignId, tokenId)
        +hasVoted(tokenId) bool
    }

    class AntarmukaUtama {
        <<Boundary>>
        +tampilkanTombolConnect()
        +tampilkanDaftarKampanye()
        +tampilkanFormDonasi()
        +tampilkanFormPendaftaran()
        +tampilkanMenuTarikDana()
        +renderTabelRiwayat()
        +renderPapanPeringkat()
    }

    class KontrolerWeb3 {
        <<Control>>
        +connectWallet()
        +checkNetwork()
        +switchToSepolia()
    }

    class KontrolerPartisipasi {
        <<Control>>
        +handleDonateSubmit()
        +handleVoteClick()
    }

    class KontrolerKelolaKampanye {
        <<Control>>
        +handleCreateCampaign()
        +handleWithdraw()
    }

    class KontrolerDataPublik {
        <<Control>>
        +loadCampaignsPageData()
        +loadAuditPageData()
        +downloadAllCSV()
    }

    %% Inheritance (Generalization)
    Ownable <|-- DonationManager
    ReentrancyGuard <|-- DonationManager
    ERC721 <|-- DonachainNFT
    Ownable <|-- DonachainNFT
    Ownable <|-- Voting
    ReentrancyGuard <|-- Voting
    IDonachainNFT <|.. DonachainNFT : implements

    %% Composition
    DonationManager *-- Campaign
    DonationManager *-- Donation
    DonationManager *-- Expense
    DonachainNFT *-- DonationDetail
    DonachainNFT *-- Tier

    %% Dependency (antar Smart Contract)
    DonationManager --> DonachainNFT : calls mintCertificate
    Voting --> IDonachainNFT : reads ownerOf and donationDetails

    %% BCE: Boundary -> Control
    AntarmukaUtama --> KontrolerWeb3
    AntarmukaUtama --> KontrolerPartisipasi
    AntarmukaUtama --> KontrolerKelolaKampanye
    AntarmukaUtama --> KontrolerDataPublik

    %% BCE: Control -> Entity
    KontrolerWeb3 ..> DonationManager : interacts via Ethers.js
    KontrolerPartisipasi ..> DonationManager : interacts via Ethers.js
    KontrolerPartisipasi ..> Voting : interacts via Ethers.js
    KontrolerKelolaKampanye ..> DonationManager : interacts via Ethers.js
    KontrolerDataPublik ..> DonationManager : interacts via Ethers.js
```

---

## 2. Activity Diagram (Keseluruhan Alur dApp)

Memetakan jejak *User* sejak membuka tab *browser* hingga eksekusi akhir, menggunakan fungsi asli yang ada di dalam `app.js`.

```plantuml
@startuml Overall_Activity
skinparam activityBorderColor #111827
skinparam activityBackgroundColor #F8FAFC
skinparam activityDiamondBackgroundColor #FEF08A

start

:Membuka alamat web (index.html);

:**app.js**\n""handleConnectWallet()"";

:**wallet.js**\n""connectWallet()"";
note right: Memanggil MetaMask

if (Menu mana yang diakses?) then (Halaman Admin)
  if (Pilih Tindakan?) then (Buat Kampanye)
    :**app.js**\n""handleCreateCampaign()"";
    :**contract.js**\n""createCampaign()"";
  else (Tarik Dana)
    :**app.js**\n""handleWithdraw()"";
    :**contract.js**\n""withdrawWithLog()"";
  endif

elseif (Halaman Kampanye) then (Jelajah/Aksi)
  :**app.js**\n""loadCampaignsPageData()"";
  :**contract.js**\n""getAllCampaigns()"";
  
  if (Pilih Partisipasi?) then (Klik Donasi)
    :**app.js**\n""handleDonateSubmit()"";
    :**contract.js**\n""donate()"";
  else (Klik Vote)
    :**app.js**\n""handleVoteClick()"";
    :**contract.js**\n""voteForCampaign()"";
  endif

else (Halaman Audit/Transparansi)
  :**app.js**\n""loadAuditPageData()"";
  :**app.js**\n""downloadAllCSV()"";
endif

:Menunggu konfirmasi rantai blok (Sepolia);
:Tampilkan pembaruan ke Boundary (HTML);

stop
@enduml
```

---

## 3. Sequence Diagram (Detail Lintasan Logika Keseluruhan)

Diagram sekuensial ini meruntun eksekusi kode lapis per lapis persis seperti cara kode *Vanilla JS*-mu dirancang menjembatani HTML dengan Kontrak pintar `Solidity`.

```plantuml
@startuml Overall_Sequence
skinparam maxMessageSize 100
autonumber

actor "Pengguna" as User
boundary "Boundary (.html)" as UI
control "app.js\n(Event Router)" as App
control "wallet.js\n(DonaWallet)" as Wallet
control "contract.js\n(DonaContract)" as Cont
entity "DonationManager.sol" as DM
entity "Voting.sol" as Vote
entity "DonachainNFT.sol" as NFT

== 1. Autentikasi Dompet Web3 ==
User -> UI: Klik "Connect Wallet"
UI -> App: handleConnectWallet()
activate App
App -> Wallet: connectWallet()
activate Wallet
Wallet -> User: Prompts MetaMask Popup
User --> Wallet: Approve (Tanda Tangan)
Wallet --> App: Kembalikan Address & Provider
deactivate Wallet
App --> UI: Update UI "Terkoneksi"
deactivate App

== 2. Mengambil Daftar Kampanye ==
User -> UI: Buka campaigns.html
UI -> App: loadCampaignsPageData()
activate App
App -> Cont: getAllCampaigns()
activate Cont
Cont -> DM: Panggil getAllCampaigns()
DM --> Cont: Array Data Kampanye
Cont --> App: Kembalikan Object Kampanye
deactivate Cont
App --> UI: render array kampanye
deactivate App

== 3. Partisipasi (Donasi) ==
User -> UI: Submit form donasi pada detail.html
UI -> App: handleDonateSubmit(event)
activate App
App -> Cont: donate(campaignId, amount)
activate Cont
Cont -> DM: Mengeksekusi donate() {value: ETH}
activate DM
  
  opt Kondisi donasi >= target Wei
      DM -> NFT: mintCertificate(donor, metadataInfo)
      activate NFT
      NFT --> DM: Return tokenId
      deactivate NFT
  end

DM --> Cont: Return tx Receipt
deactivate DM
Cont --> App: Receipt & Status Sukses
deactivate Cont
App --> UI: Tampilkan sukses (Modal Alert)
deactivate App

== 4. Menggunakan Hak Suara (Voting) ==
User -> UI: Memilih campaign untuk divoting
UI -> App: handleVoteClick(event)
activate App
App -> Cont: voteForCampaign(campaignId, tokenId)
activate Cont
Cont -> Vote: Buka fungsi vote()
activate Vote
Vote --> Cont: Return Receipt Tx
deactivate Vote
Cont --> App: Status Berhasil
deactivate Cont
App --> UI: Trigger halaman dimuat ulang
deactivate App

== 5. Mengunduh Bukti Laporan (Audit) ==
User -> UI: Klik "Download CSV" di audit.html
UI -> App: downloadAllCSV()
activate App
App -> Cont: getAllDonations()
Cont --> App: Data Donasi Mentah
App -> App: Konversi array -> string CSV
App --> User: Paksa File Terunduh
deactivate App

@enduml
```
