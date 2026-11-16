---
title: "03 — Clean Seamless Overlay & Contextual Bento System"
tags:
  - ui-ux
  - overlay-system
  - seamless-design
  - antislop
related:
  - "[[00-Home-MOC]]"
  - "[[01-Brand-Identity-Orange-Blue]]"
---

# 03 — Clean Seamless Overlay & Contextual Bento System (`1080x1920`)

Sistem overlay `@janganpanikdulu` mengutamakan **tampilan bersih, lega, dan menyatu (*seamless*) dengan objek 3D seperti `@puckermanefacts`**, menggunakan palet terkunci **Opsi 2 (`#FFFFFF` Crisp White × `#261A66` Deep Indigo × `#EF5F18` Solid Orange)**.

## 1. Prinsip Fleksibilitas Overlay (Penting!)

1. **Default Overlay = Clean & Seamless (`@puckermanefacts` Style)**:
   - Setiap langkah (Beat 2, 3, 4) menggunakan **Floating White Step Pill (`#step-tracker`)** yang ramping di tengah atas (`[1] Jangan sentuh saklar` + 3 bar progress di bawahnya) agar ruang tengah kanvas 3D tetap lega dan bersih.
2. **Bento Fact Card (`#bento-card`) Bersifat Kontekstual / Opsional**:
   - Kartu informasi Bento **TIDAK wajib muncul di setiap beat atau di setiap video**.
   - Gunakan kartu Bento secara fleksibel **hanya ketika sebuah beat memiliki angka/fakta sains spesifik yang perlu ditekankan secara visual** (contoh: fakta `2× Gas elpiji lebih berat dari udara` pada Beat 3).
   - Untuk beat aksi langsung (seperti mencabut regulator atau menjauhi saklar), biarkan layar tetap bersih hanya dengan *Step Pill* atas, *3D Leader-Line Callout*, dan *Subtitle Bar* bawah.

## 2. Komponen Utama Overlay (Opsi 2: White × Indigo × Orange)

- **Logo Brand (`.logo`)**: Squircle solid `#261A66` (`84x84px`, `border-radius: 24px`) dengan border `#EF5F18` (`4px solid`) dan teks putih `jpd` + `@janganpanikdulu`.
- **Hook Lockup (`#hook-card`)**:
  - Judul putih tebal (`100px`) dengan outline solid `#261A66` (`15px`).
  - Pill miring `-2°` berlatar solid `#261A66`, teks putih, border putih `4px`, dan bayangan blok solid `#EF5F18`.
- **Clean Step Pill (`#step-tracker`)**:
  - Kapsul putih `#FFFFFF` (`border: 3px solid #261A66`) dengan lingkaran nomor solid `#EF5F18` dan teks judul langkah `#261A66` + 3 bar progress di bawahnya.
- **3D Leader-Line Callout (`.callout`)**:
  - Badge putih `#FFFFFF` (`border-radius: 16px`) dengan border solid `#EF5F18` (bahaya) atau `#0FA968` (aman) + ikon SVG vektor, terhubung langsung ke objek 3D yang bersih.
- **Subtitle Bar Bawah (`.sub-card`)**:
  - Kontainer putih `#FFFFFF` (`border: 3px solid #261A66`, `border-radius: 24px`) dengan teks `#261A66` dan highlight kata kunci berupa pill solid `#EF5F18` berteks putih.

## 3. ZONA 5 — Reusable Outro System (Pop-Out Circle Bust & Paced 4.19s Outro)

Sistem penutup (*outro*) standar berdurasi **`4.19s`** (`buildOutroTimeline(tl, t0)` di `index.html`), dipicu tepat setelah kalimat wajib `"Jadi... jangan panik dulu."`:

- **`0.00s - 1.35s` | Jeda Nafas & Silky Triple Circle Wipe**:
  - Jeda nafas **`0.45s`** + Silky Triple Circle Wipe (**`#EF5F18` Signal Orange** → **`#261A66` Deep Indigo** → **`#FFFFFF` Crisp White**, `expo.inOut`).
  - Mengaktifkan class `stage.outro-active` untuk menyembunyikan properti diorama dapur dan mengisolasi panggung penutup di atas latar putih bersih `#FFFFFF`.
- **`1.05s - 1.55s` | Separated Circle Badge**:
  - **Separated Circle Badge** (`460x460px`, pusat `540x740px`, solid `#261A66` dengan border `12px solid #EF5F18`) mekar bersih (`power3.out`).
- **`1.30s - 1.95s` | Mas Raka Pop-Out Rise**:
  - Karakter naik dari bawah dalam lingkaran (`cY: -1.15 -> -0.22`, deselerasi `power4.out`) dengan bagian bawah ter-clip mengikuti busur lingkaran bawah (`r = 218px`), sementara kepala, jambul, dan tangan sapa keluar melewati tepi atas lingkaran.
- **`1.75s - 2.25s` | Unified Profile Action Bar**:
  - **Unified Profile Action Bar** (`880x156px`, `top: 1090px`, jarak bersih `120px` di bawah lingkaran) masuk halus (`power3.out`) bersamaan dengan VO CTA, memuat avatar `pp_janganpanikdulu_final.png`, `@janganpanikdulu`, dan tombol solid `#EF5F18` berlabel **`+ Ikuti`**.
- **`2.25s - 4.19s` | Cursor Slide, Tactile Click & Loop-Safe Hold**:
  - Kursor meluncur (`power2.inOut`) → klik taktil pada **`2.73s`** mengubah tombol ke solid `#261A66` **`✓ Mengikuti`** + *orange ring ripple* + anggukan tenang Mas Raka, lalu bertahan dalam *loop-safe hold* **`1.01s`** hingga akhir durasi `4.19s`.
