## name: jangan-panik-dulu
description: End-to-end automated Code-to-Video (2D/3D Motion Graphics) production engine for @janganpanikdulu. Preserves the signature 5-Beat Survival Loop scriptwriting DNA, tone, and branding while generating deterministic, faceless 2D/3D motion graphics (using HyperFrames, Remotion, GSAP, Three.js, and SVG) synced to ElevenLabs voiceover and rendered to 9:16 1080p high-bitrate MP4. Use whenever creating scripts, motion storyboards, or code-to-video episodes for @janganpanikdulu.

# Jangan Panik Dulu Code-to-Video Engine (2D & 3D Motion Graphics)

Automate the end-to-end production of `@janganpanikdulu` short-form vertical videos (Instagram Reels, TikTok, YouTube Shorts). This engine uses a **100% Programmatic Code-to-Video architecture (Faceless / No Mascot Character)** combining **HyperFrames / Remotion + GSAP + Three.js (3D) + SVG/Canvas (2D) + FFmpeg**, eliminating external AI video generation costs and visual inconsistencies while keeping 100% of the channel's signature scripting DNA, tone, and branding.

## Core Brand & Scripting DNA (Locked Constants)

* **Account Handle**: `@janganpanikdulu`

* **Mandatory Closing Catchphrase**: `"Jadi... jangan panik dulu."`

* **Visual Format**: **100% Code-to-Video 2D & 3D Motion Graphics** (No mascot character; every concept is visualized through dynamic 3D cross-sections, vector mechanics, physics force arrows, particle simulations, and living typography).

* **Narrator Tone & Persona**: Conversational, calm, smart, and reliable Indonesian voice using `"Kamu"` (never `"Anda"` or `"Lo-Gue"`). Explains complex physics/biology/chemistry in simple everyday terms.

* **4 Topic Pillars (50% Pillar A Priority)**:

  * **Pilar A - Darurat Rumah, Dapur & Keseharian (50%)**: Wajan minyak terbakar disiram air, bau gas LPG bocor & saklar lampu, tersedak sendirian, kulit kena minyak panas dioles odol, kesetrum listrik rumah, mencampur pemutih & pembersih kloset, colokan terbakar.

  * **Pilar B - Darurat Jalan Raya & Kendaraan (20%)**: Mobil tercebur ke sungai, rem blong, ban pecah di tol, mogok di rel kereta.

  * **Pilar C - Darurat Gedung & Ruang Publik (15%)**: Lift jatuh, *crowd crush*, kebakaran gedung.

  * **Pilar D - Darurat Alam & Lingkungan (15%)**: Arus *rip current* pantai, tanda petir menyambar di lapangan.

## 5-Stage Code-to-Video Automation Workflow

### Stage 1: Topic Intake & Scientific Validation

1. Receive the topic, raw idea, or data from the user.

2. Validate the exact scientific mechanism and lock at least **2 concrete numerical metrics** (e.g., `1.000°C electric arc`, `300°C oil vaporization`, `500 kg hydrostatic load`, `30 seconds golden window`).

### Stage 2: 12-Scene Script & Motion Plan (WAIT FOR USER APPROVAL)

1. Write the **12-sentence voiceover script** (140-165 words, 50-60 seconds) strictly following **The 5-Beat Survival Loop**:

   * **Beat 1 - Common Mistake Hook (Scenes 01-02 | 00:00-00:08)**:
     `"Kalau kamu [situasi darurat harian], terus kamu langsung [reflek panik umum]... selamat! Kamu baru aja [akibat fatal]."`

   * **Beat 2 - The Science Insight (Scenes 03-04 | 00:08-00:20)**:
     `"Loh, kok bisa?! Kelihatannya sepele, tapi secara sains [penjelasan mekanisme + angka konkret]!"`

   * **Beat 3 - Second Myth Buster (Scenes 05-06 | 00:20-00:30)**:
     `"Terus gimana, [mitos/kebiasaan salah kedua]? Jangan! Itu malah bikin [alasan ilmiah kenapa berbahaya]."`

   * **Beat 4 - The 3-Step Scientific Solution (Scenes 07-10 | 00:30-00:50)**:
     `"Jadi di detik-detik pertama, lakukan 3 langkah tenang ini. Satu: [Langkah 1]. Dua: [Langkah 2 + alasan sains]. Tiga: [Langkah 3]."`

   * **Beat 5 - Payoff & Short Sign-off (Scenes 11-12 | 00:50-00:58)**:
     `"Saat darurat, insting sering menipu, tapi sains bikin kamu selamat. Jadi... jangan panik dulu."`

