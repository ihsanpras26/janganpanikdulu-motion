---
title: "09 — Bank Ide Konten Viral & Retensi Tinggi (EP06–EP15)"
tags:
  - idea-bank
  - research
  - retention
  - viral
  - janganpanikdulu
updated: 2026-11-19
status: active
related:
  - "[[00-Home-MOC]]"
  - "[[08-Production-Learnings-Log]]"
  - "[[05-Episodes/EP06-Jangan-Campur-Pemutih-Pembersih-WC]]"
---

# Riset Konten Berpotensi Viral & Retensi Tinggi (`@janganpanikdulu` | EP06 sampai EP15)

Dokumen ini merangkum bank ide dan riset topik siap produksi untuk batch **EP06 sampai EP15** berdasarkan evaluasi portofolio [[08-Production-Learnings-Log|08 — Catatan Pembelajaran Produksi]], pola viral explainer keselamatan 3D, tren kasus darurat Indonesia 2025 sampai 2026, serta validasi angka ilmiah dari sumber resmi (CDC, NIOSH, Apple Support, BMKG, PLN, Kemenkes RI, MedlinePlus, dan standar baterai UL/NFPA).

Semua 10 pasangan **Judul + Kartu Thumbnail** di bawah sudah diuji dan berstatus `PASS` dengan mode `--strict` pada `scripts/lint_packaging.mjs` (judul maksimal 40 karakter, kartu maksimal 4 kata, nol pengulangan kata konten, nol tag `#Shorts`, dan memuat angka terverifikasi).

---

## 1. Audit Celah Portofolio EP01 sampai EP05

Sebelum memilih topik baru, ada tiga celah struktural dari lima episode pertama yang langsung memengaruhi jangkauan dan retensi:

| Aspek | Kondisi EP01 sampai EP05 | Peluang Perbaikan di EP06+ |
| :--- | :--- | :--- |
| **Distribusi Pilar** | Pilar A Rumah (2 ep: 40%), Pilar B Motor (2 ep: 40%), Pilar C Gedung (0 ep: 0%), Pilar D Alam (1 ep: 20%) | Pilar B sudah dua kali berdekatan (EP03 & EP05). Batch berikutnya perlu fokus ke **Pilar A (Rumah, Gadget, Kimia, P3K)** agar menyasar semua umur, ditambah mengisi kekosongan **Pilar C (Gedung)**. |
| **Tren Durasi** | EP01 `59,56s`, EP03 `79,50s`, EP04 `81,51s`, EP05 `97,66s` | Durasi terus memanjang mendekati 100 detik. Risiko penurunan retensi di tengah video meningkat jika penjelasan mekanika terlalu panjang. Targetkan kembali rentang **50 sampai 68 detik** dengan X-Ray cutaway masuk lebih awal (detik 10 sampai 16). |
| **Momentum Musim (Nov-Des 2026)** | EP04 (ular) dan EP05 (motor banjir) sudah menangkap musim hujan | Masih ada dua momen musiman yang sangat dicari saat puncak hujan dan jelang libur akhir tahun: **petir saat hujan** dan **tidur di mobil AC menyala saat macet atau mati lampu**. |

> [!IMPORTANT]
> **Single-Fix Rule untuk Batch EP06+:** Pangkas panjang naskah dari ~95 detik kembali ke **55 sampai 65 detik** dan majukan adegan X-Ray Cutaway pertama ke sebelum detik ke-15. Penonton Shorts dan Reels paling sering pergi saat pengantar terlalu lama sebelum melihat visual mekanisme 3D-nya.

---

## 2. Empat Pemicu Konten Meledak & Retensi Tinggi

Konten edukasi keselamatan menembus algoritma non-follower bukan sekadar karena informatif, tetapi karena menggabungkan empat pemicu ini sekaligus:

