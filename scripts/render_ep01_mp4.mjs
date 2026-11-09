import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Keep ALL temporary browser profiles, caches, and buffers strictly on Disk D: (ROOT)
// to avoid touching Disk C: when C: free space is low.
const RENDER_TMP = path.join(ROOT, '.render_tmp');
fs.rmSync(RENDER_TMP, { recursive: true, force: true });
fs.mkdirSync(RENDER_TMP, { recursive: true });

const CHILD_ENV = {
  ...process.env,
  TEMP: RENDER_TMP,
  TMP: RENDER_TMP,
  TMPDIR: RENDER_TMP
};

const BASE_PORT = 9260;

const MODE = process.argv[2] || 'master';
const CAP_OPT = process.argv[3] || '1';
const FPS = MODE === 'preview' ? 24 : 30;
const DURATION = 59.56;
const TOTAL_FRAMES = Math.ceil(DURATION * FPS);
const OUT_MP4 = MODE === 'preview'
  ? path.join(ROOT, 'EP01_Bau_Gas_Bocor_PREVIEW.mp4')
  : path.join(ROOT, 'EP01_Bau_Gas_Bocor_MASTER_1080p.mp4');
const AUDIO_WAV = path.join(ROOT, 'audio_ep01_master.wav');

// 2 independent foreground GPU Chrome processes (low memory footprint, fast throughput)
const NUM_WORKERS = 2;

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

async function spawnWorkerBrowser(workerIdx, targetUrl) {
  const port = BASE_PORT + workerIdx;
  const userData = path.join(RENDER_TMP, `chrome_w${workerIdx}`);
  const cacheDir = path.join(RENDER_TMP, `cache_w${workerIdx}`);
  const crashDir = path.join(RENDER_TMP, `crash_w${workerIdx}`);
  fs.mkdirSync(userData, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(crashDir, { recursive: true });

  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    `--disk-cache-dir=${cacheDir}`,
    `--crash-dumps-dir=${crashDir}`,
    '--disk-cache-size=1048576',
    '--media-cache-size=1048576',
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
    '--disable-gpu-vsync',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    targetUrl
  ];

  if (process.platform === 'linux') {
    chromeArgs.splice(9, 0, '--enable-unsafe-swiftshader');
  }

  const proc = spawn(chromeBin, chromeArgs, { stdio: 'ignore', env: CHILD_ENV });

  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${port}/json`);
      if (targets && targets.some(t => t.type === 'page')) break;
    } catch {}
    await sleep(250);
  }

  if (!targets || !targets.some(t => t.type === 'page')) {
    throw new Error(`Worker ${workerIdx} failed to launch Chrome DevTools on port ${port}`);
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

  for (let i = 0; i < 50; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'Boolean(window.OPENER && window.OPENER.ready)',
      returnByValue: true
    });
    if (r?.result?.result?.value) break;
    await sleep(200);
  }

  return { send, proc, ws };
}

function cleanupTmp() {
  try {
    fs.rmSync(RENDER_TMP, { recursive: true, force: true });
  } catch {}
}

(async () => {
  let workers = [];
  try {
    await ensureLocalServer(8765);
    const targetUrl = `http://127.0.0.1:8765/index.html?clean=1&caption=${CAP_OPT}`;

    console.log(`[Disk D: Mode] Temp dir isolated at: ${RENDER_TMP}`);
    console.log(`Spawning ${NUM_WORKERS} GPU Chrome workers...`);
    workers = await Promise.all(
      Array.from({ length: NUM_WORKERS }, (_, idx) => spawnWorkerBrowser(idx, targetUrl))
    );

    console.log(`Starting ${MODE} studio render: ${TOTAL_FRAMES} frames at ${FPS}fps (1080x1920 High-Bitrate) -> ${OUT_MP4}`);

    const ff = spawn('ffmpeg', [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(FPS),
      '-i', '-',
      '-i', AUDIO_WAV,
      '-c:v', 'libx264',
      '-preset', MODE === 'preview' ? 'veryfast' : 'slow',
      '-profile:v', 'high',
      '-level:v', '4.2',
      '-pix_fmt', 'yuv420p',
      '-crf', MODE === 'preview' ? '18' : '14',
      '-maxrate', '20M',
      '-bufsize', '40M',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-ar', '48000',
      '-shortest',
      OUT_MP4
    ], { env: CHILD_ENV });

    ff.stderr.on('data', () => {});

    const tStart = Date.now();
    for (let base = 0; base < TOTAL_FRAMES; base += NUM_WORKERS) {
      const batchCount = Math.min(NUM_WORKERS, TOTAL_FRAMES - base);
      const promises = [];
      for (let w = 0; w < batchCount; w++) {
        const f = base + w;
        const t = f / FPS;
        const worker = workers[w];
        promises.push((async () => {
          await worker.send('Runtime.evaluate', {
            expression: `new Promise(r => { window.OPENER.seek(${t.toFixed(6)}); requestAnimationFrame(() => r(true)); })`,
            awaitPromise: true,
            returnByValue: true
          });
          const snap = await worker.send('Page.captureScreenshot', { format: 'jpeg', quality: 96 });
          return Buffer.from(snap.result.data, 'base64');
        })());
      }

      const buffers = await Promise.all(promises);
      for (const buf of buffers) {
        if (!ff.stdin.write(buf)) {
          await new Promise(r => ff.stdin.once('drain', r));
        }
      }

      const doneFrames = base + batchCount;
      if (doneFrames === NUM_WORKERS || doneFrames % (FPS * 3) < NUM_WORKERS || doneFrames === TOTAL_FRAMES) {
        const pct = (doneFrames / TOTAL_FRAMES * 100).toFixed(1);
        const elapsedSec = (Date.now() - tStart) / 1000;
        const fpsRate = (doneFrames / elapsedSec).toFixed(1);
        const remSec = Math.round((TOTAL_FRAMES - doneFrames) / Math.max(0.1, doneFrames / elapsedSec));
        console.log(`Progress: ${pct}% (${doneFrames}/${TOTAL_FRAMES}) | ${fpsRate} fps | elapsed: ${elapsedSec.toFixed(0)}s | ETA: ~${remSec}s`);
      }
    }

    ff.stdin.end();
    await new Promise(resolve => ff.on('close', resolve));

    for (const w of workers) {
      try { w.ws.close(); } catch {}
      try { w.proc.kill(); } catch {}
    }
    await sleep(500);
    cleanupTmp();

    const stat = fs.statSync(OUT_MP4);
    console.log(`Done! Exported Studio Master (${(stat.size / (1024 * 1024)).toFixed(2)} MB): ${OUT_MP4}`);
    process.exit(0);
  } catch (err) {
    console.error('Render error:', err);
    for (const w of workers) {
      try { w.proc.kill(); } catch {}
    }
    cleanupTmp();
    process.exit(1);
  }
})();
