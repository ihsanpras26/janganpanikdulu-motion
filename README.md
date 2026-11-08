# @janganpanikdulu — Motion Graphics & 3D Code-to-Video Engine

Engine animasi 3D arsitektural (*Three.js + GSAP + 2D UI Motion Graphic*) untuk serial edukasi **@janganpanikdulu**, terinspirasi dari DNA visual bersih ala `@puckermanefacts` dan scriptwriting micro-sentence ala `@hasyaaap`.

---

## 🚀 Quick Start di Device Lain

### 1. Jalankan Local Server
Buka terminal di folder project:
```bash
npm run serve
```
Buka browser di:
- `http://localhost:8765/index.html` (Interaktif: Play master audio, timeline slider, tombol lompat adegan).

---

## 🛠️ Perintah Build & Render

Pastikan di device sudah terpasang:
- **Node.js** (v18+)
- **Python** (v3.10+ dengan `numpy`)
- **FFmpeg** (terdaftar di system PATH)
- **Google Chrome**

```bash
# 1. Regenerate Master Audio (Mix VO + SFX Asli @puckermanefacts + Procedural Foley)
npm run audio

# 2. Capture 9 Keyframes Preview & Contact Sheet
npm run preview:snap

# 3. Render Sample Preview MP4 (0.0s - 21.4s)
npm run render:clip

# 4. Render Master Video Penuh 1080p (59.56s, 30fps High Bitrate)
npm run render:full
```

---

## 📁 Struktur Project

- `index.html`: WebGL Three.js Scene, rig 3D Mas Raka, Tabung Gas Melon 3kg Indonesia, cutaway saklar tembaga, timeline GSAP, dan word-by-word karaoke subtitle bar.
- `audio_ep01_master.mp3` & `.wav`: Audio master hasil gabungan VO Mas Raka + SFX bersih `@puckermanefacts`.
- `vo_ep01.mp3`: File Voiceover utama (ElevenLabs).
- `sfx_puckermane/`: Sampel sound effect bersih yang diekstrak langsung dari referensi `@puckermanefacts` (`whoosh-thump`, `step-pop`, `mech-snap`, dll).
- `scripts/`:
  - `build_master_audio.py`: Generator audio master mixing VO dan SFX.
  - `snap_ep01_preview.mjs`: Script CDP untuk screenshot 9 adegan & contact sheet.
  - `render_preview_clip.mjs`: Renderer video sample MP4.
  - `render_ep01_mp4.mjs`: Renderer video full master 59.56s.
- `vault/`: Obsidian knowledge base berisi naskah episode, brand identity guideline, mascot bible Mas Raka, dan aset gambar.
