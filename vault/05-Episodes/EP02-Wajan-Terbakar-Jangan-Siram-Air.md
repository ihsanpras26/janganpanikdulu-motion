---
title: "EP02 — Wajan Terbakar? Jangan Siram Air!"
episode: 2
topic: "Penanganan Api di Wajan Minyak Goreng (Grease Fire & Steam Explosion)"
pillar: "Pilar A — Darurat Rumah, Dapur & Keseharian"
mascot: "[[02-Mascot-Bible-Mas-Raka|Mas Raka]]"
palette: "[[01-Brand-Identity-Orange-Blue|Option 2: White × Deep Indigo #261A66 × Solid Orange #EF5F18]]"
playbook: "[[07-Scriptwriting-DNA-Playbook]]"
status: draft-script-waiting-approval
---

# EP02 — Wajan Terbakar? Jangan Siram Air! (SCRIPT & ELEVENLABS VO KIT)

## 1. Naskah Utama (`~35–45 Detik` | 14 Kalimat Lugas, Jelas, Tanpa Kiasan)

```text
Kenapa saat wajan kebakaran di kompor, kamu nggak boleh menyiramnya pakai air?
Karena segayung air justru bikin apinya meledak ke seluruh dapur.
Misalnya lagi goreng makanan, minyak terlalu panas lalu menyala api, dan tangan refleks menyiram air.

Minyak goreng yang terbakar sendiri itu suhunya sudah mencapai 300 derajat.
Masalahnya, air lebih berat daripada minyak dan tidak bisa menyatu.
Saat disiram, air langsung tenggelam menembus minyak ke dasar wajan yang sangat panas.
Dalam sekejap, air mendidih jadi uap dan mengembang 1.700 kali lipat.
Ledakan uap dari dasar wajan ini langsung melontarkan minyak menyala ke udara.

Kalau wajan di kompor terbakar, lakukan 3 langkah ini:
Pertama, jangan siram air dan jangan angkat wajan yang sedang terbakar.
Kedua, matikan kompor dari knopnya untuk memutus sumber panas.
Ketiga, tutup rapat wajan dengan tutup panci atau kain basah yang sudah diperas supaya apinya kehabisan oksigen.

Jadi yang bikin api menyembur ke seluruh dapur bukan minyaknya, tapi air yang kita siram saat panik.
Jadi... jangan panik dulu.
```

---

## 2. Kit ElevenLabs Voiceover (Mas Raka Persona)

### A. Teks Siap Copy-Paste ke ElevenLabs (Phonetic-Optimized Tanpa Tag)
*(Semua angka sudah ditulis huruf — `tiga ratus derajat`, `seribu tujuh ratus kali lipat`, `tiga langkah` — agar lafal bahasa Indonesia 100% mulus dan jeda antarkalimat terbaca jelas untuk ekstraksi timestamp otomatis).*

```text
Kenapa saat wajan kebakaran di kompor, kamu nggak boleh menyiramnya pakai air?
Karena segayung air, justru bikin apinya meledak ke seluruh dapur.
Misalnya lagi goreng makanan, minyak terlalu panas lalu menyala api, dan tangan refleks menyiram air.

Minyak goreng yang terbakar sendiri itu, suhunya sudah mencapai tiga ratus derajat.
Masalahnya, air lebih berat daripada minyak, dan tidak bisa menyatu.
Saat disiram, air langsung tenggelam menembus minyak ke dasar wajan yang sangat panas.
Dalam sekejap, air mendidih jadi uap, dan mengembang seribu tujuh ratus kali lipat.
Ledakan uap dari dasar wajan ini, langsung melontarkan minyak menyala ke udara.

Kalau wajan di kompor terbakar, lakukan tiga langkah ini.
Pertama, jangan siram air, dan jangan angkat wajan yang sedang terbakar.
Kedua, matikan kompor dari knopnya untuk memutus sumber panas.
Ketiga, tutup rapat wajan dengan tutup panci, atau kain basah yang sudah diperas, supaya apinya kehabisan oksigen.

Jadi yang bikin api menyembur ke seluruh dapur bukan minyaknya, tapi air yang kita siram saat panik.
Jadi... jangan panik dulu.
```