1. **Tuduhan terhadap kebiasaan harian (0 sampai 3 detik):** Membantah refleks yang masih dilakukan mayoritas orang Indonesia (memasukkan HP basah ke beras, mengoles odol ke luka bakar, mencampur pemutih dengan pembersih WC, menyumpal sendok saat kejang). Penonton berhenti scroll karena merasa pernah melakukannya.
2. **X-Ray 3D terhadap hal tak kasatmata (detik 10 sampai 25):** Penonton bertahan hingga pertengahan video saat mereka bisa melihat proses tersembunyi secara visual, seperti gas klorin yang 2,5 kali lebih berat mengendap di lantai kamar mandi, molekul CO merebut hemoglobin 200 kali lebih kuat, atau arus 220V mengunci otot genggaman tangan.
3. **Debat alami di kolom komentar:** Topik seperti beras untuk HP basah atau odol untuk luka bakar memancing orang berbagi pengalaman pribadi (*"HP ku kemarin masuk beras nyala kok"* dibalas teknisi atau penonton lain). Saat penonton membaca dan mengetik komentar, video terus berputar ulang di latar belakang dan mendorong rata-rata durasi tonton melewati 100%.
4. **Refleks kirim ke grup WhatsApp keluarga:** Sinyal *Share per Reach* di Reels dan TikTok punya bobot tinggi. Topik keselamatan ibu di kamar mandi, anak kos, dan keluarga di mobil secara alami diteruskan ke grup WA rumah.

---

## 3. Sepuluh Ide Konten Prioritas (Terverifikasi Sains & Lolos Linter)

### Ringkasan Matriks Prioritas

| Rank | Tier | Pilar | Topik | Judul YT (`<= 40` char) | Kartu Thumbnail (`<= 4` kata) | Pemicu Utama |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Tier 1 | Pilar A (Kimia Rumah) | Campur pemutih & pembersih WC *(Dipilih jadi EP06)* | `Jangan Campur Pemutih dan Pembersih WC!` | `KLORIN 2,5x LEBIH BERAT` | Share WA keluarga tinggi, kasus viral berulang |
| **2** | Tier 1 | Pilar A (Gadget) | HP basah masuk beras | `HP Basah? Stop Masuk Beras! (3 Langkah)` | `PARTIKEL PATI PICU KOROSI` | Debat komentar paling tinggi, jangkauan semua umur |
| **3** | Tier 1 | Pilar B/A (Kasus 2026) | Tidur di mobil AC menyala | `Tidur di Mobil AC Nyala? Awas Racun CO!` | `IKAT DARAH 200x OKSIGEN` | Kasus nyata Medan & Aceh 2026, salah kaprah "freon AC" |
| **4** | Tier 2 | Pilar A (P3K Dapur) | Luka bakar dioles odol | `Luka Bakar? Jangan Oles Odol!` | `BILAS AIR 15-20 MENIT` | Mitos P3K nomor satu di Indonesia, save tinggi |
| **5** | Tier 2 | Pilar D (Musim Hujan) | Berteduh di bawah pohon saat petir | `Hujan Petir? Jangan Berteduh di Pohon!` | `SUHU 30.000°C MELEDAK!` | Sangat relevan puncak musim hujan Nov-Des |
| **6** | Tier 2 | Pilar A (Listrik 220V) | Menolong teman kesetrum | `Teman Kesetrum? Jangan Tarik Tangannya!` | `220V KUNCI OTOT PENOLONG` | Relevan musim banjir & rumah tangga, visual dramatis |
| **7** | Tier 2 | Pilar A (P3K Medis) | Orang kejang disumpal sendok | `Orang Kejang? Stop Sumpal Sendok!` | `>5 MENIT LANGSUNG IGD` | Mematahkan mitos sinetron "lidah tertelan" |
| **8** | Tier 3 | Pilar A (Gadget) | Baterai HP kembung | `Baterai HP Kembung? Jangan Ditusuk!` | `MELELEH DI 165°C!` | Rasa ingin tahu tinggi, visual ledakan 3D kuat |
| **9** | Tier 3 | Pilar C (Gedung) | Terjebak di lift macet | `Terjebak Lift Macet? Stop Buka Pintu!` | `RISIKO JATUH! 3 LANGKAH` | Mengisi celah Pilar C, rasa takut universal pengguna mal/kantor |
| **10** | Tier 3 | Pilar A (P3K Kosan) | Tersedak saat sendirian | `Tersedak Sendirian? Jangan Minum Air!` | `PINGSAN DALAM 60 DETIK` | Target masif anak kos & perantau, save sangat tinggi |

---

### Bedah Detail Tier 1 (Rekomendasi Utama EP06 sampai EP08)

