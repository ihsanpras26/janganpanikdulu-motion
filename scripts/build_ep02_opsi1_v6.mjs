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

const RENDER_TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jpanik-ep02-v5-'));
const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const PORT = 9261;
const SRV_PORT = 8779;

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
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
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

    // Inject EP01-grade Clean UI CSS + Expressive Face Canvas + 5-Finger 3D Hands
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.THUMB_LOCK = true;
        window.OPENER.tl.pause();

        const st = document.createElement('style');
        st.textContent = \`
          #hook-card, #step-tracker, #bento-card, #sub-wrap, #call1, #call2, #call3, #OverlaySVG, #outro-wrap {
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
          .th-header-wrap {
            position: absolute;
            top: 295px;
            left: 48px;
            right: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 14px;
          }
          .th-kicker {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: #EF5F18;
            color: #FFFFFF;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 0.05em;
            padding: 10px 30px;
            border-radius: 999px;
            border: 3px solid #FFFFFF;
            box-shadow: 0 12px 28px rgba(239, 95, 24, 0.42);
            text-transform: uppercase;
          }
          .th-kicker.indigo {
            background: #261A66;
            box-shadow: 0 12px 28px rgba(38, 26, 102, 0.38);
          }
          .th-title-card {
            background: #FFFFFF;
            border: 4px solid #261A66;
            border-radius: 32px;
            padding: 24px 46px;
            box-shadow: 0 24px 52px rgba(20, 14, 56, 0.24);
          }
          .th-title-card.dark {
            background: #261A66;
            border: 4px solid #FFFFFF;
            box-shadow: 0 24px 52px rgba(8, 6, 26, 0.46);
          }
          .th-main {
            font-size: 74px;
            font-weight: 800;
            line-height: 1.04;
            letter-spacing: -0.035em;
            color: #261A66;
            text-transform: uppercase;
          }
          .th-title-card.dark .th-main {
            color: #FFFFFF;
          }
          .th-main .hl-badge {
            display: inline-block;
            background: #EF5F18;
            color: #FFFFFF;
            padding: 2px 22px 6px;
            border-radius: 16px;
            margin-top: 8px;
          }
          .th-comp-pill {
            position: absolute;
            display: inline-flex;
            align-items: center;
            gap: 14px;
            padding: 12px 28px;
            border-radius: 20px;
            border: 3.5px solid #FFFFFF;
            font-size: 36px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #FFFFFF;
          }
          .th-comp-icon {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #FFFFFF;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
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
            ctx.moveTo(110, 158); ctx.quadraticCurveTo(158, 144, 210, 156);
            ctx.moveTo(302, 156); ctx.quadraticCurveTo(354, 144, 402, 158);
            ctx.stroke();
          }

          const lookShift = mode === 'shock_recoil' ? -7 : 0;
          [158, 354].forEach(cx => {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(cx, 230, 35, 43, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 9;
            ctx.strokeStyle = '#181E26';
            ctx.stroke();

            ctx.fillStyle = '#181E26';
            ctx.beginPath();
            ctx.arc(cx + lookShift, 232, 19, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx + lookShift - 7, 220, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + lookShift + 7, 240, 4, 0, Math.PI * 2);
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
            ctx.roundRect(204, 304, 104, 78, 32);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(218, 310, 76, 20, 7);
            ctx.fill();
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.ellipse(256, 362, 30, 14, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (mode === 'shock_recoil') {
            ctx.fillStyle = '#7F1D1D';
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.ellipse(256, 344, 40, 46, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(228, 304, 56, 16, 6);
            ctx.fill();
          } else {
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.arc(256, 322, 48, 0.16 * Math.PI, 0.84 * Math.PI);
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
    for (let _once = 0; _once < 1; _once++) {
    // OPSI 1 V6: CLEAN TRIANGLE SEPARATION
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        window.OPENER.tl.pause();
        render(18.2);

        S.camX = -4.9; S.camY = 8.4; S.camZ = 11.4;
        S.lookX = 0.14; S.lookY = 2.18; S.lookZ = -1.75;
        S.fov = 25;

        S.cX = 0.98; S.cZ = -1.35; S.cKneel = 0.10; S.cRotY = -0.36;
        S.fireballScale = 1.05; S.flameScale = 1.24; S.splatterProg = 0.48;
        S.gayungAlpha = 1; S.gayungTilt = 0.72; S.pourAlpha = 0;
        S.lidSlide = 0; S.cutawayAlpha = 0; S.burnerOn = 1; S.knobOff = 0;

        render(18.2);

        // Gayung biru di kiri atas meja (latar dinding krem bersih, terpisah dari semburan api)
        gayungGroup.position.set(-0.78, 2.28, -2.25);
        gayungGroup.rotation.set(0.10, 0.30, -0.72);
        gayungGroup.scale.setScalar(1.45);

        window.setRakaExpression('shock_recoil');
        RAKA.root.scale.setScalar(1.16);
        RAKA.bodyPivot.rotation.set(-0.14, -0.26, 0.12);
        RAKA.headPivot.rotation.set(0.05, -0.24, -0.05);
        RAKA.armL.rotation.set(-1.12, 0.48, 0.26);
        if (window._handL) window._handL.rotation.set(-1.35, 0.1, 0);
        RAKA.armR.rotation.set(-1.32, -0.35, 0.46);
        if (window._handR) window._handR.rotation.set(-0.85, 0, -0.20);
        RAKA.legL.rotation.set(0.28, 0, -0.08);
        RAKA.legR.rotation.set(-0.32, 0, 0.10);

        renderer.render(scene, camera);

        const v = gayungGroup.position.clone();
        gayungGroup.parent.localToWorld(v);
        v.project(camera);
        const gx = Math.round((v.x * 0.5 + 0.5) * 1080);
        const gy = Math.round((-v.y * 0.5 + 0.5) * 1920);
        const r = 102;
        const d = Math.round(r * 0.707);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh1" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#140E38" flood-opacity="0.38"/>
            </filter>
          </defs>
          <g filter="url(#sh1)">
            <circle cx="\${gx}" cy="\${gy}" r="\${r}" fill="none" stroke="#FFFFFF" stroke-width="26"/>
            <line x1="\${gx - d}" y1="\${gy - d}" x2="\${gx + d}" y2="\${gy + d}" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round"/>
            <circle cx="\${gx}" cy="\${gy}" r="\${r}" fill="none" stroke="#EF5F18" stroke-width="15"/>
            <line x1="\${gx - d}" y1="\${gy - d}" x2="\${gx + d}" y2="\${gy + d}" stroke="#EF5F18" stroke-width="15" stroke-linecap="round"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">&#x1F525; WAJAN TERBAKAR?</div>
            <div class="th-title-card">
              <div class="th-main">JANGAN SIRAM<br><span class="hl-badge">PAKAI AIR!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(snap1.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '03_Thumbnail_Opsi_1_v6_Separated.png'), buf1);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_1_v6.png'), buf1);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_1_v6.png'), buf1);
    console.log('Saved new file: Publish_Kit_EP02/03_Thumbnail_Opsi_1_v6_Separated.png');
    break; // Hentikan setelah Opsi 1 v6 selesai agar tidak menyentuh file lain

    }
    /*// OPSI 2: CLASSIC TOP-BOTTOM COMPARISON (100% ZERO STRETCH 1:1 PIXEL RATIO)
    // =========================================================================
    // 2A. Render TOP Scene (Pouring Water -> Giant Fireball + Shocked Mas Raka)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        render(18.2);
        S.camX = 7.4; S.camY = 8.4; S.camZ = 10.6;
        S.lookX = 0.05; S.lookY = 2.08; S.lookZ = -1.65;
        S.fov = 24;
        S.cX = -0.58; S.cZ = -1.35; S.cKneel = 0.05; S.cRotY = 0.28;
        S.fireballScale = 1.28; S.flameScale = 1.28; S.splatterProg = 0;
        S.gayungAlpha = 1; S.gayungTilt = 0.85; S.pourAlpha = 0.9;
        S.lidSlide = 0; S.cutawayAlpha = 0; S.burnerOn = 1; S.knobOff = 0;
        render(18.2);

        gayungGroup.position.x = 0.28;
        gayungGroup.scale.setScalar(1.32);
        window.setRakaExpression('shock_recoil');
        RAKA.root.scale.setScalar(1.18);
        RAKA.bodyPivot.rotation.set(-0.12, 0.20, -0.06);
        RAKA.headPivot.rotation.set(-0.04, 0.24, 0.04);
        RAKA.armL.rotation.set(-1.35, 0.18, -0.22);
        if (window._handL) window._handL.rotation.set(-1.58, 0, 0);
        RAKA.armR.rotation.set(-1.28, -0.28, 0.52);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        renderer.render(scene, camera);

        document.getElementById('thumb-svg').innerHTML = '';
        document.getElementById('thumb-overlay').innerHTML = '';
      })()`
    });
    await sleep(120);
    const topRaw = await send('Page.captureScreenshot', { format: 'png' });

    // 2B. Render BOTTOM Scene (Sliding Pan Lid -> Fire Out + Calm Mas Raka)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        render(52.0);
        S.camX = 7.4; S.camY = 8.4; S.camZ = 10.6;
        S.lookX = 0.05; S.lookY = 1.88; S.lookZ = -1.65;
        S.fov = 24;
        S.cX = -0.58; S.cZ = -1.35; S.cKneel = 0.04; S.cRotY = 0.28;
        S.fireballScale = 0; S.flameScale = 0.0; S.splatterProg = 0;
        S.gayungAlpha = 0; S.pourAlpha = 0;
        S.lidSlide = 0.92; S.lidRingAlpha = 0.85; S.cutawayAlpha = 0; S.burnerOn = 0; S.knobOff = 1;
        render(52.0);

        gayungGroup.scale.setScalar(1.0);
        window.setRakaExpression('confident_safe');
        RAKA.root.scale.setScalar(1.18);
        RAKA.bodyPivot.rotation.set(0.06, 0.22, -0.04);
        RAKA.headPivot.rotation.set(-0.04, 0.18, 0.02);
        RAKA.armL.rotation.set(-0.55, 0.15, -0.12);
        if (window._handL) window._handL.rotation.set(-0.45, 0, 0);
        RAKA.armR.rotation.set(-1.18, -0.25, 0.45);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        renderer.render(scene, camera);
      })()`
    });
    await sleep(120);
    const botRaw = await send('Page.captureScreenshot', { format: 'png' });

    // 2C. Composite Top-Bottom with Strict 1:1 Source-to-Destination Pixel Dimensions (1080x960 -> 1080x960, ZERO STRETCH!)
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `new Promise(async (resolve) => {
        const loadImg = (b64) => new Promise(res => {
          const im = new Image();
          im.onload = () => res(im);
          im.src = 'data:image/png;base64,' + b64;
        });
        const [imgTop, imgBot] = await Promise.all([
          loadImg(${JSON.stringify(topRaw.result.data)}),
          loadImg(${JSON.stringify(botRaw.result.data)})
        ]);

        const comp = document.createElement('canvas');
        comp.id = 'comp-canvas';
        comp.width = 1080;
        comp.height = 1920;
        comp.style.cssText = 'position:fixed;inset:0;width:1080px;height:1920px;z-index:99980;';
        const ctx = comp.getContext('2d');

        // Top Half: exact 1080x960 slice from y=460..1420 -> drawn at y=0..960 (1:1 aspect ratio, zero distortion)
        ctx.drawImage(imgTop, 0, 460, 1080, 960, 0, 0, 1080, 960);

        // Bottom Half: exact 1080x960 slice from y=480..1440 -> drawn at y=960..1920 (1:1 aspect ratio, zero distortion)
        ctx.drawImage(imgBot, 0, 480, 1080, 960, 0, 960, 1080, 960);

        // Clean White Divider Line at y=960
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 954, 1080, 12);

        document.body.appendChild(comp);

        document.getElementById('thumb-svg').innerHTML = '';
        document.getElementById('thumb-overlay').innerHTML = \`
          <!-- Top Panel Pill (High-Contrast White Circle Icon + Solid Orange Surface) -->
          <div class="th-comp-pill" style="top:438px;left:48px;background:#EF5F18;box-shadow:0 14px 32px rgba(239,95,24,0.45);">
            <span class="th-comp-icon" style="color:#EF5F18;">✕</span>DISIRAM AIR
          </div>

          <!-- Center VS Pill -->
          <div style="position:absolute;top:960px;left:50%;transform:translate(-50%,-50%);background:#261A66;color:#FFFFFF;border:4px solid #FFFFFF;border-radius:999px;padding:10px 34px;box-shadow:0 12px 28px rgba(20,14,56,0.45);font-size:34px;font-weight:800;letter-spacing:0.06em;">
            VS
          </div>

          <!-- Bottom Panel Pill (High-Contrast White Circle Icon + Solid Indigo Surface) -->
          <div class="th-comp-pill" style="top:1408px;left:48px;background:#261A66;box-shadow:0 14px 32px rgba(20,14,56,0.42);">
            <span class="th-comp-icon" style="color:#0FA968;">✓</span>DITUTUP RAPAT
          </div>
        \`;
        resolve(true);
      })`
    });
    await sleep(150);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    const buf2 = Buffer.from(snap2.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png'), buf2);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_2.png'), buf2);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_2.png'), buf2);
    console.log('Generated Opsi 2 (Clean Top-Bottom Comparison, Zero Stretch)');

    await send('Runtime.evaluate', {
      expression: `(() => { const c = document.getElementById('comp-canvas'); if (c) c.remove(); })()`
    });

    // =========================================================================
    // OPSI 3: THE 3-SECOND HERO ACTION (Close-Up Sliding Lid over Flaming Wok)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, panLidGroup } = window.OPENER;
        render(49.5);

        S.camX = 6.8; S.camY = 8.2; S.camZ = 10.2;
        S.lookX = 0.08; S.lookY = 2.02; S.lookZ = -1.65;
        S.fov = 24;

        S.cX = -0.64; S.cZ = -1.35; S.cKneel = 0.08; S.cRotY = 0.34;
        S.fireballScale = 0; S.flameScale = 0.52; S.splatterProg = 0;
        S.gayungAlpha = 0; S.pourAlpha = 0;
        S.lidSlide = 0.65; S.lidRingAlpha = 0.92; S.cutawayAlpha = 0; S.burnerOn = 0; S.knobOff = 1;

        render(49.5);

        window.setRakaExpression('urgent_stop');
        RAKA.root.scale.setScalar(1.18);
        RAKA.bodyPivot.rotation.set(0.10, 0.22, -0.05);
        RAKA.headPivot.rotation.set(-0.06, 0.20, 0.04);
        // Left hand raised in calm authority, right hand sliding the lid over the wok
        RAKA.armL.rotation.set(-1.25, 0.18, -0.18);
        if (window._handL) window._handL.rotation.set(-1.45, 0, 0);
        RAKA.armR.rotation.set(-1.18, -0.22, 0.42);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);

        renderer.render(scene, camera);

        const v = panLidGroup.position.clone();
        panLidGroup.parent.localToWorld(v);
        v.project(camera);
        const lx = Math.round((v.x * 0.5 + 0.5) * 1080);
        const ly = Math.round((-v.y * 0.5 + 0.5) * 1920);

        // Curved arrow swooping in from the TOP-RIGHT so it never touches Mas Raka's face
        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh3" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#261A66" flood-opacity="0.55"/>
            </filter>
          </defs>
          <path d="M \${lx + 195} \${ly - 175} Q \${lx + 175} \${ly - 55} \${lx + 45} \${ly - 25}" fill="none" stroke="#EF5F18" stroke-width="15" stroke-linecap="round" filter="url(#sh3)"/>
          <polygon points="\${lx + 22},\${ly - 20} \${lx + 65},\${ly - 52} \${lx + 58},\${ly + 2}" fill="#EF5F18"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker indigo">🛡️ SOLUSI PALING AMAN</div>
            <div class="th-title-card dark">
              <div class="th-main">TUTUP RAPAT<br><span class="hl-badge">PADAM 3 DETIK!</span></div>
            </div>
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
    console.log('Generated Opsi 3 (3-Second Hero Action)');

    // Build 3-panel contact sheet via ffmpeg matching EP01 layout
    const p1 = path.join(PUBLISH_DIR, '03_Thumbnail_Opsi_1_v6_Separated.png');
    const p2 = path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png');
    const p3 = path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png');
    for (const sheetOut of [
      path.join(VAULT_DIR, 'thumb_ep02_3_opsi_sheet.jpg'),
      path.join(OUT_DIR, 'thumb_ep02_3_opsi_sheet.jpg')
    ]) {
      fs.mkdirSync(path.dirname(sheetOut), { recursive: true });
      execFileSync('ffmpeg', [
        '-y', '-i', p1, '-i', p2, '-i', p3,
        '-filter_complex', '[0:v]scale=720:1280[c0];[1:v]scale=720:1280[c1];[2:v]scale=720:1280[c2];[c0][c1][c2]hstack=inputs=3[out]',
        '-map', '[out]', '-q:v', '2', sheetOut
      ], { stdio: 'ignore' });
      console.log('Contact sheet:', path.relative(ROOT, sheetOut));
    }
  */
  } finally {
    try { if (ws) ws.close(); } catch {}
    chrome.kill();
    srv.close();
    await sleep(400);
    try { fs.rmSync(RENDER_TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  }
})();
