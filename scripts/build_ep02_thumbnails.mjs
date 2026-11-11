import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'previews_v2');
const VAULT_DIR = path.join(ROOT, 'vault', 'assets');
const PUBLISH_DIR = path.join(ROOT, 'Publish_Kit_EP02');

const RENDER_TMP = path.join(ROOT, '.render_tmp_thumb_ep02');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9258;
const SRV_PORT = 8775;
const USER_DATA = path.join(RENDER_TMP, 'chrome_thumb_ep02');

let chromeBin = 'google-chrome';
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
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

function ensureLocalServer(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? '/index.html' : urlPath;
      const fp = path.join(ROOT, rel);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    srv.on('error', () => resolve(null));
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = await ensureLocalServer(SRV_PORT);
  const chromeArgs = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--ignore-certificate-errors',
    '--proxy-bypass-list=<-loopback>',
    '--window-size=1080,1920',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--mute-audio',
    `http://127.0.0.1:${SRV_PORT}/index.html?clean=1`
  ];

  const chrome = spawn(chromeBin, chromeArgs, { stdio: 'ignore', env: CHILD_ENV });
  let targets = null;
  for (let i = 0; i < 30; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length) break;
    } catch {}
    await sleep(250);
  }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
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
  await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false
  });

  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'Boolean(window.OPENER && window.OPENER.ready)',
      returnByValue: true
    });
    if (r?.result?.result?.value) break;
    await sleep(200);
  }
  await sleep(150);

  await send('Runtime.evaluate', {
    expression: `(() => {
      window.THUMB_LOCK = true;
      window.OPENER.tl.pause();

      const st = document.createElement('style');
      st.textContent = \`
        #hook-card, #step-tracker, #sub-wrap, #call1, #call2, #call3, #callout-svg, .callout-svg, #OverlaySVG {
          display: none !important;
        }
        #thumb-overlay {
          position: absolute;
          inset: 0;
          z-index: 90;
          pointer-events: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .th-header-wrap {
          position: absolute;
          top: 250px;
          left: 48px;
          right: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 14px;
        }
        .th-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #EF5F18;
          color: #FFFFFF;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 10px 30px;
          border-radius: 999px;
          border: 2.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 12px 28px rgba(239, 95, 24, 0.42);
          text-transform: uppercase;
        }
        .th-kicker.indigo {
          background: #261A66;
          box-shadow: 0 12px 28px rgba(38, 26, 102, 0.38);
        }
        .th-title-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(24px) saturate(170%);
          border: 3px solid #FFFFFF;
          border-radius: 32px;
          padding: 22px 42px;
          box-shadow: 0 24px 52px rgba(20, 14, 56, 0.22);
        }
        .th-main {
          font-size: 66px;
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -0.035em;
          color: #261A66;
          text-transform: uppercase;
        }
        .th-main .hl-badge {
          display: inline-block;
          background: #EF5F18;
          color: #FFFFFF;
          padding: 2px 20px 6px;
          border-radius: 16px;
          margin-top: 6px;
        }
        .th-prop-badge {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 22px;
          border-radius: 18px;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.015em;
          box-shadow: 0 14px 30px rgba(15, 20, 32, 0.28);
        }
        .th-prop-badge.danger {
          background: #EF5F18;
          color: #FFFFFF;
          border: 2.5px solid #FFFFFF;
        }
        .th-prop-badge.dark {
          background: rgba(38, 26, 102, 0.94);
          color: #FFFFFF;
          border: 2.5px solid rgba(255, 255, 255, 0.85);
        }
        .th-prop-badge.safe {
          background: #0FA968;
          color: #FFFFFF;
          border: 2.5px solid #FFFFFF;
        }
        .th-bottom-pill {
          position: absolute;
          bottom: 380px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          background: rgba(38, 26, 102, 0.94);
          backdrop-filter: blur(20px);
          border: 2.5px solid rgba(255, 255, 255, 0.85);
          color: #FFFFFF;
          font-size: 30px;
          font-weight: 800;
          padding: 15px 36px;
          border-radius: 999px;
          box-shadow: 0 18px 40px rgba(15, 20, 32, 0.35);
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .th-bottom-pill .accent {
          color: #FFB703;
        }
        .th-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #EF5F18;
          box-shadow: 0 0 12px #EF5F18;
        }
      \`;
      document.head.appendChild(st);

      const ov = document.createElement('div');
      ov.id = 'thumb-overlay';
      document.getElementById('hud').appendChild(ov);
    })()`,
    returnByValue: true
  });

  const THUMBS = [
    {
      out: 'thumb_ep02_opsi_1.png',
      pub: '03_Thumbnail_Opsi_1_Jangan_Siram_Air.png',
      setup: `(() => {
        window.OPENER.seek(6.2);
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">⚠️ WAJAN TERBAKAR DI KOMPOR?</div>
            <div class="th-title-card">
              <div class="th-main">JANGAN SIRAM<br><span class="hl-badge">PAKAI AIR!</span></div>
            </div>
          </div>
          <div class="th-prop-badge danger" style="top: 635px; right: 44px; transform: rotate(2deg);">
            🔥 Api Menyembur ke Dapur!
          </div>
          <div class="th-prop-badge dark" style="top: 1185px; right: 54px; transform: rotate(-1.5deg);">
            💧 Air Tenggelam di Minyak 300°C
          </div>
          <div class="th-bottom-pill">
            <span class="th-dot"></span>Segayung Air Bikin <span class="accent">Api Meledak 1.700×</span>
          </div>
        \`;
      })()`
    },
    {
      out: 'thumb_ep02_opsi_2.png',
      pub: '04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png',
      setup: `(() => {
        window.OPENER.seek(31.6);
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker indigo">🔬 FISIKA DI DALAM WAJAN</div>
            <div class="th-title-card">
              <div class="th-main">UAP MENGEMBANG<br><span class="hl-badge">1.700× LIPAT!</span></div>
            </div>
          </div>
          <div class="th-prop-badge danger" style="top: 635px; right: 42px; transform: rotate(1.5deg);">
            🌡️ Suhu Minyak 300°C
          </div>
          <div class="th-bottom-pill">
            <span class="th-dot"></span>Kenapa <span class="accent">Air + Minyak Panas</span> Langsung Meledak?
          </div>
        \`;
      })()`
    },
    {
      out: 'thumb_ep02_opsi_3.png',
      pub: '05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png',
      setup: `(() => {
        window.OPENER.seek(43.2);
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">✅ 3 LANGKAH SELAMAT</div>
            <div class="th-title-card">
              <div class="th-main">MATIKAN KNOP &<br><span class="hl-badge">TUTUP RAPAT!</span></div>
            </div>
          </div>
          <div class="th-prop-badge danger" style="top: 645px; right: 44px; transform: rotate(2deg);">
            🚫 Jangan Siram Air & Angkat
          </div>
          <div class="th-prop-badge safe" style="top: 1185px; right: 54px; transform: rotate(-1.5deg);">
            🛡️ Tutup Pakai Tutup Panci
          </div>
          <div class="th-bottom-pill">
            <span class="th-dot"></span>Cara Memadamkan <span class="accent">Wajan Kebakaran</span> Tanpa Panik
          </div>
        \`;
      })()`
    }
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.mkdirSync(PUBLISH_DIR, { recursive: true });

  for (const th of THUMBS) {
    await send('Runtime.evaluate', {
      expression: th.setup,
      returnByValue: true
    });
    await sleep(40);
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(snap.result.data, 'base64');
    fs.writeFileSync(path.join(OUT_DIR, th.out), buf);
    fs.writeFileSync(path.join(VAULT_DIR, th.out), buf);
    fs.writeFileSync(path.join(PUBLISH_DIR, th.pub), buf);
    console.log('Generated EP02 thumbnail:', th.out);
  }

  try { ws.close(); } catch {}
  chrome.kill();
  if (srv) srv.close();
  await sleep(300);
  try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}

  const captionTxt = `====================================================================
@janganpanikdulu — EPISODE 02 (PUBLISH KIT)
Topik : Wajan Kebakaran di Kompor? Jangan Siram Pakai Air!
Format: 1080x1920 (9:16 Vertical — TikTok / IG Reels / FB Reels / Shorts)
====================================================================

[OPSI HOOK / JUDul COVER]
1. Wajan Kebakaran? Jangan Siram Pakai Air!
2. Segayung Air Bikin Api Wajan Meledak 1.700x Lipat
3. 3 Langkah Memadamkan Wajan Terbakar Tanpa Panik

--------------------------------------------------------------------
[CAPTION INSTAGRAM REELS / FACEBOOK REELS / TIKTOK]
--------------------------------------------------------------------
Kenapa saat wajan kebakaran di kompor, kamu nggak boleh menyiramnya pakai air? 🔥💧

Saat minyak goreng terlalu panas sampai menyala sendiri, suhunya sudah mencapai sekitar 300 derajat Celsius.

Kalau disiram air:
1. Air lebih berat daripada minyak dan tidak bisa menyatu, sehingga air langsung tenggelam ke dasar wajan yang sangat panas.
2. Dalam sekejap, air mendidih jadi uap dan mengembang 1.700 kali lipat.
3. Ledakan uap dari dasar wajan ini langsung melontarkan minyak menyala ke seluruh dapur.

Kalau wajan di kompor terbakar, lakukan 3 langkah ini:
✅ 1. Jangan siram air dan jangan angkat wajan yang sedang terbakar.
✅ 2. Matikan kompor dari knopnya untuk memutus sumber panas.
✅ 3. Tutup rapat wajan dengan tutup panci atau kain basah yang sudah diperas supaya apinya kehabisan oksigen.

Simpan dan bagikan ke grup keluarga supaya semua orang di rumah tahu langkah amannya. Jadi... jangan panik dulu.

#janganpanikdulu #edukasikeselamatan #tipsdapur #kebakarandapur #keselamatankeluarga #pertolonganpertama #faktasains #edukasiindonesia
`;
  fs.writeFileSync(path.join(PUBLISH_DIR, '02_Caption_Sosmed_Dan_Hashtag.txt'), captionTxt, 'utf8');
  console.log('Saved Publish_Kit_EP02 social captions.');
  process.exit(0);
})();
