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

const RENDER_TMP = path.join(ROOT, '.render_tmp_thumb');
fs.rmSync(RENDER_TMP, { recursive: true, force: true });
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9248;
const USER_DATA = path.join(RENDER_TMP, 'chrome_thumb');

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

function ensureLocalServer(port = 8765) {
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
  await ensureLocalServer(8765);
  const chromeArgs = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--headless=new',
    '--no-sandbox',
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
    'http://127.0.0.1:8765/index.html?clean=1'
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

  // Inject Thumbnail Cover Overlay CSS (Safe for 4:5 Profile Grid + 9:16 Reels/TikTok)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const st = document.createElement('style');
      st.textContent = \`
        #hook-card, #step-tracker, #sub-wrap {
          display: none !important;
        }
        #thumb-overlay {
          position: absolute;
          inset: 0;
          z-index: 90;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 340px 52px 380px;
        }
        .th-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
        }
        .th-kicker {
          background: #EF5F18;
          color: #FFFFFF;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 10px 28px;
          border-radius: 999px;
          box-shadow: 0 12px 28px rgba(239, 95, 24, 0.38);
          text-transform: uppercase;
        }
        .th-title-card {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(22px) saturate(160%);
          border: 2.5px solid rgba(255, 255, 255, 0.96);
          border-radius: 28px;
          padding: 20px 38px;
          box-shadow: 0 22px 48px rgba(20, 14, 56, 0.20);
        }
        .th-title-card.dark {
          background: rgba(24, 18, 62, 0.86);
          border-color: rgba(255, 255, 255, 0.24);
        }
        .th-main {
          font-size: 62px;
          font-weight: 800;
          line-height: 1.06;
          letter-spacing: -0.03em;
          color: #261A66;
          text-transform: uppercase;
        }
        .th-title-card.dark .th-main {
          color: #FFFFFF;
        }
        .th-main span {
          color: #EF5F18;
        }
        .th-title-card.dark .th-main span {
          color: #FF742E;
        }
        .th-bottom-pill {
          background: rgba(38, 26, 102, 0.92);
          backdrop-filter: blur(18px);
          border: 2px solid rgba(255, 255, 255, 0.30);
          color: #FFFFFF;
          font-size: 30px;
          font-weight: 800;
          padding: 14px 32px;
          border-radius: 999px;
          box-shadow: 0 16px 36px rgba(15, 20, 32, 0.28);
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 12px;
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
      out: 'thumb_ep01_opsi_1.png',
      setup: `(() => {
        const S = window.OPENER.S;
        window.OPENER.tl.pause();
        // Opsi 1: 3/4 Isometric Action — Mas Raka + Gas Melon + Sparking 1.000°C Switch (Full Uncropped!)
        S.camX = 8.8; S.camY = 9.4; S.camZ = 11.8;
        S.lookX = 0.32; S.lookY = 1.68; S.lookZ = -1.05;
        S.fov = 25;
        S.cX = -0.12; S.cZ = -0.72; S.cKneel = 0; S.cRotY = 0.48; S.cArmL = -1.52; S.cArmR = -0.30;
        S.cutawayAlpha = 0.85; S.copperClose = 1; S.sparkScale = 1.35;
        S.ringScale = 1.45; S.ringAlpha = 0.95;
        S.gasOpacity = 0.84; S.gasRise = 0.85; S.gasFlushX = 0; S.darkMode = 0.06;
        S.winOpen = 0; S.doorOpen = 0; S.airOpacity = 0; S.regLift = 0;
        S.c1Alpha = 0; S.c2Alpha = 0; S.c3Alpha = 0;
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-top">
            <div class="th-kicker">BAU GAS BOCOR?</div>
            <div class="th-title-card">
              <div class="th-main">JANGAN SENTUH<br><span>SAKLAR LAMPU!</span></div>
            </div>
          </div>
          <div class="th-bottom-pill"><span class="th-dot"></span>Percikan 1.000°C di Dalam Saklar</div>
        \`;
        window.OPENER.render(32.55);
      })()`
    },
    {
      out: 'thumb_ep01_opsi_2.png',
      setup: `(() => {
        const S = window.OPENER.S;
        window.OPENER.tl.pause();
        // Opsi 2: Dramatic Dark Kitchen Isometric — Raka Reaching for Sparking Switch (Zero Head Overlap!)
        S.camX = 7.4; S.camY = 10.8; S.camZ = 13.6;
        S.lookX = 0.42; S.lookY = 1.78; S.lookZ = -1.15;
        S.fov = 25;
        S.darkMode = 0.78; S.gasOpacity = 0.86; S.gasRise = 0.70; S.gasFlushX = 0;
        S.cX = 0.78; S.cZ = -1.48; S.cKneel = 0; S.cRotY = 0.52; S.cArmR = -1.58; S.cArmL = -0.35;
        S.cutawayAlpha = 0; S.sparkScale = 1.32; S.ringScale = 1.55; S.ringAlpha = 0.95;
        S.winOpen = 0; S.doorOpen = 0; S.airOpacity = 0; S.regLift = 0;
        S.c1Alpha = 0; S.c2Alpha = 0; S.c3Alpha = 0;
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-top">
            <div class="th-kicker">1 KLIK = MELEDAK?</div>
            <div class="th-title-card dark">
              <div class="th-main">BAHAYA <span>SAKLAR</span><br>SAAT BAU GAS</div>
            </div>
          </div>
          <div class="th-bottom-pill"><span class="th-dot"></span>3 Langkah Selamatkan Dapurmu</div>
        \`;
        window.OPENER.render(11.28);
      })()`
    },
    {
      out: 'thumb_ep01_opsi_3.png',
      setup: `(() => {
        const S = window.OPENER.S;
        window.OPENER.tl.pause();
        // Opsi 3: Clean @puckermanefacts Full Isometric Diorama Cover
        S.camX = 13.6; S.camY = 15.0; S.camZ = 18.2;
        S.lookX = -0.15; S.lookY = 1.62; S.lookZ = -0.20;
        S.fov = 27;
        S.darkMode = 0; S.gasOpacity = 0.78; S.gasRise = 0.35; S.gasFlushX = 0;
        S.cutawayAlpha = 0; S.sparkScale = 1.18; S.ringScale = 1.48; S.ringAlpha = 0.92;
        S.cX = -0.05; S.cZ = -0.25; S.cKneel = 0; S.cRotY = 0.40; S.cArmL = -1.48; S.cArmR = -0.25;
        S.winOpen = 0; S.doorOpen = 0; S.airOpacity = 0; S.regLift = 0;
        S.c1Alpha = 0; S.c2Alpha = 0; S.c3Alpha = 0;
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-top">
            <div class="th-kicker">JANGAN PANIK DULU</div>
            <div class="th-title-card">
              <div class="th-main">BAU <span>GAS BOCOR</span><br>DI DAPUR?</div>
            </div>
          </div>
          <div class="th-bottom-pill"><span class="th-dot"></span>Lakukan 3 Langkah Darurat Ini</div>
        \`;
        window.OPENER.render(1.5);
      })()`
    }
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(VAULT_DIR, { recursive: true });

  // Override render loop so rAF doesn't overwrite custom thumbnail state
  await send('Runtime.evaluate', {
    expression: `window.OPENER.tl.pause();`,
    returnByValue: true
  });

  for (const th of THUMBS) {
    await send('Runtime.evaluate', {
      expression: `new Promise(r => { ${th.setup}; setTimeout(() => { ${th.setup}; r(true); }, 50); })`,
      awaitPromise: true,
      returnByValue: true
    });
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(snap.result.data, 'base64');
    fs.writeFileSync(path.join(OUT_DIR, th.out), buf);
    fs.writeFileSync(path.join(VAULT_DIR, th.out), buf);
    console.log('Generated thumbnail:', th.out);
  }

  try { ws.close(); } catch {}
  chrome.kill();
  await sleep(400);
  try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}

  const inputs = THUMBS.map(t => path.join(OUT_DIR, t.out));
  const filter = inputs.map((_, i) => `[${i}:v]scale=720:1280[c${i}]`).join(';') + ';[c0][c1][c2]hstack=inputs=3[out]';
  const sheetOut = path.join(OUT_DIR, 'thumb_ep01_3_opsi_sheet.jpg');
  execSync(`ffmpeg -y ${inputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${filter}" -map "[out]" -q:v 2 "${sheetOut}"`, { stdio: 'ignore', env: CHILD_ENV });
  fs.copyFileSync(sheetOut, path.join(VAULT_DIR, 'thumb_ep01_3_opsi_sheet.jpg'));
  console.log('Built thumbnail sheet:', sheetOut);
  process.exit(0);
})();
