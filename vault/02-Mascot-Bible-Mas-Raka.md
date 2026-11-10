---
title: "02 — Mascot Bible: Mas Raka"
tags:
  - mascot
  - character-design
  - 3d-rig
related:
  - "[[00-Home-MOC]]"
  - "[[04-3D-Camera-and-Props-Registry]]"
---

# Mascot Bible: Mas Raka

**Mas Raka** adalah wajah dan identitas utama `@janganpanikdulu`. Persona yang dibawa adalah **"mas-mas simpel tapi bisa diandalkan"** — tenang saat darurat, sigap memberi contoh tindakan fisik yang benar, dan mudah dikenali penonton dalam 0,5 detik pertama.

## 1. Spesifikasi Visual & Pakaian

- **Atasan Luar**: Kemeja *Workwear Overshirt* warna **Terracotta (`#D95D39`)** dengan lengan digulung rapi hingga siku (`cuff` putih bersih) dan 2 saku dada.
- **Kaos Dalam**: Crewneck T-Shirt **Crisp White (`#FFFFFF`)** yang memberi kontras bersih di area leher dan dada.
- **Aksesoris Ikonik**: Jam tangan kasual strap hitam (`#181E26`) dengan bezel perak dan dial putih di pergelangan tangan kiri.
- **Bawahan & Sepatu**: Celana Chino **Deep Navy (`#212B38`)** + Sneakers kasual putih bersih dengan aksen sol terracotta.
- **Warna Kulit**: Warm Nusantara Tan (`#F4B998`) dengan rona pipi hangat (`#E98A78`).

## 2. Geometri Rambut 360° (*Sculpted Side-Part Quiff*)

Rambut Mas Raka dirancang dengan siluet 360 derajat yang menyatu utuh tanpa celah dari tampak depan, 3/4, samping, maupun belakang:
- **Warna Rambut**: Soft Espresso Dark (`#1E1916`, `roughness: 0.48`).
- **Komponen Mesh (`index.html`)**:
  1. `hairBase`: `SphereGeometry(0.415, 28, 22)` menutupi tempurung kepala atas secara utuh.
  2. `sideBackTaper`: `RoundedBoxGeometry(0.762, 0.28, 0.58, 10, 0.11)` membungkus bagian samping kiri, kanan, dan tengkuk belakang secara mulus (*taper fade* rapi).
  3. `waveRightMain`: `RoundedBoxGeometry(0.50, 0.19, 0.62, 8, 0.09)` menyapu volume rambut dari poni depan hingga mahkota belakang.
  4. `frontCommaR`: `RoundedBoxGeometry(0.32, 0.15, 0.22, 6, 0.07)` membentuk jambul *comma/quiff* modern di dahi kanan.
  5. `waveLeftPart`: `RoundedBoxGeometry(0.26, 0.14, 0.54, 6, 0.068)` membentuk belahan samping kiri yang rapi.
  6. `topStrand`: `RoundedBoxGeometry(0.28, 0.10, 0.38, 6, 0.048)` memberi aksen dimensi di bagian atas.

## 3. Parameter Rigging & Animasi (`MASCOTS[0]`)

- `root.position`: Posisi karakter di ruang dunia (`cX`, `cY`, `cZ`) + gerak napas halus (`Math.sin(t * 2.5) * 0.015`).
- `root.rotation.y`: Arah hadap tubuh (`cRotY`).
- `bodyPivot.position.y`: Mendukung gerakan membungkuk/berlutut (`0.72 - cKneel * 0.22`).
- `armL.rotation.x` & `armR.rotation.x`: Menggerakkan lengan kiri dan kanan untuk menunjuk bahaya atau mencabut regulator.

---

## 4. Standar Akting Karakter Aktif & *Physical Storytelling* (Evaluasi Wajib EP02+)

Untuk mencegah karakter terlihat kaku atau sekadar berdiri mematung di dalam ruangan, mulai **EP02 dan seterusnya** rig Mas Raka wajib menerapkan **4 Pilar Akting Fisik Aktif**:

1. **Procedural Walk-Cycle & Weight Transfer (`legL`/`legR` + `bodyPivot` Sway)**
   - Setiap perpindahan koordinat `(cX, cZ)` wajib menggerakkan ayunan kaki (`legL.rotation.x = Math.sin(phase) * 0.55`, `legR.rotation.x = -Math.sin(phase) * 0.55`), ayunan lengan berlawanan, pantulan vertikal tubuh (`Math.abs(Math.sin(phase)) * 0.055`), serta kemiringan bahu/pinggul (`bodyPivot.rotation.z`). Karakter dilarang bergeser meluncur tanpa langkah kaki.
2. **4 State Ekspresi Wajah Dinamis & Head-Tracking (`headPivot`)**
   - `headPivot.rotation.y` dan `headPivot.rotation.x` wajib menoleh aktif mengikuti objek bahaya (kompor, saklar, pintu, kabel).
   - Tekstur wajah kanvas mendukung 4 ekspresi yang berganti sesuai konteks adegan:
     - `shock/alert`: Mata membelalak, alis terangkat, mulut `"O"` saat bahaya muncul pertama kali.
     - `cough/cover`: Mata menyipit + satu tangan menutup hidung/mulut saat mencium bau gas atau asap.
     - `focused`: Alis tegas fokus saat mempraktikkan langkah penyelamatan.
     - `calm/smile`: Senyum tenang khas Mas Raka + kedipan mata (`blink`) setiap `3.2 detik` pada penutup.
3. **Interaksi Fisik Langsung dengan Properti (*Hands-On Prop Choreography*)**
   - Objek di dalam diorama tidak boleh bergerak sendiri dari kejauhan. Mas Raka harus **menghampiri dan menyentuh** properti secara langsung:
     - Memegang gagang pintu dan mendorongnya terbuka.
     - Memegang handuk basah / tutup panci saat memadamkan api minyak di wajan.
     - Melompat mundur (*recoil step-back* + condong tubuh ke belakang) saat terjadi percikan api atau ledakan kecil.
4. **Peran Ganda Naratif (*Panic Reflex* vs *Calm Action*)**
   - **Babak 1 (Skenario Bahaya):** Mas Raka memperagakan **refleks panik manusia kebanyakan** secara ekspresif (misal: berjalan terburu-buru di ruang gelap, kaget saat saklar memercikkan api, atau hampir menyiram minyak panas dengan air).
   - **Babak 2 (3 Langkah Penyelamatan):** Mas Raka bertransformasi menjadi **eksekutor tenang** yang mempraktikkan 3 langkah fisik satu per satu dari jarak dekat.
