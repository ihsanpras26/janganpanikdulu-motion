---
title: "04 — 3D Camera Angles & Modular Props Registry"
tags:
  - 3d-camera
  - cinematography
  - threejs-props
related:
  - "[[00-Home-MOC]]"
  - "[[02-Mascot-Bible-Mas-Raka]]"
---

# 3D Camera Angles & Modular Props Registry

Konten `@janganpanikdulu` tidak terkunci pada satu sudut isometrik statis. Setiap episode menggunakan **4 sudut kamera sinematik** agar informasi tersampaikan dengan jelas dan retensi visual tetap tinggi.

## 1. Standar 4 Sudut Kamera Dinamis

| Beat | Durasi | Nama Angle | FOV | Posisi Kamera (`camX, camY, camZ`) | Titik Fokus (`lookX, lookY, lookZ`) | Fungsi Naratif |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Beat 1 (Hook)** | `0.0s - 3.0s` | **Eye-Level Medium Shot** | `35°` | `(2.35, 2.65, 5.85)` -> `(2.05, 2.55, 5.45)` | `(0.45, 1.95, -1.10)` | Memperkenalkan Mas Raka dan situasi darurat secara dekat & relatable. |
| **Beat 2 (Step 1)** | `3.0s - 6.0s` | **Over-The-Shoulder (OTS) Macro** | `34°` | `(0.15, 2.35, 2.45)` | `(0.95, 1.85, -2.25)` | Menyorot bahaya mikro (misal percikan saklar listrik) tepat dari balik bahu Mas Raka. |
| **Beat 3 (Step 2)** | `6.0s - 9.0s` | **3/4 High-Angle Cutaway** | `23°` | `(9.20, 10.80, 12.20)` | `(-0.10, 0.98, -0.35)` | Memperlihatkan fenomena sains/fisika berskala ruangan (misal lapisan gas di lantai). |
| **Beat 4 (Step 3)** | `9.0s - 12.0s` | **Low-Angle Hero Action Shot** | `35°` | `(2.15, 1.85, 5.55)` | `(0.32, 1.82, -1.35)` | Menampilkan tindakan penyelamatan Mas Raka secara heroik, jelas, dan menenangkan. |

## 2. Katalog Properti 3D Modular (`index.html`)

- **Ruangan Diorama**: Lantai keramik bertekstur grid (`makeTileTexture()`), dinding pastel hangat, baseboard kayu, dan kabinet dapur.
- **Tabung Gas Melon 3kg & Regulator (`regulatorGroup`)**: Dilengkapi katup pengunci merah (`regSwitch`) yang dapat berputar dan terangkat (`S.regLift`).
- **Saklar Dinding & Efek Percikan (`sparkBurst`)**: Saklar dinding putih dengan geometri kilatan api kuning-oranye (`S.sparkScale`).
- **Volume Gas Mengendap (`gasVolumeGroup`)**: Lapisan volume semi-transparan di permukaan lantai dengan garis tepi (`S.gasOpacity`).
- **Jendela Berengsel & Panah Udara (`winSashPivot` & `airflowGroup`)**: Daun jendela yang membuka lebar (`S.winOpen`) disertai aliran panah udara segar (`S.airOpacity`).
