# Master Production Bible & Code-to-Video Architecture: @janganpanikdulu

Dokumen ini adalah **SOP Otomasi & Panduan Induk (*Master Production Bible — Code-to-Video 2D/3D Motion Graphics Edition*)** untuk akun Instagram Reels, TikTok, dan YouTube Shorts **`@janganpanikdulu`**.

Seluruh produksi kini menggunakan arsitektur **100% Programmatic Code-to-Video (Tanpa Karakter / Faceless Motion Graphics)** menggunakan **HyperFrames / Remotion + GSAP + Three.js (3D) + SVG (2D) + FFmpeg**. Pendekatan ini memangkas biaya *credit* AI Video Generator hingga Rp0, menghilangkan risiko *visual hallucination*, dan menjamin konsistensi visual 100% deterministik (*frame-accurate*).

## 1. Identitas & Konstanta Brand (Immutable Brand DNA)

| Parameter | Nilai Baku Terkunci (*Locked Value*) |
| :--- | :--- |
| **Username / Handle** | `@janganpanikdulu` |
| **Nama Saluran** | Jangan Panik Dulu! |
| **Catchphrase Wajib** | ***"Jadi... jangan panik dulu."*** |
| **Format Visual Utama** | **100% Code-to-Video (2D Vector SVG/Canvas + 3D Three.js/WebGL Motion Graphics)** — *Faceless / No Mascot Character*. |
| **Tone & Persona Suara** | **"Suara Nalar yang Tenang, Cerdas & Bisa Diandalkan"** — Menggunakan sapaan akrab **"Kamu"**, membongkar kesalahan insting panik dengan fakta sains yang jernih, praktis, dan berwawasan luas. |
| **Distribusi Pilar Topik** | **50% Pilar A (Darurat Rumah, Dapur & Keseharian)**, **20% Pilar B (Jalan Raya & Kendaraan)**, **15% Pilar C (Gedung & Ruang Publik)**, **15% Pilar D (Alam & Lingkungan)**. |
| **Spesifikasi Master Export** | Vertikal **9:16** (`1080x1920 px`) \| **30/60 fps** Deterministik \| Codec **H.264 (`libx264 -crf 18 -pix_fmt yuv420p`, ~10–12 Mbps)** + Audio **AAC 192 kbps**. |

## 2. Mengapa Code-to-Video (2D/3D) Lebih Unggul untuk `@janganpanikdulu`?

1. **Zero AI Video Generation Cost & Zero Hallucination**: Tidak perlu membakar *credit* di Google Flow/Kling/Runway dan tidak ada lagi masalah bentuk benda yang meleleh atau berubah-ubah. Semua objek 2D/3D digambar secara matematis melalui kode.
2. **100% Deterministic & Seek-Safe**: Setiap *frame* pada detik ke-`t` adalah fungsi matematika murni (`f(t)`). Jika durasi suara *Voiceover* berubah 0,2 detik, seluruh animasi kamera dan objek otomatis menyesuaikan tanpa perlu *re-generate* video dari awal.
3. **Visualisasi Fisika yang Jauh Lebih Jelas (*Living Diagrams*)**: Penjelasan tentang tekanan hidrostatik 500 kg, busur listrik 1.000°C, atau aliran udara dapat ditampilkan menggunakan **simulasi 3D Three.js *cross-section***, partikel dinamis, dan grafik vektor SVG yang presisi (seperti perpaduan *Vox Explainer*, *Fern*, *Zack D. Films 3D*, dan *Apple Product Motion*).

## 3. Best Practices Teknis: HyperFrames / Remotion + GSAP + Three.js (3D)

Seluruh komposisi video dibangun di atas standar gabungan **`hyperframes`**, **`bang-motion`**, **`impeccable`**, dan **Three.js / Remotion Best Practices**:

