import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PORT = 9238;
const USER_DATA = path.join(os.tmpdir(), 'chrome_ep01_render');

const MODE = process.argv[2] || 'preview';
const FPS = MODE === 'master' ? 30 : 24;
const DURATION = 59.56;
const TOTAL_FRAMES = Math.ceil(DURATION * FPS);
const OUT_MP4 = MODE === 'master'
  ? path.join(ROOT, 'EP01_Bau_Gas_Bocor_MASTER_1080p.mp4')
  : path.join(ROOT, 'EP01_Bau_Gas_Bocor_PREVIEW.mp4');
const AUDIO_WAV = path.join(ROOT, 'audio_ep01_master.wav');

// Locate Chrome binary cross-platform
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

const chrome = spawn(chromeBin, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA}`,
  '--headless=new',
  '--window-size=1080,1920',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-gpu-vsync',
  'http://localhost:8765/index.html?clean=1'
], { stdio: 'ignore' });

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

  console.log(`Starting ${MODE} render: ${TOTAL_FRAMES} frames at ${FPS}fps -> ${OUT_MP4}`);

  const ff = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(FPS),
    '-i', '-',
    '-i', AUDIO_WAV,
    '-c:v', 'libx264',
    '-preset', MODE === 'master' ? 'slow' : 'veryfast',
    '-profile:v', 'high',
    '-level:v', '4.2',
    '-pix_fmt', 'yuv420p',
    '-crf', MODE === 'master' ? '16' : '18',
    '-maxrate', '18M',
    '-bufsize', '36M',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-shortest',
    OUT_MP4
  ]);

  ff.stderr.on('data', () => {});

  const tStart = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    await send('Runtime.evaluate', {
      expression: `window.OPENER.seek(${t});`,
      returnByValue: true
    });
    const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
    const buf = Buffer.from(snap.result.data, 'base64');
    if (!ff.stdin.write(buf)) {
      await new Promise(r => ff.stdin.once('drain', r));
    }
    if (f % (FPS * 5) === 0 || f === TOTAL_FRAMES - 1) {
      const pct = ((f + 1) / TOTAL_FRAMES * 100).toFixed(1);
      const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
      console.log(`Render progress: ${pct}% (${f+1}/${TOTAL_FRAMES}) | elapsed: ${elapsed}s`);
    }
  }

  ff.stdin.end();
  await new Promise(resolve => ff.on('close', resolve));
  try { await send('Browser.close'); } catch {}
  chrome.kill();

  console.log(`Done! Exported: ${OUT_MP4}`);
  process.exit(0);
})();
