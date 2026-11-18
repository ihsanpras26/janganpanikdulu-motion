---
title: "EP06 - Jangan Campur Pemutih dan Pembersih WC!"
episode: 6
topic: "Bahaya Mencampur Pemutih Pakaian (NaOCl) dan Pembersih Kerak WC Asam (Gas Klorin Cl2)"
pillar: "Pilar A - Darurat Rumah, Dapur & Keseharian"
mascot: "[[02-Mascot-Bible-Mas-Raka|Mas Raka]]"
palette: "[[01-Brand-Identity-Orange-Blue|Option 2: White x Deep Indigo #261A66 x Solid Orange #EF5F18]]"
playbook: "[[07-Scriptwriting-DNA-Playbook]]"
status: script-ready-waiting-approval
---

# EP06 - Jangan Campur Pemutih dan Pembersih WC! (SCRIPT, ELEVENLABS VO KIT & STORYBOARD BLUEPRINT)

## 1. Ringkasan Riset & Validasi Sains (Faktual & Terverifikasi)

1. **Reaksi Kimia di Kamar Mandi (CDC & NIOSH)**:
   - Pemutih pakaian mengandung **natrium hipoklorit ($NaOCl$)**.
   - Pembersih kerak porselen WC (serta cuka dan asam sitrat/sitrun) mengandung **asam** (umumnya asam klorida / $HCl$).
   - Saat keduanya dicampur, reaksi kimia seketika melepaskan **gas klorin ($Cl_2$)**, gas beracun yang dalam sejarah pernah dipakai sebagai senjata kimia.
2. **Jebakan Fisika Ruang Tertutup (CDC & NIOSH)**:
   - Massa jenis uap gas klorin sekitar **2,5 kali lebih berat dari udara** (nilai relatif `2,47` sampai `2,49`).
   - Karena lebih berat, gas klorin tidak langsung naik ke lubang angin atau ventilasi atas, melainkan mengendap rendah di lantai kamar mandi tepat di ketinggian wajah orang yang jongkok menyikat.
3. **Jebakan Medis di Paru-Paru (CDC, ATSDR & NIH)**:
   - Begitu terhirup, gas klorin bereaksi dengan air ($H_2O$) di permukaan lembap mata, saluran napas, dan paru-paru membentuk **asam klorida ($HCl$)** dan **asam hipoklorit ($HOCl$)** ($\text{Cl}_2 + \text{H}_2\text{O} \rightleftharpoons \text{HCl} + \text{HOCl}$).
   - Kedua asam tersebut membakar jaringan saluran napas dari dalam, merusak membran kapiler alveoli, hingga cairan merembes memenuhi kantung paru (*pulmonary edema*).
   - Gejala berat dan penumpukan cairan paru dapat muncul **beberapa jam setelah paparan** (*delayed onset*).
4. **Protokol Resmi Penanganan (CDC & Poison Control)**:
   - **Jangan bertahan di dalam** untuk langsung menyiram atau menambah sabun/cairan lain; menyiram atau mengaduk justru dapat memperbanyak pelepasan gas di ruang sempit.
   - **Langkah 1**: Tahan napas dan segera keluar dari kamar mandi menuju udara segar.
   - **Langkah 2**: Jika aman dari luar, buka pintu dan ventilasi agar udara mendorong gas keluar, serta larang anggota keluarga atau hewan peliharaan masuk sebelum gas terurai.
   - **Langkah 3**: Bilas mata atau kulit yang perih dengan air mengalir minimal **15 menit**. Jika dada sesak, pusing, atau batuk berat, segera ke IGD.

---

## 2. Naskah Utama (`181 Kata` | Estimasi `~62-66 Detik` VO + `4,19 Detik` Outro)