#### 1. Jangan Campur Pemutih Baju dan Pembersih WC (`Pilar A` — Masuk Produksi EP06)
* **Judul & Kartu (PASS Strict):** `Jangan Campur Pemutih dan Pembersih WC!` (39 char) | Kartu: `KLORIN 2,5x LEBIH BERAT` (4 kata)
* **Draf Hook 0 sampai 5 detik:**
  > *"Kenapa kamu dilarang keras mencampur pemutih baju dengan pembersih WC? Karena dua cairan ini langsung berubah jadi gas beracun. Misalnya lagi sikat kamar mandi tertutup, biar kerak cepat bersih, kamu tuang dua-duanya... langsung muncul asap perih."*
* **Fakta & Angka Terverifikasi (CDC & NIOSH):**
  * Pemutih pakaian mengandung natrium hipoklorit ($NaOCl$), sedangkan pembersih porselen, cuka, atau sitrun bersifat asam.
  * Campuran keduanya melepaskan **gas klorin ($Cl_2$)** yang pernah dipakai sebagai senjata kimia.
  * Massa jenis gas klorin sekitar **2,5 kali lebih berat dari udara** (2,47 sampai 2,49), sehingga tidak naik ke atas melainkan mengendap di lantai kamar mandi yang sempit.
  * Saat terhirup, gas klorin bereaksi dengan cairan lembap di mata dan paru-paru membentuk asam yang membakar saluran napas hingga memicu penumpukan cairan paru (*pulmonary edema*).
* **Momen Visual 3D X-Ray:** Potongan isometrik kamar mandi tertutup. Cairan pemutih dan asam bertemu di lantai keramik, mengeluarkan kepulan gas kuning kehijauan berat yang merayap rendah di lantai setinggi lutut Mas Raka saat jongkok menyikat, lalu *push-in* X-Ray ke saluran napas dan paru-paru.
* **Pemicu Interaksi & Affiliate:** Ibu rumah tangga dan anak kos sering melakukan kebiasaan ini. Peluang komentar: *"Pantesan kemarin nyikat WC sampai batuk-batuk!"*. Peluang affiliate ([[06-Instagram-Profile-and-Metadata]]): sarung tangan karet tebal & masker respirator rumah tangga.

---

#### 2. HP Kecemplung Air? Stop Masukkan ke Beras (`Pilar A`)
* **Judul & Kartu (PASS Strict):** `HP Basah? Stop Masuk Beras! (3 Langkah)` (39 char) | Kartu: `PARTIKEL PATI PICU KOROSI` (4 kata)
* **Draf Hook 0 sampai 5 detik:**
  > *"HP kamu baru jatuh ke air, terus langsung kamu kubur di dalam beras? Stop! Apple sendiri resmi melarang cara itu karena malah bikin mesin HP kamu korosi."*
* **Fakta & Angka Terverifikasi (Apple Support Resmi):**
  * Apple mengeluarkan panduan resmi yang melarang pengeringan ponsel basah di dalam beras, memakai pengering rambut (*hairdryer*), atau memasukkan *cotton bud* ke lubang konektor.
  * Debu, serpihan kecil, dan partikel pati beras masuk ke celah port charger dan speaker, bercampur dengan air menjadi gumpalan lembap yang memicu korosi pin tembaga dan korsleting.
  * Langkah resmi Apple: ketuk lembut HP dengan port menghadap bawah agar air keluar, taruh di ruang kering berangin sejuk (seperti depan kipas angin), tunggu minimal **30 menit** sebelum mencoba mengisi daya, dan bila peringatan cairan muncul, biarkan mengering hingga **24 jam**.
* **Momen Visual 3D X-Ray:** Kamera *extreme macro* masuk ke dalam lubang port USB-C / Lightning. Terlihat tetesan air menyatu dengan debu pati putih dari beras, berubah menjadi kerak oksidasi oranye pada pin tembaga, lalu memercik saat kabel charger dicolokkan.
* **Pemicu Interaksi & Affiliate:** Mesin debat komentar terkuat di antara semua topik karena berlawanan langsung dengan mitos populer 15 tahun terakhir. Peluang affiliate: kantong *silica gel* / kotak pengering elektronik & *waterproof pouch* saat hujan.

---

