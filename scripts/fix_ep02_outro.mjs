import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.cwd();
const HTML_PATH = path.join(ROOT, 'index.html');
const MASTER_MP4 = path.join(ROOT, 'EP02_Wajan_Terbakar_MASTER_1080p.mp4');
const KIT_MP4 = path.join(ROOT, 'Publish_Kit_EP02', '01_EP02_Wajan_Terbakar_MASTER_1080p.mp4');
const AUDIO_WAV = path.join(ROOT, 'audio_ep02_master.wav');
const TMP_DIR = path.join(ROOT, '.render_tmp_ep02');

// 1. Patch proporsi kamera & posisi Mas Raka di outro index.html
let html = fs.readFileSync(HTML_PATH, 'utf8');
html = html.replace(
  /camX: 0, camY: 1\.58, camZ: 7\.4,\s*lookX: 0, lookY: 1\.32, lookZ: 0,\s*fov: 22,\s*cX: 0, cY: -1\.15, cZ: 0, cRotY: 0, cKneel: 0,\s*cArmL: -0\.35, cArmR: -0\.35,\s*outroHeadTilt: 0\.14/,
  `camX: 0, camY: 1.65, camZ: 15.6,
    lookX: 0, lookY: 1.15, lookZ: 0,
    fov: 22,
    cX: 0, cY: -0.65, cZ: 0, cRotY: 0, cKneel: 0,
    cArmL: -0.25, cArmR: -0.25,
    outroHeadTilt: 0.12`
);
html = html.replace(
  /tl\.to\(S, \{ cY: -0\.22, duration: 0\.65, ease: 'power4\.out' \}, t0 \+ 1\.30\);/,
  `tl.to(S, { cY: 0.42, duration: 0.65, ease: 'power4.out' }, t0 + 1.30);`
);
html = html.replace(
  /tl\.to\(S, \{ cArmR: -1\.32, duration: 0\.55, ease: 'power3\.out' \}, t0 \+ 1\.38\);/,
  `tl.to(S, { cArmR: -2.35, duration: 0.55, ease: 'power3.out' }, t0 + 1.38);`
);
html = html.replace(
  /RAKA\.armR\.rotation\.z = isOutroStage \? \(0\.14 \+ kp \* 0\.12\) : 0;/,
  `RAKA.armR.rotation.z = isOutroStage ? (0.28 + Math.sin(t * 7.5) * 0.10) : 0;`
);
fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log('1/4 Patched outro framing in index.html');

// 2. Potong bagian utama 00.00s - 65.00s secara lossless (tanpa re-encode)
fs.rmSync(TMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TMP_DIR, { recursive: true });
const part1 = path.join(TMP_DIR, 'part1_main.mp4');
const part2 = path.join(TMP_DIR, 'part2_outro.mp4');
execFileSync('ffmpeg', ['-y', '-i', MASTER_MP4, '-t', '65.00', '-c:v', 'copy', '-an', part1], { stdio: 'inherit' });
console.log('2/4 Sliced 00.00s - 65.00s losslessly');

// 3. Render hanya frame outro 1950..2087 (65.00s - 69.60s)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const fp = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => srv.listen(8789, '127.0.0.1', r));

const chromeBin = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(chromeBin, [
  '--remote-debugging-port=9289',
  `--user-data-dir=${path.join(TMP_DIR, 'prof')}`,
  '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization', '--window-size=1080,1920', '--force-device-scale-factor=1',
  '--hide-scrollbars', '--mute-audio', 'http://127.0.0.1:8789/index.html?clean=1&caption=1'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let page;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch('http://127.0.0.1:9289/json')).json();
    page = list.find(t => t.type === 'page');
    if (page) break;
  } catch {}
  await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const c = ++id; pending.set(c, r); ws.send(JSON.stringify({ id: c, method, params })); });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
for (let i = 0; i < 50; i++) {
  const r = await send('Runtime.evaluate', { expression: 'Boolean(window.OPENER && window.OPENER.ready)', returnByValue: true });
  if (r?.result?.result?.value) break;
  await sleep(200);
}

const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '30', '-i', '-',
  '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.2', '-preset', 'slow', '-tune', 'animation',
  '-crf', '12', '-b:v', '18M', '-minrate', '14M', '-maxrate', '24M', '-bufsize', '36M',
  '-g', '30', '-keyint_min', '30', '-sc_threshold', '0', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  part2
]);

for (let f = 1950; f < 2088; f++) {
  const t = f / 30;
  await send('Runtime.evaluate', { expression: `window.OPENER.seek(${t.toFixed(6)})`, awaitPromise: true, returnByValue: true });
  const snap = await send('Page.captureScreenshot', { format: 'png' });
  ff.stdin.write(Buffer.from(snap.result.data, 'base64'));
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
ws.close(); chrome.kill(); srv.close();
console.log('3/4 Rendered 138 outro frames (65.00s - 69.60s)');

// 4. Gabungkan part1 + part2 + audio master penuh dan update Publish_Kit_EP02
const concatList = path.join(TMP_DIR, 'concat.txt');
fs.writeFileSync(concatList, `file '${part1.replace(/\\/g, '/')}'\nfile '${part2.replace(/\\/g, '/')}'\n`);
execFileSync('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-i', AUDIO_WAV,
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest',
  MASTER_MP4
], { stdio: 'inherit' });
fs.copyFileSync(MASTER_MP4, KIT_MP4);
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log('4/4 Done! Merged EP02 master & updated Publish_Kit_EP02.');