```text
Kenapa kamu dilarang keras nyampur pemutih baju sama pembersih WC?
Karena keduanya langsung jadi gas beracun yang membakar paru-paru.
Misalnya lagi jongkok nyikat lantai, pintu ketutup, kamu tuang dua-duanya biar cepat bersih.

Pemutih baju mengandung natrium hipoklorit, sedangkan pembersih kerak WC bersifat asam.
Begitu ketemu, keduanya melepas gas klorin, zat yang dulu jadi senjata kimia.
Masalahnya, gas klorin 2,5 kali lebih berat dari udara.
Gasnya nggak naik ke ventilasi, tapi ngumpul di lantai setinggi wajahmu saat jongkok.
Begitu terhirup, gas klorin ketemu air di paru-paru lalu berubah jadi asam klorida.
Asam itu membakar saluran napas dari dalam sampai dada sesak dan paru terisi cairan.

Kalau terlanjur kecampur, lakukan 3 langkah ini:
Pertama, jangan disiram dulu. Tahan napas lalu langsung keluar ke udara segar.
Kedua, buka pintu dari luar supaya gas keluar, dan larang orang lain masuk.
Ketiga, kalau mata perih, bilas air mengalir 15 menit.
Kalau dada sesak, segera ke IGD karena cairan paru bisa muncul belakangan.

Jadi yang bikin keracunan bukan pembersihnya, tapi dua cairan yang kita campur sendiri.
Pernah nyampur keduanya pas nyikat WC? Ceritain di komen.
Jadi... jangan panik dulu.
```

### Audit Gate Pra-Produksi
- **No Fabricated Numbers Gate**: `2,5 kali lebih berat dari udara` (CDC/NIOSH), bilas `15 menit` (CDC/Poison Control), reaksi $Cl_2 + H_2O \rightarrow HCl + HOCl$ & *delayed pulmonary edema* (NIH/CDC). Nol angka karangan.
- **Hook 4-Point Human Checklist**:
  1. *Title-Hook Alignment*: Detik 0-3 langsung menjawab judul `Jangan Campur Pemutih dan Pembersih WC!`.
  2. *Zero Warm-up*: Langsung masuk larangan dan risiko fatal tanpa sapaan pembuka.
  3. *Open Loop*: Penonton penasaran bagaimana dua cairan pembersih biasa bisa membakar paru-paru dari dalam.
  4. *Natural ID Voice*: Diksi lisan literal (`nyampur`, `jongkok nyikat lantai`, `ngumpul di lantai`, `jangan disiram dulu`), bebas kiasan aneh, dan ajakan komen netral lintas platform (cocok untuk YouTube Shorts, Reels, dan TikTok).
- **Packaging Linter (`scripts/lint_packaging.mjs --strict`)**:
  - Judul (`39/40` char): `Jangan Campur Pemutih dan Pembersih WC!`
  - Kartu Opsi 1 (`4` kata, `23` char): `KLORIN 2,5x LEBIH BERAT` (`PASS`)
  - Kartu Opsi 2 (`4` kata, `24` char): `PARU TERBAKAR! 3 LANGKAH` (`PASS`)
  - Kartu Opsi 3 (`4` kata, `20` char): `JADI ASAM! 3 LANGKAH` (`PASS`)

---

## 3. Kit ElevenLabs Voiceover (Suara: `Senandika - Young, Confident and Clear`)

### A. Teks Siap Copy-Paste ke ElevenLabs (Phonetic-Optimized Tanpa Tag)
*(Angka ditulis huruf dan singkatan `WC` ditulis `we-ce`, `IGD` ditulis `I-G-D` agar pelafalan Bahasa Indonesia jernih dan natural. Jika `I-G-D` terdengar kaku saat preview, ganti menjadi `rumah sakit`.)*

