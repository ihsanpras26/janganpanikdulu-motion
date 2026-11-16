import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'previews_v2');
const VAULT_DIR = path.join(ROOT, 'vault', 'assets');
const PUBLISH_DIR = path.join(ROOT, 'Publish_Kit_EP02');

const RENDER_TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jpanik-ep02-v4-'));
const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const PORT = 9259;
const SRV_PORT = 8776;

let chromeBin = 'chrome';
if (process.platform === 'win32') {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe')
  ];
  chromeBin = candidates.find(p => fs.existsSync(p)) || 'chrome';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function startServer(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? '/index.html' : urlPath;
      const fp = path.join(ROOT, rel);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404);
        return res.end('Not found');
      }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForCDP(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Timeout menunggu Chrome CDP.');
}

function safeWrite(fp, buf) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  try { fs.rmSync(fp, { force: true }); } catch {}
  fs.writeFileSync(fp, buf);
}

(async () => {
  const srv = await startServer(SRV_PORT);
  const chrome = spawn(chromeBin, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--window-size=1080,1920',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--mute-audio',
    `http://127.0.0.1:${SRV_PORT}/index.html?clean=1`
  ], { stdio: 'ignore' });

  let ws;
  try {
    const wsUrl = await waitForCDP(PORT);
    ws = new WebSocket(wsUrl);
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
        expression: 'Boolean(window.OPENER && window.OPENER.ready && document.fonts.status === "loaded")',
        returnByValue: true
      });
      if (r?.result?.result?.value) break;
      await sleep(200);
    }
    await sleep(250);

    // Inject clean HUD kill-switch, 5-finger 3D hands, and expressive face generator
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.THUMB_LOCK = true;
        window.OPENER.tl.pause();

        const st = document.createElement('style');
        st.textContent = \`
          #hook-card, #step-tracker, #bento-card, #sub-wrap, #c1, #c2, #c3, #c4,
          .subtitle, .step-pill, .bento-card, .callout {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          #thumb-svg {
            position: fixed;
            inset: 0;
            width: 1080px;
            height: 1920px;
            z-index: 99990;
            pointer-events: none;
          }
          #thumb-overlay {
            position: fixed;
            inset: 0;
            width: 1080px;
            height: 1920px;
            z-index: 99995;
            pointer-events: none;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
        \`;
        document.head.appendChild(st);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'thumb-svg';
        svg.setAttribute('viewBox', '0 0 1080 1920');
        document.body.appendChild(svg);

        const ov = document.createElement('div');
        ov.id = 'thumb-overlay';
        document.body.appendChild(ov);

        window.setRakaExpression = (mode) => {
          const raka = window.OPENER.RAKA;
          const faceMesh = raka.headPivot.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
          if (!faceMesh) return;

          const cv = document.createElement('canvas');
          cv.width = 512; cv.height = 512;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, 512, 512);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 22;
          if (mode === 'urgent_stop') {
            ctx.beginPath();
            ctx.moveTo(106, 146); ctx.quadraticCurveTo(158, 168, 210, 180);
            ctx.moveTo(406, 146); ctx.quadraticCurveTo(354, 168, 302, 180);
            ctx.stroke();
          } else if (mode === 'shock_recoil') {
            ctx.beginPath();
            ctx.moveTo(106, 158); ctx.quadraticCurveTo(158, 122, 210, 152);
            ctx.moveTo(302, 152); ctx.quadraticCurveTo(354, 122, 406, 158);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(112, 162); ctx.quadraticCurveTo(160, 148, 208, 162);
            ctx.moveTo(304, 162); ctx.quadraticCurveTo(352, 148, 400, 162);
            ctx.stroke();
          }

          [158, 354].forEach(cx => {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(cx, 230, 34, 42, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 9;
            ctx.strokeStyle = '#181E26';
            ctx.stroke();

            ctx.fillStyle = '#181E26';
            ctx.beginPath();
            ctx.arc(cx, 232, 19, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx - 7, 220, 8, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.strokeStyle = 'rgba(145, 92, 58, 0.85)';
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(256, 216); ctx.lineTo(246, 268); ctx.lineTo(268, 272);
          ctx.stroke();

          if (mode === 'urgent_stop') {
            ctx.fillStyle = '#7F1D1D';
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.roundRect(204, 304, 104, 76, 30);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(218, 310, 76, 19, 7);
            ctx.fill();
          } else if (mode === 'shock_recoil') {
            ctx.fillStyle = '#7F1D1D';
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.ellipse(256, 344, 38, 44, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          } else {
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.arc(256, 326, 48, 0.18 * Math.PI, 0.82 * Math.PI);
            ctx.stroke();
          }

          if (mode !== 'confident_safe') {
            ctx.fillStyle = '#38BDF8';
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(444, 126);
            ctx.bezierCurveTo(470, 166, 468, 198, 444, 198);
            ctx.bezierCurveTo(420, 198, 418, 166, 444, 126);
            ctx.fill(); ctx.stroke();
          }

          const oldTex = faceMesh.material.map;
          const newTex = new oldTex.constructor(cv);
          newTex.colorSpace = oldTex.colorSpace;
          newTex.needsUpdate = true;
          faceMesh.material.map = newTex;
          faceMesh.material.needsUpdate = true;
        };

        window.upgradeRakaHands = () => {
          const raka = window.OPENER.RAKA;
          if (window._handsUpgraded) return;
          window._handsUpgraded = true;

          const buildPalm = (armGroup, isStopHand) => {
            const sphereHand = armGroup.children[armGroup.children.length - 1];
            const skinMat = sphereHand.material;
            const outlineMat = sphereHand.children[0]?.material;
            sphereHand.visible = false;

            const hg = sphereHand.clone();
            hg.clear();
            hg.visible = true;
            hg.position.set(0, -0.60, 0);

            const addOut = (m, sc = 1.08) => {
              if (outlineMat) {
                const o = new m.constructor(m.geometry, outlineMat);
                o.scale.setScalar(sc);
                m.add(o);
              }
              return m;
            };

            const BoxGeo = armGroup.children[0].geometry.constructor;
            const palm = addOut(new sphereHand.constructor(new BoxGeo(0.24, 0.22, 0.11, 4, 0.045), skinMat));
            palm.position.set(0, -0.04, 0);
            hg.add(palm);

            if (isStopHand) {
              [-0.082, -0.027, 0.027, 0.082].forEach((fx, i) => {
                const len = (i === 1 || i === 2) ? 0.175 : 0.15;
                const f = addOut(new sphereHand.constructor(new BoxGeo(0.052, len, 0.072, 3, 0.024), skinMat));
                f.position.set(fx, -0.19 - (len - 0.15) * 0.5, 0);
                hg.add(f);
              });
              const thumb = addOut(new sphereHand.constructor(new BoxGeo(0.062, 0.135, 0.072, 3, 0.025), skinMat));
              thumb.position.set(0.145, -0.05, 0.015);
              thumb.rotation.z = 0.58;
              hg.add(thumb);
            } else {
              const idxF = addOut(new sphereHand.constructor(new BoxGeo(0.056, 0.21, 0.075, 3, 0.025), skinMat));
              idxF.position.set(-0.065, -0.22, 0.01);
              hg.add(idxF);
              [-0.01, 0.042, 0.092].forEach((fx) => {
                const cf = addOut(new sphereHand.constructor(new BoxGeo(0.050, 0.095, 0.085, 3, 0.024), skinMat));
                cf.position.set(fx, -0.14, 0.02);
                hg.add(cf);
              });
              const thumb = addOut(new sphereHand.constructor(new BoxGeo(0.060, 0.12, 0.072, 3, 0.025), skinMat));
              thumb.position.set(-0.13, -0.06, 0.02);
              thumb.rotation.z = -0.52;
              hg.add(thumb);
            }

            armGroup.add(hg);
            return hg;
          };

          window._handL = buildPalm(raka.armL, true);
          window._handR = buildPalm(raka.armR, false);
        };
        window.upgradeRakaHands();
      })()`,
      returnByValue: true
    });

    // =========================================================================
    // OPSI 1: CLASSIC TOP-BOTTOM COMPARISON (SIRAM AIR vs TUTUP RAPAT)
    // =========================================================================
    // 1A. Capture TOP panel (Fireball + Dipper + Shocked Raka)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera } = window.OPENER;
        S.camX = 8.4; S.camY = 9.0; S.camZ = 11.4;
        S.lookX = 0.35; S.lookY = 2.05; S.lookZ = -0.35;
        S.fov = 24;
        S.fireballScale = 1.35; S.flameScale = 1.35;
        S.gayungAlpha = 1; S.gayungTilt = 0.85;
        S.lidSlide = 0; S.burnerOn = 1; S.knobOff = 0;

        render(18.2);
        window.setRakaExpression('shock_recoil');
        RAKA.root.scale.setScalar(1.16);
        RAKA.bodyPivot.rotation.set(-0.10, 0.22, -0.06);
        RAKA.headPivot.rotation.set(-0.04, 0.28, 0.05);
        RAKA.armL.rotation.set(-1.35, 0.18, -0.22);
        if (window._handL) window._handL.rotation.set(-1.58, 0, 0);
        RAKA.armR.rotation.set(-1.25, -0.30, 0.55);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        renderer.render(scene, camera);
        document.getElementById('thumb-svg').innerHTML = '';
        document.getElementById('thumb-overlay').innerHTML = '';
      })()`
    });
    await sleep(120);
    const topSnap = await send('Page.captureScreenshot', { format: 'png' });

    // 1B. Capture BOTTOM panel (Closed Lid + Fire Out + Confident Raka)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera } = window.OPENER;
        S.camX = 8.4; S.camY = 9.0; S.camZ = 11.4;
        S.lookX = 0.35; S.lookY = 1.95; S.lookZ = -0.35;
        S.fov = 24;
        S.fireballScale = 0; S.flameScale = 0.05;
        S.gayungAlpha = 0; S.lidSlide = 0.82; S.burnerOn = 0; S.knobOff = 1;

        render(48.0);
        window.setRakaExpression('confident_safe');
        RAKA.root.scale.setScalar(1.16);
        RAKA.bodyPivot.rotation.set(0.06, 0.18, -0.04);
        RAKA.headPivot.rotation.set(-0.04, 0.16, 0.02);
        RAKA.armL.rotation.set(-1.35, 0.18, -0.22);
        if (window._handL) window._handL.rotation.set(-1.58, 0, 0);
        RAKA.armR.rotation.set(-1.12, -0.22, 0.42);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        renderer.render(scene, camera);
      })()`
    });
    await sleep(120);
    const botSnap = await send('Page.captureScreenshot', { format: 'png' });

    // 1C. Composite Top-Bottom Classic Comparison inside page canvas
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `new Promise(async (resolve) => {
        const loadImg = (b64) => new Promise(res => {
          const im = new Image();
          im.onload = () => res(im);
          im.src = 'data:image/png;base64,' + b64;
        });
        const [imgTop, imgBot] = await Promise.all([
          loadImg(${JSON.stringify(topSnap.result.data)}),
          loadImg(${JSON.stringify(botSnap.result.data)})
        ]);

        const comp = document.createElement('canvas');
        comp.id = 'comp-canvas';
        comp.width = 1080;
        comp.height = 1920;
        comp.style.cssText = 'position:fixed;inset:0;width:1080px;height:1920px;z-index:99980;';
        const ctx = comp.getContext('2d');

        // Draw Top half (cropped around action center y=620..1240 -> mapped to y=0..960)
        ctx.drawImage(imgTop, 0, 560, 1080, 740, 0, 0, 1080, 960);
        // Subtle warm danger tint on top half
        ctx.fillStyle = 'rgba(239, 95, 24, 0.14)';
        ctx.fillRect(0, 0, 1080, 960);

        // Draw Bottom half (cropped around action center y=580..1260 -> mapped to y=960..1920)
        ctx.drawImage(imgBot, 0, 560, 1080, 740, 0, 960, 1080, 960);
        // Subtle cool indigo authority tint on bottom half
        ctx.fillStyle = 'rgba(38, 26, 102, 0.14)';
        ctx.fillRect(0, 960, 1080, 960);

        // Solid 1:1 Safe-Zone Outer Frame & Center Horizontal Split Line
        ctx.strokeStyle = '#EF5F18';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 427, 1066, 533);

        ctx.strokeStyle = '#261A66';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 960, 1066, 533);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 953, 1080, 14);

        document.body.appendChild(comp);

        document.getElementById('thumb-svg').innerHTML = \`
          <circle cx="735" cy="705" r="76" fill="none" stroke="#EF5F18" stroke-width="14"/>
          <line x1="681" y1="651" x2="789" y2="759" stroke="#EF5F18" stroke-width="14" stroke-linecap="round"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <!-- Top Half Label (2 words) -->
          <div style="position:absolute;top:454px;left:46px;background:#EF5F18;color:#FFFFFF;border:5px solid #FFFFFF;border-radius:18px;padding:14px 28px;box-shadow:0 10px 0 #261A66;font-size:44px;font-weight:900;letter-spacing:-0.02em;">
            &#10005; SIRAM AIR
          </div>

          <!-- Center VS Badge -->
          <div style="position:absolute;top:960px;left:50%;transform:translate(-50%,-50%);background:#261A66;color:#FFFFFF;border:6px solid #FFFFFF;border-radius:999px;padding:10px 30px;box-shadow:0 8px 0 #EF5F18;font-size:38px;font-weight:900;letter-spacing:0.06em;">
            VS
          </div>

          <!-- Bottom Half Label (2 words) -->
          <div style="position:absolute;top:1362px;left:46px;background:#261A66;color:#FFFFFF;border:5px solid #FFFFFF;border-radius:18px;padding:14px 28px;box-shadow:0 10px 0 #EF5F18;font-size:44px;font-weight:900;letter-spacing:-0.02em;">
            &#10003; TUTUP RAPAT
          </div>
        \`;
        resolve(true);
      })`
    });
    await sleep(150);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(snap1.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '03_Thumbnail_Opsi_1_Jangan_Siram_Air.png'), buf1);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_1.png'), buf1);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_1.png'), buf1);
    console.log('Generated Opsi 1 (Classic Top-Bottom Comparison)');

    // Remove comparison canvas before single-scene Opsi 2 & Opsi 3
    await send('Runtime.evaluate', {
      expression: `(() => { const c = document.getElementById('comp-canvas'); if (c) c.remove(); })()`
    });

    // =========================================================================
    // OPSI 2: FREEZE-FRAME LARANGAN ("JANGAN SIRAM AIR!"  MINIMAL TEXT)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera } = window.OPENER;
        S.camX = 7.8; S.camY = 8.6; S.camZ = 10.8;
        S.lookX = 0.25; S.lookY = 1.95; S.lookZ = -0.35;
        S.fov = 24;
        S.fireballScale = 1.32; S.flameScale = 1.32;
        S.gayungAlpha = 1; S.gayungTilt = 0.82;
        S.lidSlide = 0; S.burnerOn = 1; S.knobOff = 0;

        render(18.2);
        window.setRakaExpression('urgent_stop');
        RAKA.root.scale.setScalar(1.22);
        RAKA.bodyPivot.rotation.set(0.06, 0.18, -0.06);
        RAKA.headPivot.rotation.set(-0.06, 0.20, 0.04);
        RAKA.armL.rotation.set(-1.35, 0.15, -0.18);
        if (window._handL) window._handL.rotation.set(-1.58, 0.0, 0.0);
        RAKA.armR.rotation.set(-1.32, -0.32, 0.58);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        renderer.render(scene, camera);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#261A66" flood-opacity="0.55"/>
            </filter>
          </defs>
          <circle cx="725" cy="1115" r="102" fill="none" stroke="#EF5F18" stroke-width="18" filter="url(#sh2)"/>
          <line x1="653" y1="1043" x2="797" y2="1187" stroke="#EF5F18" stroke-width="18" stroke-linecap="round" filter="url(#sh2)"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div style="position:absolute;top:448px;left:50%;transform:translateX(-50%);background:#FFFFFF;border:6px solid #261A66;border-radius:28px;padding:22px 44px;box-shadow:0 16px 0 #261A66;text-align:center;white-space:nowrap;">
            <div style="font-size:74px;font-weight:900;line-height:1.02;color:#261A66;letter-spacing:-0.03em;">
              JANGAN
            </div>
            <div style="display:inline-block;margin-top:8px;background:#EF5F18;color:#FFFFFF;font-size:74px;font-weight:900;line-height:1.02;padding:4px 24px;border-radius:16px;letter-spacing:-0.02em;">
              SIRAM AIR!
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    const buf2 = Buffer.from(snap2.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png'), buf2);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_2.png'), buf2);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_2.png'), buf2);
    console.log('Generated Opsi 2 (Freeze-Frame Larangan)');

    // =========================================================================
    // OPSI 3: HERO SOLUSI 3 DETIK ("PADAM 3 DETIK!"  MINIMAL TEXT)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera } = window.OPENER;
        S.camX = 7.8; S.camY = 8.6; S.camZ = 10.8;
        S.lookX = 0.25; S.lookY = 1.92; S.lookZ = -0.35;
        S.fov = 24;
        S.fireballScale = 0; S.flameScale = 0.14;
        S.gayungAlpha = 0; S.lidSlide = 0.78; S.burnerOn = 0; S.knobOff = 1;

        render(46.5);
        window.setRakaExpression('urgent_stop');
        RAKA.root.scale.setScalar(1.22);
        RAKA.bodyPivot.rotation.set(0.08, 0.18, -0.05);
        RAKA.headPivot.rotation.set(-0.06, 0.22, 0.04);
        RAKA.armL.rotation.set(-1.35, 0.15, -0.18);
        if (window._handL) window._handL.rotation.set(-1.58, 0.0, 0.0);
        RAKA.armR.rotation.set(-1.24, -0.28, 0.50);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        renderer.render(scene, camera);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh3" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#261A66" flood-opacity="0.55"/>
            </filter>
          </defs>
          <path d="M 810 835 Q 845 945 775 1030" fill="none" stroke="#EF5F18" stroke-width="14" stroke-linecap="round" filter="url(#sh3)"/>
          <polygon points="755,1012 752,1062 798,1042" fill="#EF5F18"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div style="position:absolute;top:448px;left:50%;transform:translateX(-50%);background:#261A66;border:6px solid #FFFFFF;border-radius:28px;padding:22px 44px;box-shadow:0 16px 0 #EF5F18;text-align:center;white-space:nowrap;">
            <div style="font-size:74px;font-weight:900;line-height:1.02;color:#FFFFFF;letter-spacing:-0.03em;">
              PADAM
            </div>
            <div style="display:inline-block;margin-top:8px;background:#EF5F18;color:#FFFFFF;font-size:74px;font-weight:900;line-height:1.02;padding:4px 24px;border-radius:16px;letter-spacing:-0.02em;">
              3 DETIK!
            </div>
          </div>

          <div style="position:absolute;top:755px;right:64px;background:#FFFFFF;color:#261A66;border:5px solid #261A66;border-radius:18px;padding:12px 24px;box-shadow:0 10px 0 #EF5F18;font-size:32px;font-weight:900;">
            TUTUP RAPAT
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    const buf3 = Buffer.from(snap3.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png'), buf3);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_3.png'), buf3);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_3.png'), buf3);
    console.log('Generated Opsi 3 (Hero Solusi 3 Detik)');

    // Build 3-panel contact sheet via ffmpeg
    const p1 = path.join(PUBLISH_DIR, '03_Thumbnail_Opsi_1_Jangan_Siram_Air.png');
    const p2 = path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png');
    const p3 = path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png');
    for (const sheetOut of [
      path.join(VAULT_DIR, 'thumb_ep02_3_opsi_sheet.jpg'),
      path.join(OUT_DIR, 'thumb_ep02_3_opsi_sheet.jpg')
    ]) {
      fs.mkdirSync(path.dirname(sheetOut), { recursive: true });
      execFileSync('ffmpeg', [
        '-y', '-i', p1, '-i', p2, '-i', p3,
        '-filter_complex', 'hstack=inputs=3,scale=1620:-1',
        '-q:v', '2', sheetOut
      ], { stdio: 'ignore' });
      console.log('Contact sheet:', path.relative(ROOT, sheetOut));
    }
  } finally {
    try { if (ws) ws.close(); } catch {}
    chrome.kill();
    srv.close();
    await sleep(400);
    try { fs.rmSync(RENDER_TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  }
})();