### 3.1 Kontrak Deterministik (Zero Flaky Rendering pada 2D & 3D)
* **Single Master Timeline (`f(t)`)**: Seluruh animasi 2D (GSAP/SVG) dan pergerakan kamera/objek 3D (Three.js) dikendalikan oleh satu *master timeline* (`window.__timelines["main"] = tl` pada HyperFrames atau `useCurrentFrame()` / `interpolate()` pada Remotion).
* **Larangan Fungsi Non-Deterministik**: Jangan pernah memakai `requestAnimationFrame` bebas, `Date.now()`, `performance.now()`, `setInterval`, atau `Math.random()` tanpa *seed* tetap. Untuk partikel 3D (seperti molekul gas LPG, uap air, atau percikan listrik), gunakan fungsi *seeded pseudo-random* (seperti Mulberry32) atau persamaan trigonometri deterministik (`Math.sin(t * freq + phase)`).
* **Sinkronisasi Render Three.js per Frame**:
  * Di dalam **HyperFrames**, panggil `renderer.render(scene, camera)` secara eksplisit di dalam *callback* `tl.eventCallback("onUpdate", ...)` atau di setiap *step* perubahan properti proxy GSAP agar kanvas WebGL (`preserveDrawingBuffer: true`) selalu menggambar ulang tepat saat *frame capture* dijalankan.
  * Di dalam **Remotion**, gunakan `<ThreeCanvas width={1080} height={1920}>` dari `@remotion/three` dan kendalikan seluruh rotasi/posisi mesh menggunakan `const frame = useCurrentFrame()`.
* **3D Cross-Section & Clipping Planes (`THREE.Plane`)**:
  * Aktifkan `renderer.localClippingEnabled = true` pada Three.js. Gunakan `THREE.Plane(new THREE.Vector3(-1, 0, 0), clipOffset)` yang dianimasikan oleh GSAP/Remotion untuk "membelah" objek 3D secara mulus di depan kamera (misalnya membelah bodi saklar lampu, membelah tabung gas, atau membelah pintu mobil untuk memperlihatkan bagian dalamnya).

### 3.2 Prinsip Sinematografi "Bang-Motion" (Satu Dunia Kontinu, Bukan Slide PowerPoint)
* **One Continuous 2D/3D World (`#world`)**: Jangan membuat video seperti tumpukan kartu atau *slide* yang hanya *fade-in / fade-out*. Bangun satu ruang koordinat berkesinambungan tempat kamera bergerak secara fisik (*Whip-Pan*, *Dolly Zoom*, *Vertical Drop*, *Macro Push-Through*).
* **Progresi Ukuran Shot Kamera (*Shot-Size Choreography*)**:
  * **Wide Establish (`1.0x`)**: Memperlihatkan konteks ruangan/lingkungan secara utuh (misal: denah isometrik 3D dapur atau jalan raya).
  * **Medium Focus (`1.8x – 2.2x`)**: Kamera bergerak mendekat ke objek pemicu masalah (misal: tabung LPG dan saklar dinding).
  * **Extreme Macro Cutaway (`4.0x – 6.0x`)**: Kamera menembus masuk ke dalam objek (*x-ray / clipping plane cutaway*) memperlihatkan mekanisme internal (misal: dua lempeng tembaga di dalam saklar yang memercikkan busur listrik).

### 3.3 Prinsip Estetika "Impeccable" (Tipografi, Warna & Data-in-Motion)
* **Palet Warna Semantik Kontras Tinggi**:
  * **Base Canvas**: *Deep Obsidian Slate* (`#0B0F17`) untuk mode *X-Ray/3D Cutaway* dan *Warm Alabaster Paper* (`#F6F5F0`) untuk mode *Clean Daylight Protocol*.
  * **Danger / Fatal Instinct Accent**: *Crimson Alert* (`#EF233C`) — untuk indikator kesalahan panik, zona bahaya, dan vektor gaya merusak.
  * **Science / Physics Accent**: *Tactical Sky-Cyan* (`#00F5D4` / `#0EA5E9`) — untuk aliran udara, gelombang tekanan, dan *wireframe* mekanis.
  * **Safe Protocol Accent**: *Emerald Safe* (`#10B981`) — untuk langkah solusi 1, 2, dan 3.
* **Living Typography & Tabular Numerals**:
  * Semua angka ilmiah (`1.000°C`, `500 KG`, `30 DETIK`) wajib menggunakan `font-variant-numeric: tabular-nums` dan dianimasikan dengan *dynamic scale count-up*.
  * Maksimal 2 level teks di layar pada saat bersamaan dengan ukuran minimum `32px` pada kanvas `1080x1920` agar langsung terbaca di layar HP.

## 4. Alur Kerja Otomasi 5 Tahap (Code-to-Video Pipeline)