2. Provide a **Phonetic-Optimized ElevenLabs Script Block** (e.g., spelling `LPG` as `el-piji`, `°C` as `derajat Selsius`, with clean line breaks per scene) alongside the **12-Scene 2D/3D Motion Storyboard Table**.

3. **STOP AT GATE 1**: Wait for the user to approve the script and provide/generate the ElevenLabs voiceover audio file.

### Stage 3: Voiceover Timing & Timestamp Extraction

1. When the voiceover audio (`.mp3`/`.wav`) is provided, run `ffprobe` and Python silence/energy detection to extract the exact total duration (`T_total`) and start/end timestamps (`t_start`, `t_end`, `duration`) for each of the 12 sentences.

### Stage 4: Programmatic 2D/3D Composition (HyperFrames / Remotion + Three.js + GSAP)

Consult `user:hyperframes`, `user:bang-motion`, and `user:impeccable` (plus any additional 3D/Remotion skills installed by the user) and enforce these best practices:

1. **Deterministic 2D/3D Timeline**:

   * Register a single paused master timeline (`window.__timelines["main"] = tl` in HyperFrames or `useCurrentFrame()` in Remotion).

   * Drive all Three.js camera transforms, 3D object rotations, `THREE.Plane` clipping planes (`renderer.localClippingEnabled = true`), and SVG vector animations deterministically from time `t`.

   * Always initialize `THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })` and call `renderer.render(scene, camera)` inside the timeline `onUpdate` hook so frame-by-frame capture never produces blank WebGL canvases.

   * Never use unseeded `Math.random()` or free-running `requestAnimationFrame`; use seeded PRNGs or trigonometric functions of `t` for particle systems (gas, fire, water, sparks).

2. **One Continuous World & Shot-Size Progression (`bang-motion`)**:

   * Move a virtual/3D camera across shot sizes (`Wide Establish 1.0x` $\rightarrow$ `Medium Focus 2.0x` $\rightarrow$ `Extreme Macro X-Ray Cutaway 5.0x`) rather than fading static slides.

3. **Semantic Color & Typography (`impeccable`)**:

   * **Obsidian Slate (`#0B0F17`)** for X-Ray/3D cutaway scenes; **Warm Alabaster (`#F6F5F0`)** for clean protocol scenes.

   * **Crimson Alert (`#EF233C`)** for `[X] REFLEK SALAH` / hazard vectors; **Sky-Cyan (`#00F5D4` / `#0EA5E9`)** for physics mechanics & `tabular-nums` data counters; **Emerald Safe (`#10B981`)** for `[1]`, `[2]`, `[3] LANGKAH TEPAT`.

   * Include synced **Lower-Third Subtitles** (4-5 words per chunk) and the `@janganpanikdulu` watermark inside the 9:16 safe zone.

### Stage 5: High-Bitrate Social Media MP4 Render

1. Render the composition frame-by-frame at `1080x1920` (`30fps` or `60fps`) and encode with `ffmpeg` (`libx264 -profile:v high -level:v 4.2 -pix_fmt yuv420p -crf 18 -maxrate 12M -bufsize 24M -c:a aac -b:a 192k -movflags +faststart`).

2. Present the final `.mp4` deliverable using `google:show_file`.