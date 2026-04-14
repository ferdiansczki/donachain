# Demonstrasi Perbedaan Pola Sequence Diagram

Dokumen ini mendemonstrasikan secara visual perbedaan antara diagram asli (monolith) dengan diagram yang sudah dipecah menggunakan prinsip **Boundary-Control-Entity (BCE)** ala buku teori Rekayasa Perangkat Lunak.

---

### Versi Asli (Saat Ini Diterapkan di 9 File)

Pada versi ini, seluruh urusan "tampilan" dan "logika kode" ditekan masuk ke dalam **satu *lifeline* tunggal bernama Frontend**. Singkat, hemat tempat, namun secara teknis kurang riil.

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant FE as Frontend
    participant MM as MetaMask

    User->>FE: 1: Klik Connect Wallet
    activate FE
    FE->>FE: 2: isMetaMaskInstalled()
    FE->>MM: 3: eth_requestAccounts()
    activate MM
    MM->>User: 4: Popup persetujuan koneksi
    User->>MM: 5: Setujui
    MM-->>FE: 6: walletAddress
    deactivate MM
    FE->>MM: 7: checkNetwork()
    activate MM
    alt Bukan Sepolia
        FE->>MM: 8: switchToSepolia()
    end
    deactivate MM
    FE->>FE: 9: initWriteContracts()
    FE-->>User: 10: updateWalletUI(true, address)
    deactivate FE
```

---

### Versi Baru (Jika Menggunakan Pola Detail BCE)

Pada versi ini, Frontend dipecah sesuai tanggung jawabnya (*Single Responsibility Principle*). Ada yang murni mengurus tampilan UI saja (seperti **HalamanUtama**), dan ada yang murni mengurus sistem penarikan data dari backend (seperti **PengelolaKoneksi**).

Versi diagram seperti ini yang sangat diidam-idamkan oleh dosen penguji atau reviewer jurnal.

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant UI as HalamanUtama<br/>(Antarmuka / Boundary)
    participant Ctrl as PengelolaKoneksi<br/>(Logika / Controller)
    participant MM as MetaMask (Eksternal)

    User->>UI: 1: Klik Connect Wallet
    activate UI
    UI->>Ctrl: 2: prosesKoneksi()
    activate Ctrl
    Ctrl->>Ctrl: 3: isMetaMaskInstalled()
    Ctrl->>MM: 4: eth_requestAccounts()
    activate MM
    MM->>User: 5: Popup persetujuan koneksi
    User->>MM: 6: Setujui
    MM-->>Ctrl: 7: walletAddress
    deactivate MM
    Ctrl->>MM: 8: checkNetwork()
    activate MM
    alt Bukan Sepolia
        Ctrl->>MM: 9: switchToSepolia()
    end
    deactivate MM
    Ctrl->>Ctrl: 10: initWriteContracts()
    Ctrl-->>UI: 11: koneksiSukses(address)
    deactivate Ctrl
    UI-->>User: 12: Tombol berubah jadi Wallet Terhubung
    deactivate UI
```

---

**Analisis:**
Perhatikan perbedaannya: fungsi berat seperti `isMetaMaskInstalled()` sudah tidak dieksekusi di *HalamanUtama*, melainkan dititipkan ke *PengelolaKoneksi*. Ini membuktikan kodemu tidak numpuk "kotor" di berkas tampilan HTML/UI.

---

### Keselarasan dengan Class Diagram

Dengan mempertahankan gaya *Use Case* dan *Sequence Diagram* aslimu (di mana antarmuka sistem diwakili secara tunggal), maka **Class Diagram** yang mendampinginya akan berbentuk sangat kokoh dan kohesif. Seluruh fungsionalitas antarmuka dari segala penjuru (*connect wallet*, *render*, *download* PDF) akan dibungkus utuh ke dalam Class `Frontend` yang berperan sebagai *Boundary*, lalu berkomunikasi dengan Class *Smart Contract* di belakangnya (*Entity*).