```text
Kenapa kamu dilarang keras nyampur pemutih baju sama pembersih we-ce?
Karena keduanya langsung jadi gas beracun yang membakar paru-paru.
Misalnya lagi jongkok nyikat lantai, pintu ketutup, kamu tuang dua-duanya biar cepat bersih.

Pemutih baju mengandung natrium hipoklorit, sedangkan pembersih kerak we-ce bersifat asam.
Begitu ketemu, keduanya melepas gas klorin, zat yang dulu jadi senjata kimia.
Masalahnya, gas klorin dua setengah kali lebih berat dari udara.
Gasnya nggak naik ke ventilasi, tapi ngumpul di lantai setinggi wajahmu saat jongkok.
Begitu terhirup, gas klorin ketemu air di paru-paru, lalu berubah jadi asam klorida.
Asam itu membakar saluran napas dari dalam, sampai dada sesak dan paru terisi cairan.

Kalau terlanjur kecampur, lakukan tiga langkah ini.
Pertama, jangan disiram dulu. Tahan napas, lalu langsung keluar ke udara segar.
Kedua, buka pintu dari luar supaya gas keluar, dan larang orang lain masuk.
Ketiga, kalau mata perih, bilas air mengalir lima belas menit.
Kalau dada sesak, segera ke I-G-D, karena cairan paru bisa muncul belakangan.

Jadi yang bikin keracunan bukan pembersihnya, tapi dua cairan yang kita campur sendiri.
Pernah nyampur keduanya pas nyikat we-ce? Ceritain di komen.
Jadi... jangan panik dulu.
```

### B. Teks dengan Expression Tags (ElevenLabs v3/v4)

```text
[curious, engaging] Kenapa kamu dilarang keras nyampur pemutih baju sama pembersih we-ce?
[serious, punchy] Karena keduanya langsung jadi gas beracun yang membakar paru-paru.
[conversational] Misalnya lagi jongkok nyikat lantai, pintu ketutup, kamu tuang dua-duanya biar cepat bersih.

[clear, informative] Pemutih baju mengandung natrium hipoklorit, sedangkan pembersih kerak we-ce bersifat asam.
[emphatic] Begitu ketemu, keduanya melepas gas klorin, zat yang dulu jadi senjata kimia.
[firm] Masalahnya, gas klorin dua setengah kali lebih berat dari udara.
Gasnya nggak naik ke ventilasi, tapi ngumpul di lantai setinggi wajahmu saat jongkok.
[serious] Begitu terhirup, gas klorin ketemu air di paru-paru, lalu berubah jadi asam klorida.
Asam itu membakar saluran napas dari dalam, sampai dada sesak dan paru terisi cairan.

[calm, authoritative] Kalau terlanjur kecampur, lakukan tiga langkah ini.
Pertama, jangan disiram dulu. Tahan napas, lalu langsung keluar ke udara segar.
Kedua, buka pintu dari luar supaya gas keluar, dan larang orang lain masuk.
Ketiga, kalau mata perih, bilas air mengalir lima belas menit.
[firm] Kalau dada sesak, segera ke I-G-D, karena cairan paru bisa muncul belakangan.

[thoughtful] Jadi yang bikin keracunan bukan pembersihnya, tapi dua cairan yang kita campur sendiri.
[friendly, engaging] Pernah nyampur keduanya pas nyikat we-ce? Ceritain di komen.
[warm, calm smile] Jadi... jangan panik dulu.
```

### C. Rekomendasi Setelan Slider ElevenLabs (`Senandika`)
- **Speed**: `1.06` sampai `1.08` *(menjaga durasi VO jatuh di rentang 62-66 detik)*
- **Stability**: `50%`
- **Similarity**: `80%`
- **Style Exaggeration**: `15%` sampai `20%`

---

## 4. Rencana Storyboard 18 Beat Visual 3D (`1080x1920` | Diorama Kamar Mandi & X-Ray Paru-Paru)

*(Rentang waktu masih estimasi proporsional; akan dikunci presisi milidetik setelah audio VO ElevenLabs diekstrak timestamp-nya.)*