### B. Teks dengan Expression Tags (Khusus Model ElevenLabs v3/v4 yang Mendukung Audio Tags)
```text
[curious, engaging] Kenapa saat wajan kebakaran di kompor, kamu nggak boleh menyiramnya pakai air?
[serious, punchy] Karena segayung air, justru bikin apinya meledak ke seluruh dapur.
Misalnya lagi goreng makanan, minyak terlalu panas lalu menyala api, dan tangan refleks menyiram air.

[clear, informative] Minyak goreng yang terbakar sendiri itu, suhunya sudah mencapai tiga ratus derajat.
Masalahnya, air lebih berat daripada minyak, dan tidak bisa menyatu.
Saat disiram, air langsung tenggelam menembus minyak ke dasar wajan yang sangat panas.
[emphatic] Dalam sekejap, air mendidih jadi uap, dan mengembang seribu tujuh ratus kali lipat.
Ledakan uap dari dasar wajan ini, langsung melontarkan minyak menyala ke udara.

[calm, authoritative] Kalau wajan di kompor terbakar, lakukan tiga langkah ini.
Pertama, jangan siram air, dan jangan angkat wajan yang sedang terbakar.
Kedua, matikan kompor dari knopnya untuk memutus sumber panas.
Ketiga, tutup rapat wajan dengan tutup panci, atau kain basah yang sudah diperas, supaya apinya kehabisan oksigen.

[thoughtful] Jadi yang bikin api menyembur ke seluruh dapur bukan minyaknya, tapi air yang kita siram saat panik.
[warm, calm smile] Jadi... jangan panik dulu.
```

---

## 3. Rencana Storyboard 3D Diorama & Seamless Clean UI (`1080x1920`)

| Kalimat | Beat | Visual 3D Three.js (Dapur Mas Raka + Cutaway Wajan) | UI Overlay (`#hook-card`, `#step-tracker`, Callout) |
| :--- | :--- | :--- | :--- |
| **01** | **Hook** | Sudut 3/4 dapur: wajan di atas kompor dua tungku menyala api, Mas Raka kaget memegang gayung berisi air. | `#hook-card`: `WAJAN KEBAKARAN?` + Pill `JANGAN SIRAM AIR!` |
| **02** | **Hook Payoff** | Simulasi semburan bola api (*fireball*) membubung ke atas saat air menyentuh wajan. | Callout merah: `API MENYEMBUR KE ATAS` |
| **03** | **Micro-Scenario** | Rewind ke wajan berisi minyak mendidih yang mulai mengeluarkan asap tebal lalu muncul lidah api, tangan refleks mendekat bawa gayung. | Subtitle Karaoke Highlight: `refleks menyiram air` |
| **04** | **Science 1 (Suhu)** | Kamera *Macro Push-In* ke wajan yang dibelah (*3D Cross-Section Cutaway*), memperlihatkan cairan minyak keemasan yang membara. | Top Sub-Pill Metrik: `SUHU MINYAK: 300°C` + Callout `TITIK NYALA MINYAK` |
| **05** | **Science 2 (Massa Jenis)** | Tetesan air biru masuk ke minyak; visualisasi partikel air yang lebih padat tidak menyatu dengan minyak. | Top Sub-Pill Metrik: `AIR LEBIH BERAT DARI MINYAK` |
| **06** | **Science 3 (Tenggelam)** | Potongan *X-Ray* wajan: gumpalan air biru langsung tenggelam menembus lapisan minyak menuju dasar logam wajan yang merah membara. | Callout merah menunjuk dasar wajan: `TENGGELAM KE DASAR 300°C` |
| **07** | **Science 4 (Ekspansi)** | Di dasar wajan, air biru berubah jadi gelembung uap putih-oranye yang membesar drastis dengan panah vektor radial ke segala arah. | Top Sub-Pill Metrik: `UAP MENGEMBANG 1.700× LIPAT` |
| **08** | **Science 5 (Lontaran)** | Gelembung uap meledak dari bawah dan melontarkan ratusan butiran minyak berapi ke udara. | Callout merah: `MINYAK BERAPI TERLONTAR` |
| **09** | **Transisi Solusi** | Kamera kembali ke sudut 3/4 bersih; Mas Raka tenang memberi isyarat 3 langkah. | `#step-tracker` aktif: `3 LANGKAH SAAT WAJAN TERBAKAR` |
| **10** | **Langkah 1** | Indikator silang tegas pada gayung air dan gagang wajan agar tidak diangkat. | Step Pill `1`: `JANGAN SIRAM AIR & JANGAN ANGKAT` (`progress dot 1 on`) |
| **11** | **Langkah 2** | Close-up tangan Mas Raka memutar knop kompor ke posisi `OFF`, api biru di tungku bawah langsung padam. | Step Pill `2`: `MATIKAN KNOP KOMPOR` (`progress dot 2 on`) + Callout hijau `SUMBER PANAS PUTUS` |
| **12** | **Langkah 3** | Mas Raka menggeser tutup panci besi dari samping menutup rapat mulut wajan; di dalam *cutaway*, oksigen habis dan api padam. | Step Pill `3`: `TUTUP RAPAT DENGAN TUTUP PANCI` (`progress dot 3 on`) + Callout hijau `OKSIGEN TERPUTUS` |
| **13** | **Contrast Payoff** | Split/transisi perbandingan tenang di dapur yang sudah aman, uap tipis keluar saat wajan dingin. | Subtitle Karaoke Highlight: `bukan minyaknya` vs `air yang kita siram` |
| **14** | **Sign-Off** | Mas Raka tersenyum tenang di dapur yang aman + penutup brand `@janganpanikdulu`. | Pill Sign-Off: `JADI... JANGAN PANIK DULU.` |
