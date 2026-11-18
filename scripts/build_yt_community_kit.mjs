import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'YT_Community_Kit');
const RENDER_TMP = path.join(ROOT, '.render_tmp_yt_comm');

try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };
const PORT = 9289;
const SRV_PORT = 8792;

let chromeBin = 'chrome';
if (process.platform === 'win32') {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe')
  ];
  chromeBin = candidates.find(p => fs.existsSync(p)) || 'chrome';
} else if (process.platform === 'darwin') {
  chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>YouTube Community Kit — @janganpanikdulu</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<style>
  :root {
    --white: #FFFFFF;
    --indigo: #261A66;
    --cobalt: #1D265E;
    --orange: #EF5F18;
    --safe: #0FA968;
    --danger: #E11D48;
    --ink-muted: #494175;
    --tint-indigo: #F4F2FC;
    --tint-orange: #FFF4EE;
    --border-soft: #DCD7F4;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #141225;
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 0;
  }
  .board {
    width: 1080px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    background: var(--white);
    display: flex;
    flex-direction: column;
    padding: 52px;
  }

  /* Shared Top Brand Bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 36px;
    flex-shrink: 0;
  }
  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .brand-squircle {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    background: var(--orange);
    color: var(--white);
    font-family: "Space Grotesk", sans-serif;
    font-weight: 700;
    font-size: 24px;
    letter-spacing: -0.04em;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 5px 0 var(--indigo);
  }
  .brand-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .brand-name {
    font-size: 24px;
    font-weight: 800;
    color: var(--indigo);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .brand-handle {
    font-size: 18px;
    font-weight: 700;
    color: var(--ink-muted);
  }
  .tag-pill {
    background: var(--indigo);
    color: var(--white);
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 12px 24px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .tag-pill.orange {
    background: var(--orange);
    color: var(--white);
  }
  .tag-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--orange);
  }
  .tag-pill.orange .tag-dot {
    background: var(--white);
  }

  /* ================= POST 1: KUIS EP04 ================= */
  #post-1 {
    background: var(--tint-indigo);
    justify-content: space-between;
  }
  .p1-hero-card {
    background: var(--indigo);
    border-radius: 32px;
    padding: 36px 40px;
    color: var(--white);
    margin-bottom: 28px;
    position: relative;
  }
  .p1-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--orange);
    color: var(--white);
    font-size: 18px;
    font-weight: 800;
    padding: 7px 16px;
    border-radius: 10px;
    margin-bottom: 16px;
    letter-spacing: 0.02em;
  }
  .p1-title {
    font-size: 46px;
    font-weight: 800;
    line-height: 1.14;
    letter-spacing: -0.03em;
    color: var(--white);
  }
  .p1-title span {
    color: var(--orange);
  }
  .p1-body {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 24px;
    flex: 1;
    min-height: 0;
  }
  .p1-scene-wrap {
    position: relative;
    border-radius: 28px;
    overflow: hidden;
    border: 4px solid var(--indigo);
    background: #C49E78;
  }
  .p1-scene-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 58% 58%;
    transform: scale(1.12);
  }
  .p1-scene-badge {
    position: absolute;
    bottom: 18px;
    left: 18px;
    right: 18px;
    background: var(--white);
    border: 3px solid var(--indigo);
    border-radius: 16px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 800;
    color: var(--indigo);
  }
  .p1-scene-badge strong {
    color: var(--orange);
    font-family: "Space Grotesk", sans-serif;
  }
  .p1-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
    justify-content: space-between;
  }
  .p1-opt {
    background: var(--white);
    border: 3px solid var(--indigo);
    border-radius: 20px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 18px;
    box-shadow: 0 5px 0 var(--border-soft);
    flex: 1;
  }
  .p1-opt-letter {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--indigo);
    color: var(--white);
    font-family: "Space Grotesk", sans-serif;
    font-size: 24px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .p1-opt-text {
    font-size: 24px;
    font-weight: 800;
    color: var(--indigo);
    line-height: 1.25;
  }
  .p1-opt-sub {
    font-size: 17px;
    font-weight: 600;
    color: var(--ink-muted);
    margin-top: 3px;
  }
  .p1-footer {
    margin-top: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--white);
    border: 3px solid var(--indigo);
    border-radius: 20px;
    padding: 16px 26px;
  }
  .p1-footer-left {
    font-size: 21px;
    font-weight: 800;
    color: var(--indigo);
  }
  .p1-footer-cta {
    background: var(--orange);
    color: var(--white);
    font-size: 19px;
    font-weight: 800;
    padding: 10px 20px;
    border-radius: 12px;
  }

  /* ================= POST 2: CHEAT SHEET 4-IN-1 ================= */
  #post-2 {
    background: var(--white);
    justify-content: space-between;
  }
  .p2-header {
    margin-bottom: 28px;
  }
  .p2-title {
    font-size: 52px;
    font-weight: 800;
    color: var(--indigo);
    letter-spacing: -0.035em;
    line-height: 1.08;
    margin-bottom: 10px;
  }
  .p2-title span {
    background: var(--orange);
    color: var(--white);
    padding: 2px 14px 4px;
    border-radius: 14px;
    display: inline-block;
  }
  .p2-subtitle {
    font-size: 22px;
    font-weight: 600;
    color: var(--ink-muted);
  }
  .p2-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 22px;
    flex: 1;
    min-height: 0;
  }
  .p2-card {
    border: 3px solid var(--indigo);
    border-radius: 26px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--tint-indigo);
    box-shadow: 0 6px 0 var(--indigo);
  }
  .p2-img-box {
    height: 185px;
    position: relative;
    overflow: hidden;
    border-bottom: 3px solid var(--indigo);
    background: #E8EEF5;
  }
  .p2-img-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .p2-ep-badge {
    position: absolute;
    top: 14px;
    left: 14px;
    background: var(--indigo);
    color: var(--white);
    font-family: "Space Grotesk", sans-serif;
    font-size: 16px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
  }
  .p2-fact-pill {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: var(--orange);
    color: var(--white);
    font-family: "Space Grotesk", sans-serif;
    font-size: 16px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
    border: 2px solid var(--white);
  }
  .p2-card-body {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    background: var(--white);
  }
  .p2-situasi {
    font-size: 24px;
    font-weight: 800;
    color: var(--indigo);
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .p2-rule-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.25;
  }
  .p2-rule-row + .p2-rule-row {
    margin-top: 6px;
  }
  .p2-bad { color: var(--danger); }
  .p2-good { color: var(--safe); }
  .p2-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }
  .p2-foot {
    margin-top: 24px;
    background: var(--indigo);
    color: var(--white);
    border-radius: 20px;
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .p2-foot-quote {
    font-size: 22px;
    font-weight: 800;
  }
  .p2-foot-quote span {
    color: var(--orange);
  }
  .p2-foot-save {
    font-size: 18px;
    font-weight: 700;
    color: var(--white);
    background: var(--orange);
    padding: 8px 18px;
    border-radius: 999px;
  }

  /* ================= POST 3: POLLING EP05 ================= */
  #post-3 {
    background: var(--indigo);
    color: var(--white);
    justify-content: space-between;
  }
  #post-3 .brand-name { color: var(--white); }
  #post-3 .brand-handle { color: #DBD6F8; }
  #post-3 .brand-squircle { box-shadow: 0 5px 0 #130C3A; }
  .p3-hero {
    display: flex;
    align-items: center;
    gap: 28px;
    margin-bottom: 28px;
  }
  .p3-avatar {
    width: 156px;
    height: 156px;
    border-radius: 32px;
    border: 5px solid var(--orange);
    object-fit: cover;
    flex-shrink: 0;
    background: var(--white);
  }
  .p3-title {
    font-size: 48px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: var(--white);
    margin-bottom: 10px;
  }
  .p3-title span {
    color: var(--orange);
  }
  .p3-sub {
    font-size: 21px;
    font-weight: 600;
    color: #DBD6F8;
    line-height: 1.35;
  }
  .p3-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
  }
  .p3-item {
    background: var(--white);
    border-radius: 24px;
    padding: 20px 26px;
    display: flex;
    align-items: center;
    gap: 22px;
    box-shadow: 0 6px 0 #150E42;
    flex: 1;
  }
  .p3-num {
    width: 58px;
    height: 58px;
    border-radius: 16px;
    background: var(--orange);
    color: var(--white);
    font-family: "Space Grotesk", sans-serif;
    font-size: 26px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .p3-item-content {
    flex: 1;
  }
  .p3-item-title {
    font-size: 27px;
    font-weight: 800;
    color: var(--indigo);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .p3-item-desc {
    font-size: 19px;
    font-weight: 600;
    color: var(--ink-muted);
  }
  .p3-item-pill {
    background: var(--tint-indigo);
    color: var(--indigo);
    border: 2px solid var(--border-soft);
    font-family: "Space Grotesk", sans-serif;
    font-size: 17px;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .p3-foot {
    margin-top: 24px;
    background: #1B124D;
    border: 2px solid #3F2FA3;
    border-radius: 20px;
    padding: 16px 26px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .p3-foot-text {
    font-size: 21px;
    font-weight: 700;
    color: var(--white);
  }
  .p3-foot-badge {
    background: var(--orange);
    color: var(--white);
    font-size: 18px;
    font-weight: 800;
    padding: 10px 20px;
    border-radius: 12px;
  }
</style>
</head>
<body>

<!-- POST 1: KUIS EP04 -->
<section id="post-1" class="board">
  <header class="topbar">
    <div class="brand-lockup">
      <div class="brand-squircle">jpd</div>
      <div class="brand-text">
        <div class="brand-name">Jangan Panik Dulu</div>
        <div class="brand-handle">@janganpanikdulu</div>
      </div>
    </div>
    <div class="tag-pill"><span class="tag-dot"></span>Kuis P3K · Episode 04</div>
  </header>

  <div class="p1-hero-card">
    <div class="p1-eyebrow">SITUASI DARURAT</div>
    <h1 class="p1-title">Kaki baru digigit ular di kebun.<br><span>Apa langkah PERTAMA yang aman?</span></h1>
  </div>

  <div class="p1-body">
    <div class="p1-scene-wrap">
      <img class="p1-scene-img" src="/previews_ep04/ep04_s01_hook.png" alt="Simulasi 3D Mas Raka dan ular di kebun">
      <div class="p1-scene-badge">
        <span>Fokus utama:</span>
        <strong>5 Menit Pertama</strong>
      </div>
    </div>

    <div class="p1-options">
      <div class="p1-opt">
        <div class="p1-opt-letter">A</div>
        <div>
          <div class="p1-opt-text">Ikat kencang di atas luka</div>
          <div class="p1-opt-sub">Supaya racun tertahan di kaki</div>
        </div>
      </div>
      <div class="p1-opt">
        <div class="p1-opt-letter">B</div>
        <div>
          <div class="p1-opt-text">Sayat luka lalu sedot racunnya</div>
          <div class="p1-opt-sub">Keluarin bisa sebelum menyebar</div>
        </div>
      </div>
      <div class="p1-opt">
        <div class="p1-opt-letter">C</div>
        <div>
          <div class="p1-opt-text">Diamkan kaki &amp; pasang bidai</div>
          <div class="p1-opt-sub">Kunci sendi lurus, lalu ke IGD</div>
        </div>
      </div>
      <div class="p1-opt">
        <div class="p1-opt-letter">D</div>
        <div>
          <div class="p1-opt-text">Jalan cepat cari air mengalir</div>
          <div class="p1-opt-sub">Bilas bekas gigitan sambil lari</div>
        </div>
      </div>
    </div>
  </div>

  <footer class="p1-footer">
    <div class="p1-footer-left">Pilih jawabanmu di polling atas sebelum cek Shorts EP04!</div>
    <div class="p1-footer-cta">Jangan Panik Dulu</div>
  </footer>
</section>

<!-- POST 2: CHEAT SHEET 4-IN-1 -->
<section id="post-2" class="board">
  <header class="topbar">
    <div class="brand-lockup">
      <div class="brand-squircle">jpd</div>
      <div class="brand-text">
        <div class="brand-name">Jangan Panik Dulu</div>
        <div class="brand-handle">@janganpanikdulu</div>
      </div>
    </div>
    <div class="tag-pill orange"><span class="tag-dot"></span>Cheat Sheet EP01–EP04</div>
  </header>

  <div class="p2-header">
    <h1 class="p2-title">4 Refleks Panik yang Bikin <span>Makin Fatal</span></h1>
    <p class="p2-subtitle">Simpan catatan singkat ini — insting pertama saat darurat sering menipu.</p>
  </div>

  <div class="p2-grid">
    <!-- EP01 -->
    <article class="p2-card">
      <div class="p2-img-box">
        <img src="/previews_v2/v2_s01_hook.png" style="object-position: 52% 48%; transform: scale(1.06);" alt="Simulasi 3D dapur bau gas LPG">
        <span class="p2-ep-badge">EP01 · DAPUR</span>
        <span class="p2-fact-pill">Percikan 1.000°C</span>
      </div>
      <div class="p2-card-body">
        <div class="p2-situasi">Dapur Bau Gas Bocor</div>
        <div>
          <div class="p2-rule-row p2-bad">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span>Jangan sentuh saklar lampu</span>
          </div>
          <div class="p2-rule-row p2-good">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span>Cabut regulator, buka pintu</span>
          </div>
        </div>
      </div>
    </article>

    <!-- EP02 -->
    <article class="p2-card">
      <div class="p2-img-box">
        <img src="/previews_v2/ep02_s01_hook.png" style="object-position: 50% 44%; transform: scale(1.05);" alt="Simulasi 3D wajan terbakar di kompor">
        <span class="p2-ep-badge">EP02 · KOMPOR</span>
        <span class="p2-fact-pill">Uap 1.700× Lipat</span>
      </div>
      <div class="p2-card-body">
        <div class="p2-situasi">Wajan Minyak Terbakar</div>
        <div>
          <div class="p2-rule-row p2-bad">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span>Jangan disiram pakai air</span>
          </div>
          <div class="p2-rule-row p2-good">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span>Matikan kompor, tutup panci</span>
          </div>
        </div>
      </div>
    </article>

    <!-- EP03 -->
    <article class="p2-card">
      <div class="p2-img-box">
        <img src="/previews_ep03/ep03_s01_hook.png" style="object-position: 52% 48%; transform: scale(1.02);" alt="Simulasi 3D motor matic di turunan">
        <span class="p2-ep-badge">EP03 · JALAN</span>
        <span class="p2-fact-pill">Vapor Lock 300°C</span>
      </div>
      <div class="p2-card-body">
        <div class="p2-situasi">Rem Matic Blong Turunan</div>
        <div>
          <div class="p2-rule-row p2-bad">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span>Jangan matikan kontak mesin</span>
          </div>
          <div class="p2-rule-row p2-good">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span>Biarkan ON agar CVT menahan</span>
          </div>
        </div>
      </div>
    </article>

    <!-- EP04 -->
    <article class="p2-card">
      <div class="p2-img-box">
        <img src="/previews_ep04/ep04_s01a_strike.png" style="object-position: 52% 52%; transform: scale(1.02);" alt="Simulasi 3D gigitan ular">
        <span class="p2-ep-badge">EP04 · MEDIS</span>
        <span class="p2-fact-pill">0 Pompa Jantung</span>
      </div>
      <div class="p2-card-body">
        <div class="p2-situasi">Digigit Ular Berbisa</div>
        <div>
          <div class="p2-rule-row p2-bad">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span>Jangan diikat kencang / disedot</span>
          </div>
          <div class="p2-rule-row p2-good">
            <svg class="p2-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span>Pasang bidai, langsung ke IGD</span>
          </div>
        </div>
      </div>
    </article>
  </div>

  <footer class="p2-foot">
    <div class="p2-foot-quote">"Jadi... <span>jangan panik dulu.</span>"</div>
    <div class="p2-foot-save">Tonton Penuh di Tab Shorts</div>
  </footer>
</section>

<!-- POST 3: POLLING EP05 -->
<section id="post-3" class="board">
  <header class="topbar">
    <div class="brand-lockup">
      <div class="brand-squircle">jpd</div>
      <div class="brand-text">
        <div class="brand-name">Jangan Panik Dulu</div>
        <div class="brand-handle">@janganpanikdulu</div>
      </div>
    </div>
    <div class="tag-pill orange"><span class="tag-dot"></span>Vote Topik EP05</div>
  </header>

  <div class="p3-hero">
    <img class="p3-avatar" src="/pp_janganpanikdulu_final.png" alt="Maskot Mas Raka">
    <div>
      <h1 class="p3-title">Episode 05 bahas <span>yang mana dulu?</span></h1>
      <p class="p3-sub">Vote di polling YouTube. Topik suara terbanyak langsung masuk antrean produksi animasi 3D minggu ini.</p>
    </div>
  </div>

  <div class="p3-list">
    <div class="p3-item">
      <div class="p3-num">01</div>
      <div class="p3-item-content">
        <div class="p3-item-title">Tersedak Saat Sendirian di Kosan</div>
        <div class="p3-item-desc">Kenapa minum air bikin makin bahaya + trik sandaran kursi</div>
      </div>
      <div class="p3-item-pill">PILAR A</div>
    </div>

    <div class="p3-item">
      <div class="p3-num">02</div>
      <div class="p3-item-content">
        <div class="p3-item-title">Kecipratan Minyak Panas Dioles Odol</div>
        <div class="p3-item-desc">Mekanisme panas terperangkap di kulit vs air mengalir 20 menit</div>
      </div>
      <div class="p3-item-pill">MITOS P3K</div>
    </div>

    <div class="p3-item">
      <div class="p3-num">03</div>
      <div class="p3-item-content">
        <div class="p3-item-title">Menolong Teman Kesetrum 220V</div>
        <div class="p3-item-desc">Efek kontraksi otot 50 Hz yang bikin tangan mengunci sumber listrik</div>
      </div>
      <div class="p3-item-pill">DARURAT</div>
    </div>

    <div class="p3-item">
      <div class="p3-num">04</div>
      <div class="p3-item-content">
        <div class="p3-item-title">Mencampur Pemutih &amp; Pembersih WC</div>
        <div class="p3-item-desc">Reaksi kimia kamar mandi tertutup yang menghasilkan gas klorin</div>
      </div>
      <div class="p3-item-pill">SAINS RUMAH</div>
    </div>
  </div>

  <footer class="p3-foot">
    <div class="p3-foot-text">Punya kasus darurat lain? Tulis idemu di komentar.</div>
    <div class="p3-foot-badge">Vote di Atas</div>
  </footer>
</section>

</body>
</html>`;

function startServer(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/__yt_community.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(HTML);
      }
      const fp = path.join(ROOT, urlPath);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404);
        return res.end('Not found');
      }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForCDP(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Timeout menunggu Chrome CDP.');
}

(async () => {
  const srv = await startServer(SRV_PORT);
  const chrome = spawn(chromeBin, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1080,3240',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    `http://127.0.0.1:${SRV_PORT}/__yt_community.html`
  ], { stdio: 'ignore', env: CHILD_ENV });

  let ws;
  try {
    const wsUrl = await waitForCDP(PORT);
    ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r));

    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    });
    const send = (method, params = {}) => new Promise(resolve => {
      const cur = ++id;
      pending.set(cur, resolve);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1080, height: 3240, deviceScaleFactor: 1, mobile: false
    });

    for (let i = 0; i < 40; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `(() => {
          const imgs = Array.from(document.images);
          return document.fonts.status === 'loaded' && imgs.every(img => img.complete && img.naturalWidth > 0);
        })()`,
        returnByValue: true
      });
      if (r?.result?.result?.value) break;
      await sleep(250);
    }
    await sleep(300);

    const targets = [
      { id: 'post-1', file: '01_Post_Kuis_EP04_Digigit_Ular.png' },
      { id: 'post-2', file: '02_Post_CheatSheet_EP01_EP04.png' },
      { id: 'post-3', file: '03_Post_Polling_EP05.png' }
    ];

    for (const t of targets) {
      const rectRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const r = document.getElementById('${t.id}').getBoundingClientRect();
          return { x: r.left, y: r.top + window.scrollY, width: r.width, height: r.height };
        })()`,
        returnByValue: true
      });
      const clip = rectRes.result.result.value;
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 }
      });
      fs.writeFileSync(path.join(OUT_DIR, t.file), Buffer.from(shot.result.data, 'base64'));
      console.log(`Saved ${t.file}`);
    }
  } finally {
    try { ws?.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { srv.close(); } catch {}
    try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
  }
})();
