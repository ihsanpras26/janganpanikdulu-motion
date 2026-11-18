---
name: jangan-panik-dulu
description: End-to-end automated Code-to-Video (3D Mas Raka Diorama + Seamless Clean UI Overlay) production engine for @janganpanikdulu. Enforces the @puckermanefacts × @hasyaaap (DfYvoiyyfcH) visual-first micro-sentence scriptwriting DNA, Mas Raka mascot consistency, and Solid White × Deep Indigo (#261A66) × Signal Orange (#EF5F18) brand system.
---

# Jangan Panik Dulu — Code-to-Video & Scriptwriting Engine

Automate the end-to-end production of `@janganpanikdulu` short-form vertical videos (`1080x1920`, `9:16`).

## 1. Core Brand & Visual DNA (Locked Constants)

* **Account Handle**: `@janganpanikdulu`
* **Mandatory Closing Catchphrase**: `"Jadi... jangan panik dulu."`
* **Persona & Mascot**: **Mas Raka** (*"mas-mas simpel tapi bisa diandalkan"* — Terracotta overshirt with rolled sleeves, white inner tee, black wristwatch, navy chinos, and 360° Sculpted Side-Part Quiff hair).
* **Brand Color Palette (Locked Option 2 — 100% Solid UI Surfaces)**:
  * **Crisp White (`#FFFFFF`)**, **Deep Royal Indigo (`#261A66`)**, and **Signal Orange (`#EF5F18`)**.
  * Zero gradients on pills, cards, badges, or text; progressive blur & gradient scrims (`.scrim-top`, `.scrim-bottom`) are used strictly for background contrast behind overlays.
* **UI Overlay Philosophy (`@puckermanefacts` Seamless Clean UI)**:
  * Default overlay uses the compact floating Step Pill (`#step-tracker`) + segmented progress bars at the top, clean 3D leader-line callouts in the center, and a solid subtitle bar at the bottom.
  * The **Bento Fact Card (`#bento-card`)** is **contextual/optional**—shown only on beats that highlight a key scientific metric (e.g., `1.000°C` or `2× Lebih Berat`), never forced on every beat.

---

## 2. Scriptwriting DNA (`@puckermanefacts` × `@hasyaaap` `DfYvoiyyfcH` + `antislop-copywriting`)

Every script MUST combine the structural clarity of **`@puckermanefacts`** with the punchy, conversational diction and micro-analogies of **`@hasyaaap` (`DfYvoiyyfcH`)**:

1. **Hook Pertanyaan/Tuduhan + Jawaban Pendek Menohok + Skenario Mikro (`DfYvoiyyfcH`)**:
   * Open with a direct question or prohibition, answer it in a punchy 4–6 word phrase, and drop a relatable micro-scenario with tactile sound/action (*"Misalnya bangun subuh, dapur gelap, kecium bau gas, tangan refleks nyari saklar... cetek."*).
2. **Sains Berat Pakai Bahasa Tongkrongan & Kata Kerja Fisik (`DfYvoiyyfcH`)**:
   * State the exact physical numbers (`1.000 derajat`, `2 kali lebih berat`), then immediately explain the mechanism using tangible everyday verbs (*"tembaganya beradu"*, *"nyipratin bunga api"*, *"ngumpul di lantai"*, *"nyusup ke celah saklar"*).
   * Pair technical facts with a quick human analogy or contrast so the viewer never feels like they are listening to a textbook.
3. **Structured Numbered Steps (`@puckermanefacts`)**:
   * Deliver actionable survival steps using clean numbered signposts (`Pertama`, `Kedua`, `Ketiga`) with short 5–9 word sentences that sync 1:1 with the top UI Step Pill.
4. **Contrast Payoff + Mandatory Sign-off**:
   * Close with the signature contrast summary (*"Jadi yang bikin [fatal] itu bukan [A], tapi [B]."*), followed by `"Jadi... jangan panik dulu."`

---

## 3. Pre-Production Fact & Retention Gates (`yt-script` × `youtube-retention` × `youtube-shorts`)

Run these gates **before** generating ElevenLabs VO or 3D animations:

1. **No Fabricated Numbers Gate ("Jangan Mengarang Angka")**:
   * Every physical, mechanical, or medical number (`1.000°C`, `2× lebih berat`, rasio kompresi, waktu reaksi) MUST be verified against a real reference before locking the script or metadata.
   * If a specific number cannot be verified (e.g., exact residual cylinder volume in mL), **remove the fabricated number** and explain the mechanism qualitatively instead.
2. **Hook 4-Point Human Checklist** *(replaces English-tuned `hookscore.py`)*:
   * **Title-Hook Alignment**: First 3 seconds immediately fulfill or escalate the title's promise.
   * **Zero Warm-up**: Opens directly on conflict, reflex mistake, or risk—no greetings or filler.
   * **Open Loop**: Leaves an active question (*"kok bisa?"*, *"apa yang hancur?"*) that pulls the viewer into Beat 2.
   * **Natural ID Voice**: Keeps `@hasyaaap` conversational tone (*"Kamu"*, tactile verbs); never force Indonesian copy into English hook templates.
3. **Shorts Pacing & Retention Benchmarks**:
   * **Retention Targets**: `≥ 70%` viewed/retained = healthy; `< 50%` = structural retention issue that must be diagnosed before scaling.
   * **Dead-Zone Prevention**: For 60–98s episodes, ensure a clear visual shift, 3D cutaway, or tension escalation every ~8–12s so retention does not sag in the middle.

---

## 4. Packaging Rules (`yt-package` + Feed-Size Legibility)

Treat the **YouTube Title** and the **Thumbnail / Frame-0 Hook Card** as a single click surface:

1. **Zero Content-Word Overlap**: The thumbnail/hook card text MUST NOT repeat content words already in the title (e.g., if the title says *"Jangan Pencet Starter"*, the card shows the consequence or visual contrast—not *"JANGAN PENCET STARTER!"*).
2. **Title Length & Cleanliness**:
   * Target **`≤ 40` characters** (safe from mobile feed truncation); hard maximum **`60` characters**.
   * **Never** put `#Shorts` in the title—it wastes character budget.
3. **Specificity & Click Triggers (Jake Thomas)**:
   * Include a concrete number or specific consequence where truthful, pairing **Curiosity** with **Fear/Risk** or **Practical Survival**.
4. **Feed-Size Card Readability**:
   * Keep thumbnail/hook card text to **`≤ 4` words** (`≤ 32` characters) and verify legibility at small mobile feed size on the generated contact sheet (`thumb_epXX_3_opsi_sheet.jpg`).
5. **Automated Check**: Run `node scripts/lint_packaging.mjs --title "<judul>" --card "<teks kartu>"` before finalizing any `Publish_Kit_EPXX` metadata.

---

## 5. Periodic Channel Audit SOP (`yt-audit` — Every 4–5 Episodes)

Run this audit using **live YouTube Studio data** (never guess metrics):

1. **Median Baseline** *(never use mean/average)*:
   * **Outlier**: `≥ 3×` channel median views
   * **Miss**: `≤ 0.5×` channel median views
   * **Unlist / Re-evaluate threshold**: `≤ 0.3×` channel median views
2. **Fixed Audit Sequence**:
   * **Titles as a set** (truncation, overlap, specificity, variety) $\rightarrow$ **Thumbnails at feed size** (legibility, contrast, non-duplication) $\rightarrow$ **First 15 seconds** (retention curve drop-off).
3. **Single-Fix Rule**: Conclude every audit with **ONE** highest-leverage improvement for the next batch—never 20 scattered changes.