#### 3. Tidur di Mobil dengan Mesin & AC Menyala (`Pilar B/A`)
* **Judul & Kartu (PASS Strict):** `Tidur di Mobil AC Nyala? Awas Racun CO!` (39 char) | Kartu: `IKAT DARAH 200x OKSIGEN` (4 kata)
* **Draf Hook 0 sampai 5 detik:**
  > *"Kenapa tidur di mobil yang berhenti sambil nyalain AC bisa bikin orang meninggal tanpa sempat bangun? Ternyata penyebabnya bukan freon AC, tapi gas knalpot tak berbau yang menipu sel darahmu."*
* **Fakta & Angka Terverifikasi (CDC/ATSDR, NIH, & Kasus Indonesia 2025-2026):**
  * Kasus nyata berulang di Indonesia (antara lain Medan Juni 2026 saat mati lampu, Pidie Jaya Maret 2026, Surabaya April 2025).
  * AC mobil tidak menghasilkan racun. Pelakunya adalah **karbon monoksida (CO)** dari knalpot yang merembes lewat karet pintu getas, celah bodi, atau sirkulasi udara luar saat mobil diam.
  * Gas CO tidak berwarna, tidak berbau, dan tidak berasa.
  * Daya ikat CO ke hemoglobin darah **200 sampai 250 kali lebih kuat** dibanding oksigen ($O_2$). Selain memblokir oksigen, ikatan CO juga membuat hemoglobin menahan sisa oksigen agar tidak dilepas ke otak dan organ tubuh.
* **Momen Visual 3D X-Ray:** Diorama mobil parkir dengan mesin hidup di malam hari. Asap bening berlabel CO merembes dari bawah kolong knalpot ke kabin, lalu *match-cut* X-Ray ke sel darah merah: molekul CO menyalip oksigen dan mengunci hemoglobin sampai otak kehilangan pasokan oksigen.
* **Pemicu Interaksi & Affiliate:** Sangat kuat menjelang libur akhir tahun / perjalanan tol / pemadaman listrik. Peluang affiliate: detektor gas CO portabel & kipas mini *rechargeable* untuk mobil saat mati lampu.

---

### Bedah Ringkas Tier 2 (EP09 sampai EP12)

#### 4. Luka Bakar? Jangan Oles Odol (`Pilar A`)
* **Judul & Kartu (PASS Strict):** `Luka Bakar? Jangan Oles Odol!` (29 char) | Kartu: `BILAS AIR 15-20 MENIT` (4 kata)
* **Hook 0 sampai 5 detik:** *"Tangan baru kena cipratan minyak panas atau knalpot, terus refleks kamu olesin odol? Bukannya sembuh, lapisan odol itu justru mengunci panas di dalam kulitmu."*
* **Fakta Terverifikasi (Kemenkes RI & UNAIR):** Pasta gigi mengandung *menthol*, deterjen, fluoride, dan bahan abrasif yang mengiritasi luka terbuka, sementara teksturnya memerangkap panas tetap membakar lapisan bawah kulit dan memicu infeksi. Es batu langsung juga merusak jaringan. Protokol resmi: aliri air mengalir suhu ruang selama **15 sampai 20 menit**, lalu tutup longgar dengan kasa steril.
* **Visual 3D X-Ray:** Penampang 3D lapisan kulit (epidermis dan dermis). Panas merah memantul balik ke lapisan dalam saat ditutup odol putih, kontras dengan panas yang langsung tersapu keluar saat dialiri air mengalir.

#### 5. Hujan Petir? Jangan Berteduh di Bawah Pohon (`Pilar D`, Musiman Nov-Des)
* **Judul & Kartu (PASS Strict):** `Hujan Petir? Jangan Berteduh di Pohon!` (38 char) | Kartu: `SUHU 30.000°C MELEDAK!` (3 kata)
* **Hook 0 sampai 5 detik:** *"Saat hujan petir di jalan, berteduh di bawah pohon rindang justru salah satu tempat paling mematikan. Pohon basah yang tersambar petir bisa pecah meledak seketika."*
* **Fakta Terverifikasi (BMKG):** Suhu jalur petir mencapai sekitar **30.000°C** (hampir 5 kali suhu permukaan matahari). Air di dalam batang pohon menguap seketika hingga batang bisa pecah. Ada dua ancaman tambahan tanpa tersambar langsung: **side flash** (arus melompat dari batang ke tubuh) dan **step voltage** (arus menyebar di tanah, menciptakan beda tegangan antara kaki kiri dan kanan). Langkah BMKG: masuk gedung kokoh atau mobil; jika terjebak di ruang terbuka, jongkok dengan **kedua kaki rapat** dan jaga jarak **3 sampai 5 meter** dari orang lain.
* **Visual 3D X-Ray:** Pohon disambar petir, batang terbelah oleh uap mendidih, lalu cincin tegangan oranye menyebar di tanah memperlihatkan aliran listrik masuk lewat satu kaki dan keluar lewat kaki lain saat berdiri mengangkang vs aman saat kaki dirapatkan.

