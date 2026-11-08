---
title: "01 — Brand Identity: Solid Orange × Deep Indigo"
tags:
  - brand-identity
  - color-palette
  - ui-tokens
related:
  - "[[00-Home-MOC]]"
  - "[[03-UI-Overlay-Bento-System]]"
---

# Brand Identity: Solid Orange (`#EF5F18`) × Deep Indigo (`#261A66`) × White (`#FFFFFF`)

Identitas warna `@janganpanikdulu` menggunakan perpaduan **tiga warna solid kontras tinggi** yang menggabungkan kesan **waspada/energi** (`#EF5F18` Signal Orange), **tenang/otoritas sains** (`#261A66` Deep Royal Indigo), dan **bersih/mudah dibaca** (`#FFFFFF` Crisp White).

## 1. Token Warna Utama (100% Solid UI)

| Nama Token | Kode Hex | Peran Visual |
| :--- | :--- | :--- |
| **Crisp White** | `#FFFFFF` | Teks utama di atas permukaan gelap, permukaan kartu terang, & callout 3D |
| **Signal Orange** | `#EF5F18` | Aksen utama brand, logo squircle `jpd`, pill metrik, & highlight kata kunci |
| **Scarlet Bikini (Deep Indigo)** | `#261A66` | Permukaan otoritas utama (Bento Card, Subtitle Bar, & outline teks Hook) |
| **Royal Cobalt** | `#1D265E` | Variasi biru tua komplementer untuk opsi Bento Card Orange |
| **Safe Emerald** | `#0FA968` | Indikator tindakan penyelamatan aman pada 3D callout |
| **Hazard Rose** | `#E11D48` | Indikator bahaya/suhu ekstrem pada 3D callout |

## 2. Aturan Pemisahan Warna Solid vs Gradasi Kontras

1. **Elemen UI = 100% Solid Color**:
   - Semua komponen antarmuka (`.logo`, `.step-progress`, `.hook-pill`, `#bento-card`, `.bento-pill`, `.callout`, `.sub-card`, dan highlight kata kunci) **wajib menggunakan warna solid murni** tanpa `linear-gradient`.
2. **Latar Kontras = Progressive Gradient + Blur Scrim**:
   - `.scrim-top` (tinggi `540px`) dan `.scrim-bottom` (tinggi `480px`) menggunakan gradasi halus dari `rgba(20, 14, 54, 0.72)` ke `rgba(20, 14, 54, 0)` ditambah `backdrop-filter: blur(8px)` dengan `mask-image` progresif agar 3D scene yang terang tidak bertabrakan dengan teks overlay.

## 3. Eksplorasi 3 Kombinasi Brand (`?palette=0|1|2`)

### Combo 1 (`palette=0`): **Indigo Bento × Orange Signal** *(Recommended)*
- **Bento Card**: Solid Deep Indigo (`#261A66`) dengan judul putih (`#FFFFFF`), deskripsi `#DBD6F8`, pill metrik bawah Solid Orange (`#EF5F18`), dan ilustrasi vektor tonal `#4D39B8`.
- **Hook Pill**: Solid Orange (`#EF5F18`) dengan teks putih dan bayangan blok `#261A66`.
- **Subtitle Bar**: Solid Deep Indigo (`#261A66`) dengan highlight kata kunci Solid Orange (`#EF5F18`).

### Combo 2 (`palette=1`): **White Bento × Indigo-Orange Duo**
- **Bento Card**: Solid Crisp White (`#FFFFFF`) dengan judul Deep Indigo (`#261A66`), deskripsi `#494175`, pill metrik bawah Solid Orange (`#EF5F18`), dan ilustrasi vektor tonal `#E8E4FA`.
- **Hook Pill**: Solid Deep Indigo (`#261A66`) dengan teks putih dan bayangan blok Solid Orange (`#EF5F18`).
- **Subtitle Bar**: Solid Deep Indigo (`#261A66`) dengan highlight kata kunci Solid Orange (`#EF5F18`).

### Combo 3 (`palette=2`): **Orange Bento × Royal Cobalt**
- **Bento Card**: Solid Signal Orange (`#EF5F18`) dengan judul putih (`#FFFFFF`), deskripsi `#FFE6D8`, pill metrik bawah Solid Royal Cobalt (`#1D265E`), dan ilustrasi vektor tonal `#FF8547`.
- **Hook Pill**: Solid Signal Orange (`#EF5F18`) dengan teks putih dan bayangan blok `#1D265E`.
- **Subtitle Bar**: Solid Royal Cobalt (`#1D265E`) dengan highlight kata kunci Solid Orange (`#EF5F18`).
