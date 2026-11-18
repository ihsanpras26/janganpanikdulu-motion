---
title: "08 — Catatan Pembelajaran Produksi Tiap Episode (Continuous Improvement Log)"
tags:
  - learnings
  - retrospective
  - production-system
  - janganpanikdulu
updated: 2026-11-18
status: active
---

# 08 — Catatan Pembelajaran Produksi Tiap Episode (`@janganpanikdulu`)

Dokumen ini mencatat evaluasi teknis, visual, copywriting, dan alur render dari tiap episode agar setiap produksi berikutnya semakin cepat, rapi, dan konsisten.

---

## EP01 — Bau Gas Bocor? Jangan Nyalakan Lampu! (`59,56s` VO)
- **Yang Berhasil**:
  - Kunci formula visual *Clean Seamless Overlay* (`@puckermanefacts` style): Top Step Pill + Sub-Pill Metrik + 1 Callout 3D + Karaoke Subtitle Bar (`42px ExtraBold`, solid `#EF5F18` highlight) tanpa Bento Card yang memenuhi layar.
  - Standarisasi watermark frosted glass pill `@janganpanikdulu` dengan titik aksen oranye.
  - Komposisi kamera *Narrow-FOV* (`22°–25°`) 3/4 arsitektural mencegah objek bawah tertutup kotak subtitle.
- **Pembelajaran untuk Episode Berikutnya**:
  - Karakter Mas Raka perlu *active physical storytelling* (walk-cycle, *head-tracking*, ekspresi wajah dinamis, interaksi tangan langsung dengan properti) — bukan berdiri statis.
  - Thumbnail diorama isometrik paling kuat jika memakai gestur tangan tegas (5-finger STOP palm), ekspresi wajah kontras, dan objek bahaya yang terlihat jelas di zona tengah.

---

## EP02 — Wajan Terbakar? Jangan Siram Air!
- **Yang Berhasil**:
  - Penerapan 4 Pilar Akting Fisik Mas Raka (`walk-cycle`, 4 state ekspresi wajah, interaksi langsung dengan tutup panci/kain basah, dan *recoil step-back* saat ledakan uap).
  - Penyesuaian posisi subtitle (*raised safe-zone subtitles*) agar tidak bertabrakan dengan UI komentar/deskripsi di TikTok & Reels.
- **Pembelajaran untuk Episode Berikutnya**:
  - Posisi safe-zone subtitle dan header wajib dicek terhadap UI overlay Reels/TikTok/Shorts sebelum render master final agar tidak perlu *re-render* berulang.

---

## EP03 — Rem Motor Matic Blong di Turunan? Jangan Matikan Mesin! (`79,50s`)
- **Yang Berhasil**:
  - Integrasi skenario jalan raya & mekanika kendaraan (Pilar B) dengan X-Ray cutaway cakram panas `>300°C` dan gelembung *vapor lock* minyak rem.
  - Sinkronisasi *render pipeline* 2-worker Chrome headless + FFmpeg lossless PNG pipe (`1080×1920`, `30fps`, `bt709`, `+faststart`) dan isolasi folder temp di Drive D:.
- **Pembelajaran untuk Episode Berikutnya**:
  - Jaga durasi antar-scene dan transisi cutaway tetap rapat agar retensi visual di segmen penjelasan mekanika tidak turun.

---

## EP04 — Digigit Ular? Jangan Diikat Kencang! (`81,51s`)
- **Yang Berhasil**:
  - Storyboard 25 scene tersinkronisasi penuh dengan VO (`77,32s` VO + `4,19s` Outro CTA).
  - X-Ray anatomi betis memvisualisasikan perbedaan pembuluh darah vs saluran getah bening secara jelas tanpa gore.
  - Sistem 3 opsi thumbnail (Frame 0 Hook, Dampak Fatal, Curiosity Gap X-Ray) dengan header card `top: 292px` dan SVG focus ring/panah terproyeksi dari koordinat 3D.
- **Pembelajaran untuk Episode Berikutnya**:
  - Gunakan proyeksi 3D-to-2D (`world -> camera.project`) untuk menempelkan SVG focus ring/panah thumbnail secara presisi ke titik objek 3D.

---

## EP05 — Motor Matic Mogok di Banjir? Jangan Pencet Starter! (`97,66s`)
- **Yang Berhasil**:
  - Diorama 22 scene dengan kedalaman jalan banjir + studio X-Ray 110cc (`12 mL` vs `1 sendok makan`, *split-view* Gas vs Air, *S-buckle* setang seher, dan perbandingan visual oli normal vs **oli kopi susu**).
  - Mas Raka memakai helm *open-visor* di jalan raya hingga ke Outro CTA.
  - Render master selesai utuh (`2930/2930` frame, `1080×1920`, `30fps`, `57,91 MB`, durasi audio/video presisi `97,66s`).
- **Kendala & Solusi Teknis yang Ditemukan di EP05**:
  1. **Script Render Belum Dibuat Otomatis**: Setelah `git pull` aset `ep05.html` & `audio_ep05_master.wav`, `scripts/render_ep05_mp4.mjs` belum ikut tersedia sehingga harus dibuat terlebih dahulu. **Action Item EP06+**: Sertakan `scripts/render_epXX_mp4.mjs` (atau buat 1 runner parametrik `render_episode_mp4.mjs --ep=06`) dalam commit episode yang sama.
  2. **Rig Sub-Objek di Thumbnail (`RAKA.armR`)**: Pada `ep05.html`, `RAKA.armR` adalah objek wrapper `{ root, forearmPivot, handPivot, fingers }`, bukan `THREE.Group` langsung—sehingga pemanggilan `RAKA.armR.position` sempat gagal saat membuat thumbnail Opsi 1. **Action Item EP06+**: Selalu gunakan `RAKA.armR.handPivot` (atau standarkan getter `getWorldAnchor(name)` di `window.OPENER`).
  3. **Timeline Seek Sebelum Override Kamera Thumbnail**: Memanggil `render(t)` tanpa `tl.time(t, false)` membuat state animasi GSAP (seperti `rodBend` dan `blockCrack` di `52.8s`) tetap berada di posisi awal. **Action Item EP06+**: Selalu jalankan `tl.time(t, false)` terlebih dahulu baru timpa `S.cam*` / `S.look*` dan panggil `render(t)`.
  4. **Framing Kepala Berhelm di Thumbnail Opsi 1**: Karena helm menambah tinggi kepala Mas Raka, kamera Opsi 1 perlu diturunkan (`lookY: 2.02`, `camZ: 8.4`) agar Title Card di `top: 268px` tidak menabrak puncak helm.
  5. **Standar Baru Publish Kit & Caption (Mulai EP05+)**:
     - Angka poin/langkah di caption memakai emoji (`1️⃣`, `2️⃣`, `3️⃣`), bukan angka biasa.
     - Caption dibuat ringkas (*scannable*, tidak kepanjangan), khususnya TikTok dibuat lebih simpel.
     - **Maksimal 5 hashtag** per platform (`#janganpanikdulu` + 4 hashtag topik utama).
     - Tetap wajib menyertakan metadata YouTube SEO lengkap (`03_Metadata_YouTube_SEO_EPXX.txt`) beserta chapter timestamps dan pinned comment.
