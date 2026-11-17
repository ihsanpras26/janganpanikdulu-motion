import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const VAULT_ASSETS = path.join(ROOT, 'previews_ep04');

// Isolate ALL temp files to Disk D:
const RENDER_TMP = path.join(ROOT, '.render_tmp_snap_ep04');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9245;
const SRV_PORT = 8775;
const USER_DATA = path.join(RENDER_TMP, 'chrome_prev4');

const SHOTS = [
  { t: 2.65, out: 'ep04_s01_hook.png',          label: 'S01 Hook' },
  { t: 5.20, out: 'ep04_s02_amputasi.png',      label: 'S02 Risiko Amputasi' },
  { t: 9.20, out: 'ep04_s03_ikat_darah.png',    label: 'S03 Ikat Kencang' },
  { t: 13.4, out: 'ep04_s04_xray_darah.png',    label: 'S04 Lewat Darah?' },
  { t: 16.2, out: 'ep04_s05_bukan_darah.png',   label: 'S05 Bukan Darah' },
  { t: 19.2, out: 'ep04_s06_getah_bening.png',  label: 'S06 Getah Bening' },
  { t: 22.2, out: 'ep04_s07_pompa_jantung.png', label: 'S07 Pompa Jantung' },
  { t: 25.0, out: 'ep04_s08_nol_pompa.png',     label: 'S08 0 Pompa' },
  { t: 27.5, out: 'ep04_s09_panik_lari.png',    label: 'S09 Panik Lari' },
  { t: 30.2, out: 'ep04_s10_otot_pompa.png',    label: 'S10 Otot Pompa' },
  { t: 32.8, out: 'ep04_s11_diikat_kencang.png',label: 'S11 Ikat Cutaway' },
  { t: 35.5, out: 'ep04_s12_oksigen_putus.png', label: 'S12 Oksigen Putus' },
  { t: 38.7, out: 'ep04_s13_nekrosis.png',      label: 'S13 Nekrosis' },
  { t: 41.2, out: 'ep04_s14_mitos_sedot.png',   label: 'S14 Mitos Sedot' },
  { t: 44.4, out: 'ep04_s15_bakteri_mulut.png', label: 'S15 Bakteri Mulut' },
  { t: 48.6, out: 'ep04_s16_patah_tulang.png',  label: 'S16 Kayak Patah Tulang' },
  { t: 51.6, out: 'ep04_s17_step1_diam.png',    label: 'S17 Step 1 Diam' },
  { t: 55.5, out: 'ep04_s18_step2_lepas.png',   label: 'S18 Step 2 Lepas Benda' },
  { t: 60.6, out: 'ep04_s19_step3_bidai.png',   label: 'S19 Step 3 Bidai' },
  { t: 64.5, out: 'ep04_s20_step4a_foto.png',   label: 'S20 Step 4A Foto' },
  { t: 68.90, out: 'ep04_s21_step4b_rs_sabu.png',label: 'S21 Step 4B RS & SABU' },
  { t: 71.2, out: 'ep04_s22_payoff_sedot.png',  label: 'S22 Payoff Sedot' },
  { t: 73.5, out: 'ep04_s23_payoff_gerak.png',  label: 'S23 Payoff Gerak' },
  { t: 75.8, out: 'ep04_s24_signoff.png',       label: 'S24 Sign-Off' },
  { t: 80.5, out: 'ep04_s25_outro.png',         label: 'S25 Outro CTA' }
];

const EXTRA_SHOTS = [
  { t: 0.72,  out: 'ep04_s01a_strike.png',      label: 'S01A Snake Strike' },
  { t: 66.85, out: 'ep04_s21a_ambulance.png',   label: 'S21A Ambulance' }
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
      const rel = urlPath === '/' ? '/ep04.html' : urlPath;
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

function stitchSheet(inputs, cols, rows, tileW, tileH, outFile) {
  const layoutParts = [];
  for (let i = 0; i < inputs.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    layoutParts.push(`${col * tileW}_${row * tileH}`);
  }
  const filter = inputs.map((_, i) => `[${i}:v]scale=${tileW}:${tileH}[v${i}]`).join(';') + ';' +
    inputs.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${inputs.length}:layout=${layoutParts.join('|')}[out]`;
  execSync(`ffmpeg -y ${inputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${filter}" -map "[out]" -q:v 2 "${outFile}"`, { stdio: 'ignore' });
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
    `http://127.0.0.1:${SRV_PORT}/ep04.html?clean=1`
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

  for (const s of [...SHOTS, ...EXTRA_SHOTS]) {
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

  // Part 1: S01-S15 (5 cols x 3 rows, 540x960 per tile -> 2700x2880)
  const sheetPart1 = path.join(VAULT_ASSETS, 'ep04_preview_part1_s01_s15.jpg');
  stitchSheet(allFiles.slice(0, 15), 5, 3, 540, 960, sheetPart1);
  console.log('Stitched Part 1:', sheetPart1);

  // Part 2: S16-S25 (5 cols x 2 rows, 540x960 per tile -> 2700x1920)
  const sheetPart2 = path.join(VAULT_ASSETS, 'ep04_preview_part2_s16_s25.jpg');
  stitchSheet(allFiles.slice(15, 25), 5, 2, 540, 960, sheetPart2);
  console.log('Stitched Part 2:', sheetPart2);

  // Full 25-Scene Sheet (5 cols x 5 rows, 360x640 per tile -> 1800x3200)
  const sheetFull = path.join(VAULT_ASSETS, 'ep04_preview_25scenes_sheet.jpg');
  stitchSheet(allFiles, 5, 5, 360, 640, sheetFull);
  console.log('Stitched 25-scene sheet:', sheetFull);

  process.exit(0);
})();