#### 6. Teman Kesetrum 220V? Jangan Tarik Tangannya (`Pilar A`)
* **Judul & Kartu (PASS Strict):** `Teman Kesetrum? Jangan Tarik Tangannya!` (39 char) | Kartu: `220V KUNCI OTOT PENOLONG` (4 kata)
* **Hook 0 sampai 5 detik:** *"Kalau lihat teman kesetrum lalu kamu refleks menarik tangannya, kalian berdua bakal sama-sama terkunci di aliran listrik dan tidak bisa lepas."*
* **Fakta Terverifikasi (Standar Keselamatan Listrik & PLN):** Ambang batas *let-go current* (batas manusia masih mampu melepas genggaman sendiri) hanya sekitar **10,5 mA pada wanita** dan **16 mA pada pria**. Pada tegangan rumah tangga Indonesia **220V** dengan kulit basah (hambatan dapat turun ke ~1.000 Ohm), arus bisa menembus **220 mA**, mengunci otot fleksor tangan (*tetanic contraction*) sekaligus melampaui batas henti jantung (50 sampai 100 mA). Langkah PLN: matikan MCB atau cabut steker dulu, atau dorong pakai isolator kering (kayu/plastik/karet kering), lalu cek napas dan bawa ke IGD meski korban tampak sadar (risiko gangguan irama jantung tertunda).
* **Visual 3D X-Ray:** Lengan transparan memperlihatkan sinyal listrik 220V memaksa otot fleksor menutup jari sekuat tenaga, dan aliran listrik berpindah seketika ke tangan Mas Raka jika menyentuh langsung tanpa isolator.

#### 7. Orang Kejang? Stop Sumpal Sendok (`Pilar A`)
* **Judul & Kartu (PASS Strict):** `Orang Kejang? Stop Sumpal Sendok!` (33 char) | Kartu: `>5 MENIT LANGSUNG IGD` (4 kata)
* **Hook 0 sampai 5 detik:** *"Lihat orang kejang, jangan pernah masukkan sendok atau jari ke mulutnya. Mitos lidah bisa tertelan itu secara anatomi mustahil, tapi sendok itu bisa mematahkan giginya."*
* **Fakta Terverifikasi (CDC & Epilepsy Foundation):** Lidah tertambat kuat pada dasar mulut oleh jaringan **frenulum linguae**, sehingga mustahil tertelan ke tenggorokan. Memasukkan benda keras saat rahang mengatup kuat berisiko mematahkan gigi, melukai gusi, atau membuat pecahan masuk menyumbat jalan napas. Protokol resmi (*Stay, Safe, Side*): jauhkan benda tajam, sangga kepala dengan alas empuk, miringkan tubuh ke samping agar cairan keluar, dan segera ke IGD jika kejang berlangsung **lebih dari 5 menit**.
* **Visual 3D X-Ray:** Potongan samping kepala 3D memperlihatkan posisi *frenulum linguae* yang menahan pangkal lidah, kontras dengan posisi miring yang membuka saluran napas secara alami.

---

### Bedah Ringkas Tier 3 (EP13 sampai EP15)

#### 8. Baterai HP Kembung? Jangan Ditusuk (`Pilar A`)
* **Judul & Kartu (PASS Strict):** `Baterai HP Kembung? Jangan Ditusuk!` (35 char) | Kartu: `MELELEH DI 165°C!` (3 kata)
* **Fakta Terverifikasi (UL & NFPA):** Baterai kembung berisi penumpukan gas hasil penguraian elektrolit. Menusuk atau terus mengecasnya merobek lapisan pemisah (*separator* poliolefin) yang tipis; saat suhu menembus batas shutdown polietilena (**130 sampai 135°C**) hingga pelelehan polipropilena (**165°C**), anoda dan katoda bersentuhan langsung memicu **thermal runaway** (api berantai dan gas beracun seperti hidrogen fluorida serta CO). Langkah aman: matikan HP, cabut charger, taruh di permukaan tidak mudah terbakar (keramik/logam), bawa ke teknisi resmi.

