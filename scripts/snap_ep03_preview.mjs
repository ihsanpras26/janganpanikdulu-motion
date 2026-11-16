import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const VAULT_ASSETS = path.join(ROOT, 'previews_ep03');

// Isolate ALL temp files to Disk D:
const RENDER_TMP = path.join(ROOT, '.render_tmp_snap_ep03');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9244;
const SRV_PORT = 8774;
const USER_DATA = path.join(RENDER_TMP, 'chrome_prev3');

const SHOTS = [
  { t: 2.2,  out: 'ep03_s01_hook.png' },
  { t: 7.2,  out: 'ep03_s02_runaway.png' },
  { t: 14.2, out: 'ep03_s03_lever_empty.png' },
  { t: 19.2, out: 'ep03_s04_disc_300c.png' },
  { t: 25.0, out: 'ep03_s05_caliper_boil.png' },
  { t: 28.4, out: 'ep03_s06a_vapor_lock.png' },
  { t: 31.2, out: 'ep03_s06_vapor_lock.png' },
  { t: 36.2, out: 'ep03_s07_cvt_detach.png' },
  { t: 41.2, out: 'ep03_s08_freewheel.png' },
  { t: 45.0, out: 'ep03_s09_cam_check.png' },
  { t: 49.8, out: 'ep03_s10a_step1_key_on.png' },
  { t: 53.2, out: 'ep03_s10b_step1_cvt_grip.png' },
  { t: 58.2, out: 'ep03_s11_step2_pump.png' },
  { t: 65.2, out: 'ep03_s12_step3_escape.png' },
  { t: 73.8, out: 'ep03_s14_signoff.png' }
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
      const rel = urlPath === '/' ? '/ep03.html' : urlPath;
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
    `http://127.0.0.1:${SRV_PORT}/ep03.html?clean=1`
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

  for (let i = 0; i < 60; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'Boolean(window.OPENER && window.OPENER.ready)',
      returnByValue: true
    });
    if (r?.result?.result?.value) {
      console.log('OPENER ready at iter', i);
      break;
    }
    await sleep(200);
  }

  fs.mkdirSync(VAULT_ASSETS, { recursive: true });

  for (const s of SHOTS) {
    const evRes = await send('Runtime.evaluate', {
      expression: `(() => {
        document.body.classList.remove('cap-opt-1','cap-opt-2','cap-opt-3');
        document.body.classList.add('cap-opt-1');
        window.OPENER.seek(${s.t});
        const gl = window.OPENER.renderer.getContext();
        const px = new Uint8Array(4);
        gl.readPixels(540, 960, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return { t: window.OPENER.tl.time(), px: Array.from(px) };
      })()`,
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

  const inputs = [
    'ep03_s01_hook.png',
    'ep03_s02_runaway.png',
    'ep03_s03_lever_empty.png',
    'ep03_s04_disc_300c.png',
    'ep03_s05_caliper_boil.png',
    'ep03_s06a_vapor_lock.png',
    'ep03_s06_vapor_lock.png',
    'ep03_s07_cvt_detach.png',
    'ep03_s08_freewheel.png',
    'ep03_s09_cam_check.png',
    'ep03_s10a_step1_key_on.png',
    'ep03_s10b_step1_cvt_grip.png',
    'ep03_s11_step2_pump.png',
    'ep03_s12_step3_escape.png',
    'ep03_s14_signoff.png'
  ].map(f => path.join(VAULT_ASSETS, f));

  const layout = [
    '0_0', '540_0', '1080_0', '1620_0', '2160_0',
    '0_960', '540_960', '1080_960', '1620_960', '2160_960',
    '0_1920', '540_1920', '1080_1920', '1620_1920', '2160_1920'
  ].join('|');

  const filter = inputs.map((_, i) => `[${i}:v]scale=540:960[v${i}]`).join(';') + ';' +
    inputs.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${inputs.length}:layout=${layout}[out]`;

  const sheetOut = path.join(VAULT_ASSETS, 'ep03_preview_14scenes_sheet.jpg');
  execSync(`ffmpeg -y ${inputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${filter}" -map "[out]" -q:v 2 "${sheetOut}"`, { stdio: 'ignore' });
  console.log('Stitched 14-scene sheet:', sheetOut);
  process.exit(0);
})();