```mermaid
classDiagram
    direction TB

    %% Komponen Tunggal Frontend (Boundary)
    class Frontend {
        <<Boundary>>
        +isMetaMaskInstalled() bool
        +checkNetwork() void
        +initWriteContracts() void
        +renderCampaignCards() void
        +filterCampaigns() void
        +renderIncomingFundsTable() void
        +renderLeaderboard() void
        +aggregateDonorData(donations) void
        +showDonationSuccessModal() void
        +downloadCertificatePDF(donation) void
    }

    %% Komponen Smart Contract (Entity)
    class DonationManager {
        <<Entity>>
        +createCampaign(...) uint256
        +getAllCampaigns() Campaign[]
        +donate(campaignId)
        +withdrawWithLog(...)
    }

    class DonachainNFT {
        <<Entity>>
        +mintCertificate(...) uint256
        +getTokensByDonor(donor) uint256[]
    }

    class Voting {
        <<Entity>>
        +vote(campaignId, tokenId)
        +hasVoted(tokenId) bool
    }

    %% Hubungan / Relasi (Dependency & Call)
    Frontend ..> DonationManager : berinteraksi (via Ethers.js)
    Frontend ..> DonachainNFT : berinteraksi (via Ethers.js)
    Frontend ..> Voting : berinteraksi (via Ethers.js)
    
    DonationManager --> DonachainNFT : memanggil mintCertificate()
    Voting ..> DonachainNFT : membaca ownerOf()
```

*(Catatan: Class Diagram di atas hanya menampilkan kerangka utamanya saja. Untuk struktur detail seperti `Ownable`, pewarisan `ERC721`, serta struktur data `Struct` bisa dirujuk ke tabel detail di dalam bab dokumentasi kelasmu).*

---

### Versi Pamungkas (Full BCE: Boundary - Control - Entity)

Jika kamu ingin menerapkan pola yang kita diskusikan (memecah UI murni berisi tombol/form, dan *Controller* yang berisi logika Use Case), maka wujud Class Diagramnya akan sangat detail dan profesional seperti ini. 

Diagram ini membagi lurus alirannya dari Kiri ke Kanan: **Antarmuka (B) ➔ Logika (C) ➔ Smart Contract (E)**.

```mermaid
classDiagram
    direction LR

    %% 1. LAPISAN BOUNDARY (FUNGSI PENAMPIL ANTARMUKA)
    namespace 1_Lapisan_Antarmuka_Browser {
        class AntarmukaUtama {
            <<Boundary>>
            +tampilkanTombolConnect()
            +tampilkanDaftarKampanye()
            +tampilkanFormDonasi()
            +tampilkanFormPendaftaran()
            +tampilkanMenuTarikDana()
            +renderTabelRiwayat()
            +renderPapanPeringkat()
            +munculkanPeringatanLogin()
        }
    }

    %% 2. LAPISAN CONTROL (LOGIKA USE CASE)
    namespace 2_Lapisan_Logika_Aplikasi {
        class KontrolerWeb3 {
            <<Control>>
            +cekMetaMask()
            +hubungkanAkun()
        }
        class KontrolerPartisipasi {
            <<Control>>
            +prosesDonasi(nominal)
            +prosesVoting(tokenId)
            +cekSyaratNFT()
        }
        class KontrolerKelolaKampanye {
            <<Control>>
            +validasiPembuatan()
            +eksekusiPenarikan()
        }
        class KontrolerDataPublik {
            <<Control>>
            +ambilDaftarKampanye()
            +ambilRiwayatDanLeaderboard()
        }
    }

    %% 3. LAPISAN ENTITY (SMART CONTRACT)
    namespace 3_Lapisan_Smart_Contract {
        class DonationManager {
            <<Entity>>
            +createCampaign(...)
            +donate(...)
            +withdrawWithLog(...)
        }
        class DonachainNFT {
            <<Entity>>
            +mintCertificate(...)
        }
        class Voting {
            <<Entity>>
            +vote(...)
        }
    }

    %% HUBUNGAN B -> C (UI melempar aksi ke Controller spesifik)
    AntarmukaUtama --> KontrolerWeb3
    AntarmukaUtama --> KontrolerPartisipasi
    AntarmukaUtama --> KontrolerKelolaKampanye
    AntarmukaUtama --> KontrolerDataPublik

    %% HUBUNGAN C -> E (Controller mengeksekusi on-chain)
    KontrolerPartisipasi --> DonationManager
    KontrolerPartisipasi --> DonachainNFT
    KontrolerPartisipasi --> Voting
    
    KontrolerKelolaKampanye --> DonationManager
    KontrolerDataPublik --> DonationManager
```