#### 9. Terjebak Lift Macet? Stop Buka Pintu (`Pilar C`, Mengisi Pilar Kosong)
* **Judul & Kartu (PASS Strict):** `Terjebak Lift Macet? Stop Buka Pintu!` (37 char) | Kartu: `RISIKO JATUH! 3 LANGKAH` (4 kata)
* **Fakta Terverifikasi (Standar K3 Gedung Indonesia):** Membuka paksa pintu lift saat kabin berhenti di antara lantai membuka celah langsung ke ruang luncur (*hoistway*) yang berisiko jatuh bebas atau terjepit bila lift mendadak bergerak. Melompat-lompat justru mengacaukan sensor pengaman. Lift modern dilengkapi **ARD (Automatic Rescue Device)** yang menurunkan kabin otomatis saat listrik padam. Langkah aman: tekan tombol bel/interkom darurat, mundur ke dinding belakang kabin, tunggu evakuasi teknisi dengan kunci darurat resmi.

#### 10. Tersedak Sendirian? Jangan Minum Air (`Pilar A`)
* **Judul & Kartu (PASS Strict):** `Tersedak Sendirian? Jangan Minum Air!` (37 char) | Kartu: `PINGSAN DALAM 60 DETIK` (4 kata)
* **Fakta Terverifikasi (MedlinePlus):** Saat saluran napas tersumbat total, korban bisa kehilangan kesadaran dalam **30 sampai 60 detik**, dan kerusakan otak permanen mulai terjadi sekitar **4 menit** tanpa oksigen. Memaksa minum air saat trakea tersumbat tidak mendorong makanan keluar karena saluran makan dan saluran napas berbeda. Langkah penyelamatan mandiri (*Self-Heimlich*): kepalkan tangan tepat di atas pusar (di bawah tulang rusuk), lalu hentakkan perut ke dalam dan ke atas memakai sandaran kursi atau tepi meja yang kokoh.

---

## 4. Rekomendasi Jadwal Produksi 4 Episode Berikutnya

Untuk menyeimbangkan pilar topik, memanfaatkan momentum musim hujan November sampai Desember, dan menguji dua mesin viral sekaligus (Share Keluarga + Debat Komentar):

1. **EP06 (Minggu 1):** **Jangan Campur Pemutih dan Pembersih WC!** *(Pilar A: share WA keluarga dan anak kos sangat tinggi, aset 3D kamar mandi serta partikel gas berat bisa memanfaatkan ulang sistem partikel gas EP01).*
2. **EP07 (Minggu 2):** **HP Basah? Stop Masuk Beras!** *(Pilar A: mesin debat komentar paling besar, menjangkau semua pengguna HP di luar segmen otomotif).*
3. **EP08 (Minggu 3):** **Hujan Petir? Jangan Berteduh di Pohon!** *(Pilar D: menangkap puncak musim hujan dan petir Indonesia, visual 3D sinematik).*
4. **EP09 (Minggu 4):** **Tidur di Mobil AC Nyala? Awas Racun CO!** *(Pilar B/A: menangkap pencarian jelang libur akhir tahun dan mudik, plus kasus nyata Indonesia 2026).*

---

## 5. Checklist Retensi Wajib Sebelum Menulis Naskah EP06+

Terapkan empat aturan ini saat memproduksi episode berikutnya agar retensi berada di atas target 70%:

* **Durasi target:** **55 sampai 65 detik** (total ~125 sampai 180 kata VO bahasa Indonesia, bukan 95+ detik seperti EP05).
* **Cutaway X-Ray lebih awal:** Tampilkan visual potongan 3D internal paling mencolok dalam **12 sampai 15 detik pertama** (atau sekilas 2-3 detik pada Beat 1 sebagai *visual tease*).
* **Pergantian visual tiap 5 sampai 8 detik:** Pastikan kamera berubah sudut (Wide -> Macro -> X-Ray -> Split Comparison) sebelum penonton bosan pada satu bidikan.
* **Uji kemasan otomatis:** Jalankan `node scripts/lint_packaging.mjs --title "<judul>" --card "<kartu>" --strict` sebelum mengunci `Publish_Kit_EPXX`.
