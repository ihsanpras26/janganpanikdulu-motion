import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const VAULT_ASSETS = path.join(ROOT, 'vault/assets');

const PORT = 9234;
const USER_DATA = path.join(os.tmpdir(), 'chrome_ep01_prev');

const SHOTS = [
  { t: 1.5,  out: 'ep01_s01_hook.png' },
  { t: 9.2,  out: 'ep01_s03_dark_kitchen.png' },
  { t: 14.2, out: 'ep01_s04_xray_copper.png' },
  { t: 18.2, out: 'ep01_s05_spark_1000c.png' },
  { t: 23.0, out: 'ep01_s06_gas_2x.png' },
  { t: 28.5, out: 'ep01_s07_gas_rise.png' },
  { t: 45.4, out: 'ep01_s11_step2_regulator.png' },
  { t: 50.0, out: 'ep01_s12_step3_window.png' },
  { t: 58.6, out: 'ep01_s14_signoff.png' }
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
    srv.on('error', () => resolve(null)); // port already in use
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
  const localSrv = await ensureLocalServer(8765);
  const chrome = spawn(chromeBin, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--ignore-certificate-errors',
    '--proxy-bypass-list=<-loopback>',
    '--window-size=1080,1920',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--mute-audio',
    'http://127.0.0.1:8765/index.html?clean=1'
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 30; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length) break;
    } catch {}
    await sleep(300);
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

  for (const s of SHOTS) {
    await send('Runtime.evaluate', {
      expression: `window.OPENER.seek(${s.t});`,
      returnByValue: true
    });
    await sleep(160);
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(snap.result.data, 'base64');
    fs.writeFileSync(path.join(VAULT_ASSETS, s.out), buf);
    console.log('Captured:', s.out);
  }

  try { await send('Browser.close'); } catch {}
  chrome.kill();

  const inputs = [
    'ep01_s01_hook.png',
    'ep01_s03_dark_kitchen.png',
    'ep01_s04_xray_copper.png',
    'ep01_s05_spark_1000c.png',
    'ep01_s06_gas_2x.png',
    'ep01_s07_gas_rise.png',
    'ep01_s11_step2_regulator.png',
    'ep01_s12_step3_window.png'
  ].map(f => path.join(VAULT_ASSETS, f));

  const filter = inputs.map((_, i) => `[${i}:v]scale=540:960[v${i}]`).join(';') + ';' +
    inputs.map((_, i) => `[v${i}]`).join('') + 'xstack=inputs=8:layout=0_0|540_0|1080_0|1620_0|0_960|540_960|1080_960|1620_960[out]';

  const args = [
    '-y',
    ...inputs.flatMap(f => ['-i', f]),
    '-filter_complex', filter,
    '-map', '[out]',
    '-q:v', '3',
    path.join(VAULT_ASSETS, 'ep01_preview_8scenes_sheet.jpg')
  ];

  execSync(`ffmpeg ${args.map(a => `"${a}"`).join(' ')}`, { stdio: 'ignore' });
  console.log('Built contact sheet: ep01_preview_8scenes_sheet.jpg');
  process.exit(0);
})();