| Scene | Estimasi Waktu | Potongan Kalimat VO | Visual 3D Three.js (Diorama Kamar Mandi Mas Raka + Studio X-Ray) | UI Overlay (`#hook-card`, `#step-tracker`, Callout) |
| :--- | :--- | :--- | :--- | :--- |
| **S01** | `00.00 - 03.60s` | *"Kenapa kamu dilarang keras nyampur pemutih baju sama pembersih WC?"* | **Stage 0 (Kamar Mandi Isometrik, Frame 0 Aktif)**: Mas Raka berjongkok di lantai keramik memegang dua botol berbeda (botol putih pemutih dan botol biru pembersih kerak) di depan kloset, satu tangan lain memberi gestur STOP ke kamera. | `#hook-card`: `KLORIN 2,5x LEBIH BERAT` (tanpa callout kecil di frame 0) |
| **S02** | `03.60 - 07.20s` | *"Karena keduanya langsung jadi gas beracun yang membakar paru-paru."* | **Stage 1 (Flash Tease X-Ray Paru)**: *Cut* cepat 3 detik ke X-Ray siluet paru-paru transparan yang dimasuki asap kuning kehijauan lalu menyala oranye terbakar (`#EF5F18`). | Callout `#EF5F18`: `gas pembakar paru-paru` |
| **S03** | `07.20 - 12.20s` | *"Misalnya lagi jongkok nyikat lantai, pintu ketutup, kamu tuang dua-duanya biar cepat bersih."* | **Stage 0 (OTS Kamar Mandi Tertutup)**: Sudut balik bahu Mas Raka; pintu kamar mandi terlihat tertutup rapat, dua cairan dituang ke keramik berkerak sambil sikat lantai disiapkan, gelembung reaksi langsung muncul. | Callout `#EF5F18`: `ruang sempit & tertutup` |
| **S04** | `12.20 - 16.50s` | *"Pemutih baju mengandung natrium hipoklorit, sedangkan pembersih kerak WC bersifat asam."* | **Stage 1 (INTERRUPT `~0:12`, Studio Macro Botol)**: Dua botol bersebelahan pada latar gelap X-Ray; label kimia muncul bersih: `NaOCl` (Pemutih) dan `HCl / Cuka / Sitrun` (Asam). | Top Metric Pill: `NaOCl + Asam (HCl / Cuka)` + Callout `pemutih + cairan asam` |
| **S05** | `16.50 - 21.00s` | *"Begitu ketemu, keduanya melepas gas klorin, zat yang dulu jadi senjata kimia."* | **Stage 1 (Reaksi Molekul 3D)**: Dua aliran cairan bertemu di lantai kaca, melepaskan partikel molekul `Cl2` berwarna kuning kehijauan pekat yang mendesis naik. | Top Metric Pill: `Reaksi -> Gas Klorin (Cl2)` + Callout `#EF5F18` `gas klorin beracun` |
| **S06** | `21.00 - 24.60s` | *"Masalahnya, gas klorin 2,5 kali lebih berat dari udara."* | **Stage 2 (Split-View Massa Jenis)**: Timbangan/kolom perbandingan 3D sederhana: partikel udara biasa melayang ringan di atas, partikel `Cl2` padat langsung jatuh mengendap di dasar. | Top Metric Pill: `Massa jenis: 2,5x udara` + Callout `#EF5F18` `2,5x lebih berat` |
| **S07** | `24.60 - 29.60s` | *"Gasnya nggak naik ke ventilasi, tapi ngumpul di lantai setinggi wajahmu saat jongkok."* | **Stage 0 (Side Cutaway Kamar Mandi)**: Dinding kamar mandi terbelah samping; lubang angin atas kosong, lapisan awan gas `Cl2` menggenang tebal setinggi pinggang-wajah tepat saat Mas Raka jongkok. | Callout `#EF5F18`: `mengendap setinggi wajah` |
| **S08** | `29.60 - 34.80s` | *"Begitu terhirup, gas klorin ketemu air di paru-paru lalu berubah jadi asam klorida."* | **Stage 1 (Extreme Macro X-Ray Saluran Napas)**: Kamera menembus trakea masuk ke cabang paru-paru; partikel `Cl2` menyentuh lapisan air biru tipis di dinding paru dan seketika berubah jadi tetesan oranye `HCl`. | Top Metric Pill: `Cl2 + Air -> Asam Klorida` + Callout `#EF5F18` `berubah jadi asam` |
| **S09** | `34.80 - 39.80s` | *"Asam itu membakar saluran napas dari dalam sampai dada sesak dan paru terisi cairan."* | **Stage 1 (Cutaway Alveoli)**: Dinding saluran napas menyala iritasi oranye, lalu bagian bawah kantung paru perlahan terisi genangan cairan sehingga ruang napas menyempit. | Top Metric Pill: `Risiko: cairan di paru` + Callout `#EF5F18` `saluran napas terbakar` |
| **S10** | `39.80 - 42.50s` | *"Kalau terlanjur kecampur, lakukan 3 langkah ini."* | **Stage 0 (Hero Reset Terang)**: Latar bersih terang; Mas Raka berdiri tegas dengan ekspresi fokus (`focused`) di depan pintu kamar mandi. | Top Pill: `3 langkah saat terlanjur campur` |
| **S11** | `42.50 - 47.40s` | *"Pertama, jangan disiram dulu. Tahan napas lalu langsung keluar ke udara segar."* | **Stage 0 (Larangan Siram & Evakuasi)**: Ikon silang oranye pada gayung air di dalam kamar mandi; Mas Raka menahan napas, berdiri cepat, dan melangkah keluar menuju ruang terbuka berangin. | Step Pill `1`: `Jangan siram, langsung keluar` (`seg1 on`) + Callout `#0FA968` `cari udara segar` |
| **S12** | `47.40 - 52.40s` | *"Kedua, buka pintu dari luar supaya gas keluar, dan larang orang lain masuk."* | **Stage 0 (Ventilasi dari Luar)**: Mas Raka membuka pintu kamar mandi lebar-lebar dari posisi luar ruangan, panah aliran udara biru mendorong gas keluar; tangan kiri memberi tanda larangan masuk di ambang pintu. | Step Pill `2`: `Buka pintu & larang masuk` (`seg2 on`) + Callout `#0FA968` `dorong gas keluar` |
| **S13** | `52.40 - 56.20s` | *"Ketiga, kalau mata perih, bilas air mengalir 15 menit."* | **Stage 0 (Wastafel / Keran Luar)**: Mas Raka membilas area mata/wajah di bawah aliran air bersih mengalir dengan indikator timer `15 menit`. | Step Pill `3`: `Bilas 15 menit & cek sesak` (`seg3 on`) + Callout `#0FA968` `air mengalir 15 menit` |
| **S14** | `56.20 - 60.80s` | *"Kalau dada sesak, segera ke IGD karena cairan paru bisa muncul belakangan."* | **Stage 0 (Indikator Medis IGD)**: Transisi bersih ke ikon simbol medis IGD dengan jam penanda efek tertunda beberapa jam. | Step Pill `3`: `Dada sesak -> segera ke IGD` (`seg3 on`) + Callout `#EF5F18` `gejala bisa tertunda` |
| **S15** | `60.80 - 65.20s` | *"Jadi yang bikin keracunan bukan pembersihnya, tapi dua cairan yang kita campur sendiri."* | **Stage 2 (Split Comparison Aman vs Bahaya)**: Kiri (hijau): 1 botol pembersih dipakai sendiri dengan pintu terbuka. Kanan (oranye): 2 botol dicampur memicu awan gas `Cl2`. | Subtitle Karaoke Highlight: `dua cairan yang kita campur sendiri` |
| **S16** | `65.20 - 68.40s` | *"Pernah nyampur keduanya pas nyikat WC? Ceritain di komen."* | **Stage 0 (Hero Close-Up Mas Raka)**: Mas Raka menghadap kamera dengan ekspresi ramah penuh rasa ingin tahu. | Subtitle Karaoke Highlight: `Ceritain di komen` |
| **S17** | `68.40 - 70.20s` | *"Jadi... jangan panik dulu."* | **Stage 0 (Sign-Off Mas Raka)**: Mas Raka tersenyum tenang (`calm/smile`) dan mengangguk mantap. | Pill Sign-Off: `Jadi... jangan panik dulu.` |
| **S18** | `70.20 - 74.39s` | *(Outro CTA Visual `4,19s`, SFX klik taktil tanpa VO)* | **Outro Standar Brand**: Triple Circle Wipe (`#EF5F18` -> `#261A66` -> `#FFFFFF`) + Separated Circle Badge + Mas Raka Pop-Out Rise. | Unified Profile Action Bar (`@janganpanikdulu`): `+ Ikuti` -> `✓ Mengikuti` |
