import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const ROOT = process.cwd();
const KIT_DIR = path.join(ROOT, 'Publish_Kit_EP02');
const ASSET_DIR = path.join(ROOT, 'vault', 'assets');
const TMP_DIR = path.join(ROOT, '.render_tmp_thumb_ep02');
fs.mkdirSync(KIT_DIR, { recursive: true });
fs.mkdirSync(ASSET_DIR, { recursive: true });
fs.rmSync(TMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const fp = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => srv.listen(8791, '127.0.0.1', r));

const chromeBin = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe')
].find(p => fs.existsSync(p)) || 'chrome';

const chrome = spawn(chromeBin, [
  '--remote-debugging-port=9291',
  `--user-data-dir=${path.join(TMP_DIR, 'prof')}`,
  '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization', '--window-size=1080,1920', '--force-device-scale-factor=1',
  '--hide-scrollbars', '--mute-audio', 'http://127.0.0.1:8791/index.html?clean=1&caption=1'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let page;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch('http://127.0.0.1:9291/json')).json();
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

// Sembunyikan HUD video agar kita dapat raw 3D render super bersih untuk dikomposisi jadi thumbnail
await send('Runtime.evaluate', {
  expression: `document.getElementById('hud').style.display='none'; document.getElementById('OverlaySVG').style.display='none';`
});

async function snap3D(t) {
  await send('Runtime.evaluate', { expression: `window.OPENER.seek(${t})`, awaitPromise: true });
  const res = await send('Page.captureScreenshot', { format: 'png' });
  return 'data:image/png;base64,' + res.result.data;
}

const rawExplosion = await snap3D(5.95);
const rawCutaway = await snap3D(31.80);
const rawSafeLid = await snap3D(53.50);

const rendered = await send('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
    const [imExp, imCut, imSafe] = await Promise.all([
      loadImg(${JSON.stringify(rawExplosion)}),
      loadImg(${JSON.stringify(rawCutaway)}),
      loadImg(${JSON.stringify(rawSafeLid)})
    ]);

    const roundRect = (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };

    const drawHeaderBadge = (ctx, text, bg = '#261A66', fg = '#FFFFFF', y = 475) => {
      ctx.save();
      ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width;
      const bw = tw + 56, bh = 58, bx = 540 - bw / 2;
      ctx.fillStyle = bg;
      roundRect(ctx, bx, y, bw, bh, 999);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 540, y + bh / 2 + 1);
      ctx.restore();
    };

    const drawStrokeTitle = (ctx, lines, startY, fontSize = 104, lineH = 112) => {
      ctx.save();
      ctx.font = '800 ' + fontSize + 'px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      lines.forEach((ln, idx) => {
        const y = startY + idx * lineH;
        ctx.shadowColor = 'rgba(20, 14, 54, 0.45)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;
        ctx.lineWidth = 22;
        ctx.strokeStyle = '#261A66';
        ctx.strokeText(ln, 540, y);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(ln, 540, y);
      });
      ctx.restore();
    };

    const drawTiltPill = (ctx, text, y, bg = '#EF5F18', angle = -0.025) => {
      ctx.save();
      ctx.translate(540, y);
      ctx.rotate(angle);
      ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width;
      const pw = tw + 84, ph = 94;
      ctx.fillStyle = '#261A66';
      roundRect(ctx, -pw / 2, -ph / 2 + 11, pw, ph, 22);
      ctx.fill();
      ctx.fillStyle = bg;
      roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 22);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 2);
      ctx.restore();
    };

    const drawScrims = (ctx) => {
      const topG = ctx.createLinearGradient(0, 360, 0, 820);
      topG.addColorStop(0, 'rgba(20,14,54,0.68)');
      topG.addColorStop(1, 'rgba(20,14,54,0)');
      ctx.fillStyle = topG;
      ctx.fillRect(0, 360, 1080, 460);

      const botG = ctx.createLinearGradient(0, 1180, 0, 1560);
      botG.addColorStop(0, 'rgba(20,14,54,0)');
      botG.addColorStop(1, 'rgba(20,14,54,0.74)');
      ctx.fillStyle = botG;
      ctx.fillRect(0, 1180, 1080, 380);
    };

    // OPSI 1: Wajan Kebakaran? Jangan Siram Air!
    const c1 = document.createElement('canvas'); c1.width = 1080; c1.height = 1920;
    const g1 = c1.getContext('2d');
    g1.drawImage(imExp, -70, -40, 1220, 2168);
    drawScrims(g1);
    drawHeaderBadge(g1, '@janganpanikdulu  |  DARURAT DAPUR', '#261A66', '#FFFFFF', 465);
    drawStrokeTitle(g1, ['WAJAN', 'KEBAKARAN?'], 605, 112, 114);
    drawTiltPill(g1, 'JANGAN SIRAM AIR!', 1365, '#EF5F18', -0.025);

    // OPSI 2: Air Jadi Bom Uap 1.700x Lipat
    const c2 = document.createElement('canvas'); c2.width = 1080; c2.height = 1920;
    const g2 = c2.getContext('2d');
    g2.drawImage(imCut, -50, -30, 1180, 2098);
    drawScrims(g2);
    drawHeaderBadge(g2, 'FAKTA SAINS  |  SUHU MINYAK 300C', '#EF5F18', '#FFFFFF', 465);
    drawStrokeTitle(g2, ['AIR JADI', 'BOM UAP'], 605, 112, 114);
    drawTiltPill(g2, 'MELEDAK 1.700 LIPAT!', 1365, '#261A66', 0.02);

    // OPSI 3: Split Salah vs Benar
    const c3 = document.createElement('canvas'); c3.width = 1080; c3.height = 1920;
    const g3 = c3.getContext('2d');
    g3.save();
    g3.beginPath(); g3.rect(0, 0, 540, 1920); g3.clip();
    g3.drawImage(imExp, -160, 0, 1120, 1990);
    g3.restore();
    g3.save();
    g3.beginPath(); g3.rect(540, 0, 540, 1920); g3.clip();
    g3.drawImage(imSafe, 110, 0, 1120, 1990);
    g3.restore();
    g3.fillStyle = '#FFFFFF';
    g3.fillRect(534, 0, 12, 1920);
    drawScrims(g3);
    drawHeaderBadge(g3, 'SALAH  VS  BENAR', '#261A66', '#FFFFFF', 465);
    drawStrokeTitle(g3, ['PADAM API', 'DALAM 3 DETIK'], 605, 102, 108);
    drawTiltPill(g3, 'TUTUP RAPAT, BUKAN AIR!', 1365, '#0FA968', -0.015);

    // Sheet 3 Opsi berdampingan
    const sheet = document.createElement('canvas'); sheet.width = 1620; sheet.height = 960;
    const gs = sheet.getContext('2d');
    gs.fillStyle = '#0F141A'; gs.fillRect(0, 0, 1620, 960);
    gs.drawImage(c1, 0, 0, 540, 960);
    gs.drawImage(c2, 540, 0, 540, 960);
    gs.drawImage(c3, 1080, 0, 540, 960);

    return {
      op1: c1.toDataURL('image/png').split(',')[1],
      op2: c2.toDataURL('image/png').split(',')[1],
      op3: c3.toDataURL('image/png').split(',')[1],
      sheet: sheet.toDataURL('image/jpeg', 0.92).split(',')[1]
    };
  })()`
});

const out = rendered.result.value;
fs.writeFileSync(path.join(KIT_DIR, '03_Thumbnail_Opsi_1_Jangan_Siram_Air.png'), Buffer.from(out.op1, 'base64'));
fs.writeFileSync(path.join(KIT_DIR, '04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png'), Buffer.from(out.op2, 'base64'));
fs.writeFileSync(path.join(KIT_DIR, '05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png'), Buffer.from(out.op3, 'base64'));
fs.writeFileSync(path.join(ASSET_DIR, 'thumb_ep02_3_opsi_sheet.jpg'), Buffer.from(out.sheet, 'base64'));

ws.close(); chrome.kill(); srv.close();
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log('Selesai! 3 Thumbnail High-CTR EP02 berhasil disimpan ke Publish_Kit_EP02.');