| Tahap | Nama Proses | Detail Eksekusi Otomatis |
| :--- | :--- | :--- |
| **Stage 1** | **Input Ide & Validasi Sains** | **User** memberikan ide/tema $\rightarrow$ **Agent** memvalidasi prinsip fisika/kimia/medis & menyiapkan minimal 2 angka ilmiah konkret. |
| **Stage 2** | **Drafting Naskah 12 Scene & Approval Gate** | **Agent** menulis naskah **5-Beat Survival Loop (12 kalimat / 50–60 detik)** + teks siap pakai untuk **ElevenLabs** $\rightarrow$ **User** menyetujui (*Approve*). |
| **Stage 3** | **Voiceover ElevenLabs & Ekstraksi Timestamp Presisi** | **User** mengunggah file audio VO dari ElevenLabs (atau di-generate via *Browser Agent*) $\rightarrow$ **Agent** mengekstrak `t_start`, `t_end`, dan `duration` milidetik untuk ke-12 kalimat menggunakan `ffprobe`/Python. |
| **Stage 4** | **Programmatic 2D/3D Scene Coding (HyperFrames / Remotion + Three.js + GSAP)** | **Agent** menulis kode komposisi visual (`1080x1920`) yang menyinkronkan: kamera 3D/2D, animasi objek/partikel fisika, *living typography*, *HUD Pill Badge*, *Synced Subtitle*, dan *Sound Effects (SFX)* tepat mengikuti *timestamp* suara VO. |
| **Stage 5** | **Deterministic High-Bitrate MP4 Render** | **Agent** merender tiap *frame* secara deterministik via *Headless Chromium + FFmpeg* (`libx264 -crf 18 -maxrate 12M -pix_fmt yuv420p`) menjadi file `.mp4` siap unggah ke Reels, TikTok, dan Shorts. |

## 5. DNA Scriptwriting: "The 5-Beat Survival Loop" (12 Kalimat / Tanpa Karakter)

Walaupun tanpa karakter maskot, naskah tetap mempertahankan **DNA penceritaan sudut pandang orang kedua ("Kamu")** yang langsung menempatkan penonton di tengah skenario darurat:

| Beat | Scene | Waktu | Fungsi Naratif | Formula Kalimat Wajib & Arah Visual Motion Graphics |
| :--- | :--- | :--- | :--- | :--- |
| **Beat 1: Common Mistake Hook** | 01–02 | `00–08s` | Menampilkan reflek panik paling umum dan akibat fatalnya secara instan. | *"Kalau kamu [situasi darurat harian], terus kamu langsung [reflek panik umum]... selamat! Kamu baru aja [akibat fatal]."*<br>**Visual**: Transisi cepat dari objek normal ke simulasi ledakan/kegagalan vektor merah `#EF233C`. |
| **Beat 2: The Science Insight** | 03–04 | `08–20s` | Membongkar mekanisme fisika/kimia/medis di balik kegagalan tadi (+ minimal 1 angka ilmiah konkret). | *"Loh, kok bisa?! Kelihatannya sepele, tapi secara sains [penjelasan mekanisme + angka konkret]!"*<br>**Visual**: Kamera *Macro Push-Through* menembus ke dalam potongan 3D/2D *X-Ray* objek + *counter* angka *tabular-nums*. |
| **Beat 3: Second Myth Buster** | 05–06 | `20–30s` | Mematahkan kebiasaan salah kedua atau mitos turun-temurun yang sering dilakukan orang. | *"Terus gimana, [mitos/kebiasaan salah kedua]? Jangan! Itu malah bikin [alasan ilmiah kenapa berbahaya]."*<br>**Visual**: Simulasi visual mitos kedua yang disilang tegas dengan indikator bahaya merah. |
| **Beat 4: The 3-Step Solution** | 07–10 | `30–50s` | Memberikan 3 langkah penyelamatan berurutan yang memanfaatkan celah sains. | *"Jadi di detik-detik pertama, lakukan 3 langkah tenang ini. Satu: [Langkah 1]. Dua: [Langkah 2 + alasan sains]. Tiga: [Langkah 3]."*<br>**Visual**: Latar berubah bersih/terang, kamera memandu langkah `[1]`, `[2]`, `[3]` dengan vektor hijau `#10B981` & cyan `#0EA5E9`. |
| **Beat 5: Payoff & Short Sign-Off** | 11–12 | `50–58s` | Kalimat kesimpulan yang kontras dan ditutup *catchphrase* pendek wajib. | *"Saat darurat, insting sering menipu, tapi sains bikin kamu selamat. Jadi... jangan panik dulu."*<br>**Visual**: *Split comparison* (Insting Panik vs Solusi Sains) yang bertransisi *match-cut* ke kartu akhir `@janganpanikdulu`. |

