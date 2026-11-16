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

const RENDER_TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jpanik-ep02-v6-'));
const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const PORT = 9264;
const SRV_PORT = 8782;

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

    // Inject Best-Practice Thumbnail CSS + Expressive Face Canvas + 5-Finger 3D Hands + Sculpted Multi-Cone Fire Plume
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
          .th-header {
            position: absolute;
            top: 235px;
            left: 36px;
            right: 36px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 10px;
          }
          .th-stroke-title {
            font-size: 92px;
            font-weight: 800;
            letter-spacing: -0.04em;
            line-height: 0.98;
            color: #FFFFFF;
            text-transform: uppercase;
            -webkit-text-stroke: 18px #261A66;
            paint-order: stroke fill;
            filter: drop-shadow(0 12px 24px rgba(20, 14, 54, 0.36));
          }
          .th-pill-sub {
            display: inline-block;
            background: #EF5F18;
            color: #FFFFFF;
            font-size: 58px;
            font-weight: 800;
            letter-spacing: -0.025em;
            line-height: 1.05;
            padding: 12px 38px 14px;
            border-radius: 22px;
            border: 4.5px solid #FFFFFF;
            box-shadow: 0 10px 0 #261A66, 0 20px 38px rgba(20, 14, 54, 0.34);
            text-transform: uppercase;
            transform: rotate(-1.2deg);
          }
          .th-pill-sub.indigo {
            background: #261A66;
            box-shadow: 0 10px 0 #EF5F18, 0 20px 38px rgba(20, 14, 54, 0.34);
          }
          .th-vs-tag {
            position: absolute;
            display: inline-flex;
            align-items: center;
            gap: 14px;
            padding: 12px 30px;
            border-radius: 20px;
            border: 4px solid #FFFFFF;
            font-size: 38px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #FFFFFF;
            text-transform: uppercase;
          }
          .th-vs-icon {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #FFFFFF;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
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

          const lookShift = mode === 'shock_recoil' ? 6 : 0;
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
    // OPSI 1: THE STOP-REFLEX HERO (Rule-of-Thirds: Mas Raka Left Raising STOP Palm, Flaming Wok + Crossed Dipper Right)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        window.OPENER.tl.pause();
        render(18.2);

        // Camera positioned so Mas Raka stands cleanly on the LEFT, and the stove + flaming wok + blue dipper sit on the RIGHT!
        S.camX = 6.6; S.camY = 7.6; S.camZ = 9.8;
        S.lookX = -0.18; S.lookY = 1.92; S.lookZ = -1.68;
        S.fov = 23;

        // Mas Raka on LEFT of stove (x = -0.82), Wok is at x = 0.00, Dipper on RIGHT (x = 0.44)
        S.cX = -0.82; S.cZ = -1.32; S.cKneel = 0.05; S.cRotY = 0.34;
        // Use crisp multi-cone sculpted flames (flameScale = 1.65) + splatter droplets, zero giant yellow sphere blob!
        S.fireballScale = 0.0; S.flameScale = 1.65; S.splatterProg = 0.45;
        S.gayungAlpha = 1; S.gayungTilt = 0.82; S.pourAlpha = 1.0;
        S.lidSlide = 0; S.cutawayAlpha = 0; S.burnerOn = 1; S.knobOff = 0;

        render(18.2);

        gayungGroup.position.set(0.42, 2.04, -1.94);
        gayungGroup.scale.setScalar(1.38);

        window.setRakaExpression('urgent_stop');
        RAKA.root.scale.setScalar(1.18);
        RAKA.bodyPivot.rotation.set(0.08, 0.22, -0.06);
        RAKA.headPivot.rotation.set(-0.06, 0.18, 0.04);
        // Left arm raised with 5-finger STOP palm facing the viewer
        RAKA.armL.rotation.set(-1.35, 0.16, -0.18);
        if (window._handL) window._handL.rotation.set(-1.58, 0, 0);
        // Right arm pointing index finger directly at the flaming wok & dipper on the right
        RAKA.armR.rotation.set(-1.28, -0.28, 0.54);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);
        RAKA.legL.rotation.set(-0.26, 0, -0.08);
        RAKA.legR.rotation.set(0.26, 0, 0.08);

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
              <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#261A66" flood-opacity="0.60"/>
            </filter>
          </defs>
          <circle cx="\${gx}" cy="\${gy}" r="\${r}" fill="none" stroke="#EF5F18" stroke-width="16" filter="url(#sh1)"/>
          <line x1="\${gx - d}" y1="\${gy - d}" x2="\${gx + d}" y2="\${gy + d}" stroke="#EF5F18" stroke-width="16" stroke-linecap="round" filter="url(#sh1)"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header">
            <div class="th-stroke-title">WAJAN KEBAKARAN?</div>
            <div class="th-pill-sub">JANGAN SIRAM AIR!</div>
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(snap1.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '03_Thumbnail_Opsi_1_Jangan_Siram_Air.png'), buf1);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_1.png'), buf1);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_1.png'), buf1);
    console.log('Generated Opsi 1 (Stop-Reflex Hero)');

    // =========================================================================
    // OPSI 2: MACRO X-RAY CUTAWAY (Visualizing Water Sinking + 1.700x Steam Explosion Inside Pan)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        window.OPENER.tl.pause();
        render(26.5);

        // Macro Isometric Cutaway framing: Flaming Wok Cross-Section large in foreground, Mas Raka shocked in upper-left!
        S.camX = 2.55; S.camY = 3.55; S.camZ = 2.95;
        S.lookX = -0.18; S.lookY = 1.66; S.lookZ = -2.06;
        S.fov = 22;

        S.cX = -0.82; S.cZ = -1.62; S.cKneel = 0.14; S.cRotY = 0.42;
        S.cutawayAlpha = 1.0;
        S.flameScale = 1.25; S.fireballScale = 0;
        S.waterSinkProg = 0.68; S.steamCoreScale = 1.05;
        S.gayungAlpha = 1; S.gayungTilt = 0.85; S.pourAlpha = 1.0;
        S.lidSlide = 0; S.burnerOn = 1; S.knobOff = 0;

        render(26.5);

        gayungGroup.position.set(0.36, 1.98, -2.02);
        gayungGroup.scale.setScalar(1.05);

        window.setRakaExpression('shock_recoil');
        RAKA.root.scale.setScalar(1.06);
        RAKA.bodyPivot.rotation.set(-0.08, 0.25, -0.05);
        RAKA.headPivot.rotation.set(0.06, 0.22, 0.04);
        RAKA.armL.rotation.set(-1.25, 0.20, -0.18);
        if (window._handL) window._handL.rotation.set(-1.45, 0, 0);
        RAKA.armR.rotation.set(-1.32, -0.25, 0.48);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);

        renderer.render(scene, camera);

        document.getElementById('thumb-svg').innerHTML = '';
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header">
            <div class="th-stroke-title">SIRAM AIR =</div>
            <div class="th-pill-sub">MELEDAK 1.700×!</div>
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
    console.log('Generated Opsi 2 (Macro X-Ray Cutaway 1.700x)');

    // =========================================================================
    // OPSI 3: WRONG VS RIGHT COMPARISON (Top: Disiram Air Meledak vs Bottom: Ditutup Rapat Padam)
    // =========================================================================
    // 3A. Capture TOP Scene (Pouring Water -> Sculpted Tall Fire Plume + Shocked Mas Raka)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        render(18.2);
        // Framed so both Mas Raka (Left) and Wok + Dipper (Right) sit at the exact center of the 1080x960 slice!
        S.camX = 6.8; S.camY = 7.8; S.camZ = 10.0;
        S.lookX = -0.16; S.lookY = 1.90; S.lookZ = -1.68;
        S.fov = 23;
        S.cX = -0.78; S.cZ = -1.35; S.cKneel = 0.06; S.cRotY = 0.32;
        S.fireballScale = 0.0; S.flameScale = 1.72; S.splatterProg = 0.55;
        S.gayungAlpha = 1; S.gayungTilt = 0.85; S.pourAlpha = 1.0;
        S.lidSlide = 0; S.cutawayAlpha = 0; S.burnerOn = 1; S.knobOff = 0;
        render(18.2);

        gayungGroup.position.set(0.42, 2.02, -1.95);
        gayungGroup.scale.setScalar(1.35);
        window.setRakaExpression('shock_recoil');
        RAKA.root.scale.setScalar(1.16);
        RAKA.bodyPivot.rotation.set(-0.10, 0.22, -0.06);
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

    // 3B. Capture BOTTOM Scene (Sliding Pan Lid -> Fire Out + Confident Mas Raka)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, gayungGroup } = window.OPENER;
        render(52.0);
        S.camX = 6.8; S.camY = 7.8; S.camZ = 10.0;
        S.lookX = -0.16; S.lookY = 1.78; S.lookZ = -1.68;
        S.fov = 23;
        S.cX = -0.78; S.cZ = -1.35; S.cKneel = 0.04; S.cRotY = 0.32;
        S.fireballScale = 0; S.flameScale = 0.0; S.splatterProg = 0;
        S.gayungAlpha = 0; S.pourAlpha = 0;
        S.lidSlide = 0.94; S.lidRingAlpha = 0.90; S.cutawayAlpha = 0; S.burnerOn = 0; S.knobOff = 1;
        render(52.0);

        gayungGroup.scale.setScalar(1.0);
        window.setRakaExpression('confident_safe');
        RAKA.root.scale.setScalar(1.16);
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

    // 3C. Composite Top-Bottom with Top Headline + 1:1 Aspect Ratio Slices
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

        // Top Half (y=0..980): exact 1080x980 slice from y=410..1390
        ctx.drawImage(imgTop, 0, 410, 1080, 980, 0, 0, 1080, 980);

        // Bottom Half (y=980..1920): exact 1080x940 slice from y=460..1400
        ctx.drawImage(imgBot, 0, 460, 1080, 940, 0, 980, 1080, 940);

        // Subtle Top Vignette for Headline Contrast
        const grad = ctx.createLinearGradient(0, 0, 0, 390);
        grad.addColorStop(0, 'rgba(20, 14, 54, 0.36)');
        grad.addColorStop(1, 'rgba(20, 14, 54, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 390);

        // Crisp Solid Divider Line at y=980
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 973, 1080, 14);

        document.body.appendChild(comp);

        document.getElementById('thumb-svg').innerHTML = '';
        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header" style="top:208px;">
            <div class="th-stroke-title" style="font-size:86px;">WAJAN TERBAKAR?</div>
          </div>

          <!-- Top Panel Badge -->
          <div class="th-vs-tag" style="top:848px;left:44px;background:#EF5F18;box-shadow:0 12px 28px rgba(239,95,24,0.45);">
            <span class="th-vs-icon" style="color:#EF5F18;">✕</span>SIRAM AIR
          </div>

          <!-- Center VS Badge -->
          <div style="position:absolute;top:980px;left:50%;transform:translate(-50%,-50%);background:#261A66;color:#FFFFFF;border:4.5px solid #FFFFFF;border-radius:999px;padding:10px 34px;box-shadow:0 12px 28px rgba(20,14,56,0.48);font-size:36px;font-weight:800;letter-spacing:0.06em;">
            VS
          </div>

          <!-- Bottom Panel Badge -->
          <div class="th-vs-tag" style="top:1440px;left:44px;background:#261A66;box-shadow:0 12px 28px rgba(20,14,56,0.45);">
            <span class="th-vs-icon" style="color:#0FA968;">✓</span>TUTUP RAPAT
          </div>
        \`;
        resolve(true);
      })`
    });
    await sleep(150);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    const buf3 = Buffer.from(snap3.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png'), buf3);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep02_opsi_3.png'), buf3);
    safeWrite(path.join(OUT_DIR, 'thumb_ep02_opsi_3.png'), buf3);
    console.log('Generated Opsi 3 (Wrong vs Right Split Comparison)');

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
        '-filter_complex', '[0:v]scale=720:1280[c0];[1:v]scale=720:1280[c1];[2:v]scale=720:1280[c2];[c0][c1][c2]hstack=inputs=3[out]',
        '-map', '[out]', '-q:v', '2', sheetOut
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
