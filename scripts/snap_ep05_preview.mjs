import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const VAULT_ASSETS = path.join(ROOT, 'previews_ep05');

// Isolate ALL temp files to workspace drive
const RENDER_TMP = path.join(ROOT, '.render_tmp_snap_ep05');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9248;
const SRV_PORT = 8778;
const USER_DATA = path.join(RENDER_TMP, 'chrome_prev5');

const SHOTS = [
  // Part 1: 11 Scene Pertama (Hook, Mekanisme, Sains Water Hammer)
  { t: 0.15,  out: 'ep05_s01_hook.png',          label: 'S01 Hook (Frame 0)' },
  { t: 7.60,  out: 'ep05_s02_rod_bend.png',      label: 'S02 Setang Bengkok' },
  { t: 15.10, out: 'ep05_s03_starter_ots.png',   label: 'S03 OTS Starter' },
  { t: 19.20, out: 'ep05_s04_box_filter.png',    label: 'S04 Box Filter' },
  { t: 24.40, out: 'ep05_s05_suction_water.png', label: 'S05 Hisap Air' },
  { t: 30.50, out: 'ep05_s06_compress_10_1.png', label: 'S06 Interrupt 10:1' },
  { t: 35.20, out: 'ep05_s07_clearance_12ml.png',label: 'S07 Sisa 12 mL' },
  { t: 38.20, out: 'ep05_s08_spoon_scale.png',   label: 'S08 < 1 Sendok' },
  { t: 42.50, out: 'ep05_s09_split_physics.png', label: 'S09 Split Gas vs Air' },
  { t: 48.20, out: 'ep05_s10_water_hammer.png',  label: 'S10 Piston Hantam' },
  { t: 52.80, out: 'ep05_s11_block_crack.png',   label: 'S11 Blok Jebol' },

  // Part 2: 11 Scene Berikutnya (3 Langkah, Oli Kopi Susu, Busi, Payoff, CTA, Sign-Off, Outro)
  { t: 57.20, out: 'ep05_s12_hero_reset.png',    label: 'S12 3 Langkah' },
  { t: 61.00, out: 'ep05_s13a_no_starter.png',   label: 'S13A Stop Starter' },
  { t: 63.90, out: 'ep05_s13b_push_dry.png',     label: 'S13B Dorong Kering' },
  { t: 66.50, out: 'ep05_s14a_inspect_oil.png',  label: 'S14A Cek Filter & Oli' },
  { t: 70.40, out: 'ep05_s14b_oil_compare.png',  label: 'S14B Oli Kopi Susu' },
  { t: 74.60, out: 'ep05_s15a_spark_plug.png',   label: 'S15A Lepas Busi' },
  { t: 77.60, out: 'ep05_s15b_cvt_dry.png',      label: 'S15B Kuras & CVT' },
  { t: 84.30, out: 'ep05_s16b_payoff_starter.png',label: 'S16B Payoff Starter' },
  { t: 88.60, out: 'ep05_s17_cta_comment.png',   label: 'S17 CTA Komen' },
  { t: 92.20, out: 'ep05_s18_signoff.png',       label: 'S18 Sign-Off' },
  { t: 96.60, out: 'ep05_s19_outro.png',         label: 'S19 Outro CTA' }
];

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
      const rel = urlPath === '/' ? '/ep05.html' : urlPath;
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

function stitchSheet(inputs, cols, tileW, tileH, outFile) {
  const layoutParts = [];
  for (let i = 0; i < inputs.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    layoutParts.push(`${col * tileW}_${row * tileH}`);
  }
  const filter = inputs.map((_, i) => `[${i}:v]scale=${tileW}:${tileH}[v${i}]`).join(';') + ';' +
    inputs.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${inputs.length}:layout=${layoutParts.join('|')}:fill=0x0F141A[out]`;
  execSync(`ffmpeg -y ${inputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${filter}" -map "[out]" -q:v 2 "${outFile}"`, { stdio: 'inherit' });
}

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
    `http://127.0.0.1:${SRV_PORT}/ep05.html?clean=1`
  ];
  if (process.platform === 'linux') chromeArgs.splice(6, 0, '--enable-unsafe-swiftshader');

  const chrome = spawn(chromeBin, chromeArgs, { stdio: 'ignore', env: CHILD_ENV });
  let targets = null;
  for (let i = 0; i < 35; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length) break;
    } catch {}
    await sleep(250);
  }
  if (!targets || !targets.length) throw new Error('Chrome DevTools target not found');

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

  let ready = false;
  for (let i = 0; i < 60; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'Boolean(window.OPENER && window.OPENER.ready)',
      returnByValue: true
    });
    if (r?.result?.result?.value) {
      ready = true;
      console.log('OPENER ready at iter', i);
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error('window.OPENER.ready timed out');

  fs.mkdirSync(VAULT_ASSETS, { recursive: true });

  for (const s of SHOTS) {
    const evRes = await send('Runtime.evaluate', {
      expression: `(async () => {
        document.body.classList.remove('cap-opt-1','cap-opt-2','cap-opt-3');
        document.body.classList.add('cap-opt-1');
        await window.OPENER.seek(${s.t});
        const gl = window.OPENER.renderer.getContext();
        const px = new Uint8Array(4);
        gl.readPixels(540, 960, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return { t: window.OPENER.tl.time(), px: Array.from(px) };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    await sleep(30);
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(VAULT_ASSETS, s.out), Buffer.from(snap.result.data, 'base64'));
    console.log('Captured:', s.out, evRes?.result?.result?.value);
  }

  try { ws.close(); } catch {}
  chrome.kill();
  if (srv) srv.close();
  await sleep(400);
  try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}

  const allFiles = SHOTS.map(s => path.join(VAULT_ASSETS, s.out));

  // Part 1: S01-S11 (4 cols x 3 rows, 540x960 per tile)
  const sheetPart1 = path.join(VAULT_ASSETS, 'ep05_preview_part1_s01_s11.jpg');
  stitchSheet(allFiles.slice(0, 11), 4, 540, 960, sheetPart1);
  console.log('Stitched Part 1:', sheetPart1);

  // Part 2: S12-S19 (4 cols x 3 rows, 540x960 per tile)
  const sheetPart2 = path.join(VAULT_ASSETS, 'ep05_preview_part2_s12_s19.jpg');
  stitchSheet(allFiles.slice(11, 22), 4, 540, 960, sheetPart2);
  console.log('Stitched Part 2:', sheetPart2);

  // Full 22-Scene Sheet (6 cols x 4 rows, 360x640 per tile)
  const sheetFull = path.join(VAULT_ASSETS, 'ep05_preview_22scenes_sheet.jpg');
  stitchSheet(allFiles, 6, 360, 640, sheetFull);
  console.log('Stitched 22-scene sheet:', sheetFull);

  process.exit(0);
})();