## 6. Empat Pilar Topik (50% Fokus di Pilar A — Rumah, Dapur & Keseharian)

| Pilar & Porsi Konten | Daftar Ide Topik Siap Produksi (Sangat Cocok untuk Visualisasi 2D/3D Motion Graphics) |
| :--- | :--- |
| **PILAR A (50%)**<br>**Darurat Rumah, Dapur & Kosan**<br>*(Fokus Utama)* | 1. **Wajan minyak terbakar** disiram air $\rightarrow$ Simulasi 3D air tenggelam di bawah minyak 300°C & ledakan uap vs tutup panci.<br>2. **Mencium bau gas LPG bocor** saat masuk dapur $\rightarrow$ Visualisasi partikel gas berat di lantai & busur listrik 1.000°C di dalam saklar lampu.<br>3. **Tersedak makanan saat sendirian** $\rightarrow$ Potongan anatomi 3D saluran napas/epiglotis & sudut dorongan diafragma di kursi.<br>4. **Menolong orang kesetrum listrik** $\rightarrow$ Visualisasi aliran arus 220V yang mengunci otot tangan (*tetanic contraction*) vs isolator.<br>5. **Colokan listrik / charger terbakar** $\rightarrow$ Konduktivitas air vs pemutusan MCB & reaksi kimia *baking soda*.<br>6. **Kulit kena minyak panas dioles odol** $\rightarrow$ Penampang 3D lapisan epidermis kulit yang terperangkap panas di bawah lapisan pasta gigi vs air mengalir.<br>7. **Mencampur pemutih pakaian dengan pembersih kloset** $\rightarrow$ Simulasi ikatan molekul menghasilkan gas klorin ($Cl_2$) beracun.<br>8. **Pecahan kaca/beling halus di lantai** $\rightarrow$ Mikro-geometri serpihan kaca di pori-pori roti tawar/lakban vs sapu biasa. |
| **PILAR B (20%)**<br>**Darurat Jalan Raya & Kendaraan** | 9. **Mobil tercebur ke sungai/banjir** $\rightarrow$ Vektor gaya hidrostatik 500 kg pada penampang pintu vs titik tegangan sudut kaca *tempered*.<br>10. **Rem blong di turunan curam** $\rightarrow$ Simulasi *brake fade* (panas cakram rem) vs mekanisme *engine brake* pada transmisi.<br>11. **Ban pecah di kecepatan 100 km/jam** $\rightarrow$ Vektor momentum & titik tumpu gravitasi saat direm mendadak vs lepas gas perlahan.<br>12. **Mobil mogok di rel kereta api** $\rightarrow$ Sudut penyebaran lontaran puing (vektor 45 derajat menyongsong arah kereta). |
| **PILAR C (15%)**<br>**Darurat Gedung & Ruang Publik** | 13. **Lift gedung jatuh bebas** $\rightarrow$ Fisika kecepatan jatuh vs distribusi gaya impak saat rebahan telentang.<br>14. **Terjebak desakan kerumunan (*crowd crush*)** $\rightarrow$ Tekanan gelombang massa (ribuan Newton) pada rongga dada vs kuda-kuda pelindung paru-paru.<br>15. **Kebakaran di gedung tinggi** $\rightarrow$ Stratifikasi termal asap beracun ($CO$) di langit-langit vs zona oksigen bersih 30 cm di dekat lantai. |
| **PILAR D (15%)**<br>**Darurat Alam & Lingkungan** | 16. **Terseret arus balik pantai (*rip current*)** $\rightarrow$ Peta vektor arus balik sempit dari atas & jalur berenang sejajar pantai.<br>17. **Rambut berdiri saat mendung di lapangan** $\rightarrow$ Loncatan muatan positif (*upward streamer*) & gradien tegangan tanah pada posisi jongkok tumit menyatu. |