Versi kode **PlantUML**-nya:

```plantuml
@startuml Class_Diagram_BCE_Final

left to right direction
skinparam classAttributeIconSize 0

package "1. Lapisan Antarmuka (Boundary)" #F8FAFC {
    class AntarmukaUtama <<Boundary>> {
        + tampilkanTombolConnect()
        + tampilkanDaftarKampanye()
        + tampilkanFormDonasi()
        + tampilkanFormPendaftaran()
        + tampilkanMenuTarikDana()
        + renderTabelRiwayat()
        + renderPapanPeringkat()
    }
}

package "2. Lapisan Logika Dasar (Control)" #F0FDF4 {
    class KontrolerWeb3 <<Control>> {
        + hubungkanAkun()
    }
    class KontrolerPartisipasi <<Control>> {
        + prosesDonasi(nominal)
        + prosesVoting(tokenId)
    }
    class KontrolerKelola <<Control>> {
        + eksekusiPembuatan()
        + eksekusiPenarikan()
    }
    class KontrolerDataPublik <<Control>> {
        + ambilDaftarKampanye()
        + agregasiLeaderboard()
    }
}

package "3. Lapisan Smart Contract (Entity)" #FFFBEB {
    class DonationManager <<Entity>> {
        + donate(id)
        + createCampaign()
    }
    class DonachainNFT <<Entity>> {
        + mintCertificate()
    }
    class Voting <<Entity>> {
        + vote(id)
    }
}

' Relasi UI (Satu Jendela) ke banyak Control
AntarmukaUtama --> KontrolerWeb3
AntarmukaUtama --> KontrolerPartisipasi
AntarmukaUtama --> KontrolerKelola
AntarmukaUtama --> KontrolerDataPublik

' Relasi Control ke Entity
KontrolerPartisipasi --> DonationManager
KontrolerPartisipasi --> Voting
KontrolerPartisipasi --> DonachainNFT

KontrolerKelola --> DonationManager
KontrolerDataPublik --> DonationManager

@enduml
```

---

### Demonstrasi Use Case Diagram (Dengan Generalisasi)

Kalau kamu mau menampilkan arsitektur yang kuat dan kokoh di bab Perancangan Sistem, **Use Case Diagram** ini memuat elemen advance seperti **Generalization (Pewarisan Aktor)**, **\<\<include\>\>** (syarat mutlak), dan **\<\<extend\>\>** (opsional bersyarat).

*(Diagram di bawah ini menampilkan ke-9 use case aslimu, tapi dikelompokkan ke induknya melalui relasi Generalisasi)*

```mermaid
flowchart LR
    %% Aktor
    Donatur("👤 Donatur")
    Admin("🧑‍💻 Admin")

    Admin -->|mewarisi| Donatur

    %% Batas Sistem
    subgraph Sistem["🔷 Donachain dApp"]
        direction LR
        
        %% Induk Use Case
        UC_Umum(["[ABSTRAK]<br/>Melihat Data Publik"])
        UC_Aksi(["[ABSTRAK]<br/>Berpartisipasi"])
        UC_Kelola(["[ABSTRAK]<br/>Mengelola Kampanye"])
        
        %% Anak Use Case (Asli)
        UC3(["Melihat Daftar Kampanye"])
        UC7(["Melihat Riwayat Donasi"])
        UC9(["Melihat Leaderboard"])
        
        UC4(["Melakukan Donasi"])
        UC5(["Melakukan Voting"])
        
        UC2(["Membuat Kampanye"])
        UC6(["Menyalurkan Dana"])
        
        %% Use Case Independen / Relasi Lain
        UC8(["Mengunduh Laporan CSV"])
        UC_Web3(["Menghubungkan Wallet"])
        UC_NFT(["Mendapatkan NFT Sertifikat"])
    end

    %% Hubungan Aktor ke Induk
    Donatur --- UC_Umum
    Donatur --- UC_Aksi
    Donatur --- UC8

    Admin --- UC_Kelola

    %% Generalisasi Use Case (Anak ke Induk)
    UC3 --->|is-a| UC_Umum
    UC7 --->|is-a| UC_Umum
    UC9 --->|is-a| UC_Umum

    UC4 --->|is-a| UC_Aksi
    UC5 --->|is-a| UC_Aksi

    UC2 --->|is-a| UC_Kelola
    UC6 --->|is-a| UC_Kelola

    %% Include / Extend
    UC_Aksi -.->|<< include >>| UC_Web3
    UC_Kelola -.->|<< include >>| UC_Web3
    
    UC_NFT -.->|<< extend >>| UC4

    %% Styling 
    classDef actor fill:#f3f4f6,stroke:#111827,stroke-width:2px,color:#000000;
    classDef abstract fill:#fef08a,stroke:#854d0e,stroke-width:2px,color:#000000;
    classDef usecase fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#000000;
    
    class Donatur,Admin actor;
    class UC_Umum,UC_Aksi,UC_Kelola abstract;
    class UC3,UC4,UC5,UC7,UC2,UC6,UC8,UC9,UC_Web3,UC_NFT usecase;
```

