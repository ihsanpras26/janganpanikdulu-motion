import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const VAULT_ASSETS = path.join(ROOT, 'previews_v2');

// Isolate ALL temp files to Disk D:
const RENDER_TMP = path.join(ROOT, '.render_tmp_snap');
fs.rmSync(RENDER_TMP, { recursive: true, force: true });
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9234;
const USER_DATA = path.join(RENDER_TMP, 'chrome_prev');

const SHOTS = [
  { t: 1.5,  out: 'v2_s01_hook.png' },
  { t: 10.6, out: 'v2_s03_dark_kitchen.png' },
  { t: 14.2, out: 'v2_s04_xray_copper.png' },
  { t: 19.8, out: 'v2_s05_spark_1000c.png' },
  { t: 23.4, out: 'v2_s06_gas_2x.png' },
  { t: 29.0, out: 'v2_s07_gas_rise.png' },
  { t: 40.8, out: 'v2_s10_step1_switch.png' },
  { t: 45.4, out: 'v2_s11_step2_regulator.png' },
  { t: 49.4, out: 'v2_s12_step3_door_window.png' },
  { t: 58.6, out: 'v2_s14_signoff.png' }
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
  if (process.platform === 'linux') chromeArgs.splice(6, 0, '--enable-unsafe-swiftshader');

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

  fs.mkdirSync(VAULT_ASSETS, { recursive: true });

  // 1. Capture 10 storyboard shots with Caption Option 1
  for (const s of SHOTS) {
    await send('Runtime.evaluate', {
      expression: `new Promise(r => {
        document.body.classList.remove('cap-opt-1','cap-opt-2','cap-opt-3');
        document.body.classList.add('cap-opt-1');
        window.OPENER.seek(${s.t});
        requestAnimationFrame(() => r(true));
      })`,
      awaitPromise: true,
      returnByValue: true
    });
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(VAULT_ASSETS, s.out), Buffer.from(snap.result.data, 'base64'));
    console.log('Captured:', s.out);
  }

  // 2. Capture 3 Caption Options side-by-side at t = 51.2s ("supaya udara luar mendorong gas keluar.")
  for (const opt of [1, 2, 3]) {
    await send('Runtime.evaluate', {
      expression: `new Promise(r => {
        document.body.classList.remove('cap-opt-1','cap-opt-2','cap-opt-3');
        document.body.classList.add('cap-opt-${opt}');
        window.OPENER.seek(51.15);
        requestAnimationFrame(() => r(true));
      })`,
      awaitPromise: true,
      returnByValue: true
    });
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const outName = `caption_opsi_${opt}.png`;
    fs.writeFileSync(path.join(VAULT_ASSETS, outName), Buffer.from(snap.result.data, 'base64'));
    console.log('Captured caption option:', outName);
  }

  try { ws.close(); } catch {}
  chrome.kill();
  await sleep(400);
  try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}

  // Build 8-scene storyboard contact sheet
  const inputs8 = [
    'v2_s01_hook.png',
    'v2_s03_dark_kitchen.png',
    'v2_s04_xray_copper.png',
    'v2_s05_spark_1000c.png',
    'v2_s06_gas_2x.png',
    'v2_s10_step1_switch.png',
    'v2_s11_step2_regulator.png',
    'v2_s12_step3_door_window.png'
  ].map(f => path.join(VAULT_ASSETS, f));

  const filter8 = inputs8.map((_, i) => `[${i}:v]scale=540:960[v${i}]`).join(';') + ';' +
    inputs8.map((_, i) => `[v${i}]`).join('') + 'xstack=inputs=8:layout=0_0|540_0|1080_0|1620_0|0_960|540_960|1080_960|1620_960[out]';

  execSync(`ffmpeg -y ${inputs8.map(f => `-i "${f}"`).join(' ')} -filter_complex "${filter8}" -map "[out]" -q:v 2 "${path.join(VAULT_ASSETS, 'v2_director_8scenes_sheet.jpg')}"`, { stdio: 'ignore', env: CHILD_ENV });

  // Build 3-Option Caption Comparison Sheet (full side-by-side + zoomed caption comparison)
  const capInputs = [1, 2, 3].map(n => path.join(VAULT_ASSETS, `caption_opsi_${n}.png`));
  const capFilter = capInputs.map((_, i) => `[${i}:v]scale=720:1280[c${i}]`).join(';') + ';' +
    '[c0][c1][c2]hstack=inputs=3[out]';
  execSync(`ffmpeg -y ${capInputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${capFilter}" -map "[out]" -q:v 2 "${path.join(VAULT_ASSETS, 'caption_3_opsi_sheet.jpg')}"`, { stdio: 'ignore', env: CHILD_ENV });

  const zoomFilter = capInputs.map((_, i) => `[${i}:v]crop=1080:520:0:1360[z${i}]`).join(';') + ';' +
    '[z0][z1][z2]vstack=inputs=3[out]';
  execSync(`ffmpeg -y ${capInputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${zoomFilter}" -map "[out]" -q:v 2 "${path.join(VAULT_ASSETS, 'caption_3_opsi_zoom.jpg')}"`, { stdio: 'ignore', env: CHILD_ENV });

  console.log('Built contact sheets: v2_director_8scenes_sheet.jpg, caption_3_opsi_sheet.jpg & caption_3_opsi_zoom.jpg');
  process.exit(0);
})();