Versi kode **PlantUML**-nya (dengan panah Generalization segitiga utuh `---|>`) :

```plantuml
@startuml Use_Case_Donachain_Generalization

left to right direction
skinparam packageStyle rectangle

actor "Donatur" as Donatur
actor "Admin" as Admin

Admin --|> Donatur

rectangle "🔷 Donachain dApp" {
    
    ' Induk Abstraksi
    usecase "Melihat Data Publik" as UC_Umum
    usecase "Berpartisipasi" as UC_Aksi
    usecase "Mengelola Kampanye" as UC_Kelola
    
    ' 9 Use Case Anak Murni
    usecase "Melihat Daftar Kampanye" as UC3
    usecase "Melihat Riwayat Donasi" as UC7
    usecase "Melihat Leaderboard" as UC9
    
    usecase "Melakukan Donasi" as UC4
    usecase "Melakukan Voting" as UC5
    
    usecase "Membuat Kampanye" as UC2
    usecase "Menyalurkan Dana" as UC6
    
    usecase "Mengunduh Laporan CSV" as UC8
    usecase "Menghubungkan Wallet" as UC_Web3
    usecase "Mendapatkan NFT Sertifikat" as UC_NFT
}

' Aktor menembak ke Induk untuk kerapian
Donatur --> UC_Umum
Donatur --> UC_Aksi
Donatur --> UC8

Admin --> UC_Kelola

' Use Case Generalization (Anak mewarisi Induk)
UC3 --|> UC_Umum
UC7 --|> UC_Umum
UC9 --|> UC_Umum

UC4 --|> UC_Aksi
UC5 --|> UC_Aksi

UC2 --|> UC_Kelola
UC6 --|> UC_Kelola

' Relasi Syarat
UC_Aksi ..> UC_Web3 : <<include>>
UC_Kelola ..> UC_Web3 : <<include>>

UC_NFT ..> UC4 : <<extend>>\n(Jika >= 0.01 ETH)

@enduml
```

**Kelebihan Menggunakan Gaya Buku Ini:**
Jumlah bulatan (_use case_) berkurang drastis dari 9 menjadi hanya 6. Gambar jadi jauh lebih *"clean"*, sangat mudah untuk dijelaskan di seminar sidang, dan memberikan ilusi sistem yang padat/kompak!

**Penjelasan Mengapa Dosen Pasti Suka:**
1. **Generalization (`--|>`):** Menunjukkan bahwa **Admin** terhubung dengan/mewarisi relasi **Donatur**. Artinya, Admin berhak melihat halaman riwayat dan daftar kampanye tanpa harus kita tarik banyak garis ruwet dari Admin ke Use Case tersebut (kemampuan itu menurun secara otomatis). Konsep OOP teraplikasi di diagram!
2. **\<\<Include\>\>:** Menggambarkan syarat mutlak. Orang mau berdonasi atau Admin mau membuat kampanye? Wajib melewati portal *Menghubungkan Wallet*.
3. **\<\<Extend\>\>:** Sangat detail. Sistem tidak semena-mena memberi NFT. Hanya kalau donasi mencapai *"Threshold"* tertentu maka fungsionalitas pencetakan tereksekusi.
