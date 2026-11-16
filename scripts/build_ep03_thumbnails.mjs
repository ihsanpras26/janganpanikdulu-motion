import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'previews_ep03');
const VAULT_DIR = path.join(ROOT, 'vault', 'assets');
const PUBLISH_DIR = path.join(ROOT, 'Publish_Kit_EP03');

const RENDER_TMP = path.join(ROOT, '.render_tmp_thumb_ep03');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9274;
const SRV_PORT = 8784;

let chromeBin = 'chrome';
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
      const rel = urlPath === '/' ? '/ep03.html' : urlPath;
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
    `http://127.0.0.1:${SRV_PORT}/ep03.html?clean=1`
  ], { stdio: 'ignore', env: CHILD_ENV });

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

    for (let i = 0; i < 45; i++) {
      const r = await send('Runtime.evaluate', {
        expression: 'Boolean(window.OPENER && window.OPENER.ready && document.fonts.status === "loaded")',
        returnByValue: true
      });
      if (r?.result?.result?.value) break;
      await sleep(200);
    }
    await sleep(250);

    // Inject EP01/EP02 Thumbnail UI CSS + Expressive Face Canvas + 3D 5-Finger Left STOP Hand
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.THUMB_LOCK = true;
        window.OPENER.tl.pause();

        const st = document.createElement('style');
        st.textContent = \`
          #hook-card, #step-tracker, #sub-wrap, #call1, #call2, #call3, #call4, #OverlaySVG, #outro-wipe, #outro-ui {
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
            top: 158px;
            left: 44px;
            right: 44px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
          }
          .th-kicker {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: #EF5F18;
            color: #FFFFFF;
            font-size: 29px;
            font-weight: 800;
            letter-spacing: 0.04em;
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
            padding: 24px 44px;
            box-shadow: 0 24px 52px rgba(20, 14, 56, 0.24);
          }
          .th-title-card.dark {
            background: #261A66;
            border: 4px solid #FFFFFF;
            box-shadow: 0 24px 52px rgba(8, 6, 26, 0.48);
          }
          .th-main {
            font-size: 72px;
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
            padding: 4px 24px 8px;
            border-radius: 16px;
            margin-top: 8px;
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
          } else {
            ctx.beginPath();
            ctx.moveTo(106, 158); ctx.quadraticCurveTo(158, 122, 210, 152);
            ctx.moveTo(302, 152); ctx.quadraticCurveTo(354, 122, 406, 158);
            ctx.stroke();
          }

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
            ctx.arc(cx, 232, 19, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx - 7, 220, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 7, 240, 4, 0, Math.PI * 2);
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
          } else {
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
          }

          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(444, 126);
          ctx.bezierCurveTo(470, 166, 468, 198, 444, 198);
          ctx.bezierCurveTo(420, 198, 418, 166, 444, 126);
          ctx.fill(); ctx.stroke();

          const oldTex = faceMesh.material.map;
          const newTex = new oldTex.constructor(cv);
          newTex.colorSpace = oldTex.colorSpace;
          newTex.needsUpdate = true;
          faceMesh.material.map = newTex;
          faceMesh.material.needsUpdate = true;
        };

        window.setLeftStopHand = (enabled) => {
          const armL = window.OPENER.RAKA.armL;
          const sphereHand = armL.handPivot.children[0];
          const defaultFingers = armL.fingers;
          if (!window._leftStopPalm) {
            const skinMat = sphereHand.material;
            const outlineMat = sphereHand.children[0]?.material;
            const BoxGeo = defaultFingers.geometry.constructor;
            const hg = armL.handPivot.clone();
            hg.clear();
            hg.position.set(0, 0, 0);

            const addOut = (m, sc = 1.08) => {
              if (outlineMat) {
                const o = new m.constructor(m.geometry, outlineMat);
                o.scale.setScalar(sc);
                m.add(o);
              }
              return m;
            };

            const palm = addOut(new sphereHand.constructor(new BoxGeo(0.24, 0.22, 0.11, 4, 0.045), skinMat));
            palm.position.set(0, -0.04, 0);
            hg.add(palm);

            [-0.082, -0.027, 0.027, 0.082].forEach((fx, i) => {
              const len = (i === 1 || i === 2) ? 0.175 : 0.15;
              const f = addOut(new sphereHand.constructor(new BoxGeo(0.052, len, 0.072, 3, 0.024), skinMat));
              f.position.set(fx, -0.19 - (len - 0.15) * 0.5, 0);
              hg.add(f);
            });
            const thumb = addOut(new sphereHand.constructor(new BoxGeo(0.062, 0.135, 0.072, 3, 0.025), skinMat));
            thumb.position.set(-0.145, -0.05, 0.015);
            thumb.rotation.z = -0.58;
            hg.add(thumb);

            armL.handPivot.add(hg);
            window._leftStopPalm = hg;
          }
          sphereHand.visible = !enabled;
          defaultFingers.visible = !enabled;
          window._leftStopPalm.visible = enabled;
        };
      })()`,
      returnByValue: true
    });

    // =========================================================================
    // OPSI 1: THE PANIC STOP HERO (Kicker + White Title Card + Stop Palm + Glowing 300C+ Rotor + Crossed Ignition Key)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, mioGroup } = window.OPENER;
        window.OPENER.tl.pause();
        render(6.2);

        // Framed higher (lookY: 2.02) & pulled back slightly so Mas Raka's entire helmet & face sit cleanly BELOW the Title Card!
        S.camX = -6.6; S.camY = 4.65; S.camZ = 8.4;
        S.lookX = -0.10; S.lookY = 2.04; S.lookZ = 0.20;
        S.fov = 24;

        S.mioX = 0.0; S.mioZ = 0.0; S.mioYaw = 0.06; S.mioRoll = -0.04; S.mioPitch = -0.02;
        S.roadSpeed = 1.65;
        S.rotorHeat = 1.0;
        S.caliperCutaway = 0.0;
        S.vaporBubbles = 0.0;
        S.speedVectorsAlpha = 1.0;
        S.keyOff = 1.0; S.keyRingAlpha = 0.0;
        S.leverRightPull = 0.92; S.leverLeftPull = 0.0;
        S.rakaStand = 0;

        render(6.2);

        window.setRakaExpression('shock_recoil');
        window.setLeftStopHand(true);

        RAKA.bodyPivot.rotation.set(0.06, -0.16, 0.03);
        RAKA.headPivot.rotation.set(-0.08, -0.34, 0.04);
        // Left arm angled toward -X camera so 5-finger STOP palm faces the viewer cleanly
        RAKA.armL.root.rotation.set(-1.18, -0.38, 0.16);
        RAKA.armL.forearmPivot.rotation.set(-0.36, 0, 0);
        RAKA.armL.handPivot.rotation.set(-1.38, -0.45, 0.12);

        renderer.render(scene, camera);

        // Project ignition switch position for Prohibition Circle + Slash (No-Symbol)
        const v = new mioGroup.position.constructor(-0.13 * 1.38, 0.84 * 1.38, 0.34 * 1.38);
        mioGroup.parent.localToWorld(v);
        v.project(camera);
        const kx = Math.round((v.x * 0.5 + 0.5) * 1080);
        const ky = Math.round((-v.y * 0.5 + 0.5) * 1920);
        const r = 68;
        const d = Math.round(r * 0.707);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh1" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#140E38" flood-opacity="0.45"/>
            </filter>
          </defs>
          <g filter="url(#sh1)">
            <circle cx="\${kx}" cy="\${ky}" r="\${r}" fill="none" stroke="#FFFFFF" stroke-width="22"/>
            <line x1="\${kx - d}" y1="\${ky - d}" x2="\${kx + d}" y2="\${ky + d}" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
            <circle cx="\${kx}" cy="\${ky}" r="\${r}" fill="none" stroke="#EF5F18" stroke-width="13"/>
            <line x1="\${kx - d}" y1="\${ky - d}" x2="\${kx + d}" y2="\${ky + d}" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">&#x26A0;&#xFE0F; REM MATIC BLONG?</div>
            <div class="th-title-card">
              <div class="th-main">JANGAN MATIKAN<br><span class="hl-badge">MESIN!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(snap1.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_1_Jangan_Matikan_Mesin.png'), buf1);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep03_opsi_1.png'), buf1);
    safeWrite(path.join(OUT_DIR, 'thumb_ep03_opsi_1.png'), buf1);
    console.log('Generated EP03 Thumbnail Opsi 1');

    // =========================================================================
    // OPSI 2: CLEAN WHITE CARD HERO + GLOWING 300C+ CALIPER CUTAWAY FOCUS
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, caliperGroup } = window.OPENER;
        window.OPENER.tl.pause();
        render(24.5);

        // Balanced medium-wide 3/4 hero shot: generous breathing room under the white title card + glowing 300C+ caliper cutaway clearly framed!
        S.camX = -6.30; S.camY = 4.00; S.camZ = 7.95;
        S.lookX = -0.10; S.lookY = 1.98; S.lookZ = 0.25;
        S.fov = 23.5;

        S.mioX = 0.0; S.mioZ = 0.0; S.mioYaw = 0.0; S.mioRoll = 0.0; S.mioPitch = 0.0;
        S.roadSpeed = 1.40;
        S.rotorHeat = 1.0;
        S.caliperCutaway = 1.0;
        S.vaporBubbles = 1.0;
        S.speedVectorsAlpha = 0.90;
        S.leverRightPull = 1.0; S.leverLeftPull = 0.0;
        S.keyOff = 0.0;
        S.rakaStand = 0;

        render(24.5);

        window.setRakaExpression('urgent_stop');
        window.setLeftStopHand(true);

        RAKA.bodyPivot.rotation.set(0.10, -0.12, 0.02);
        RAKA.headPivot.rotation.set(0.02, -0.34, 0.04);
        RAKA.armL.root.rotation.set(-1.18, -0.38, 0.16);
        RAKA.armL.forearmPivot.rotation.set(-0.36, 0, 0);
        RAKA.armL.handPivot.rotation.set(-1.38, -0.45, 0.12);

        renderer.render(scene, camera);

        const v = caliperGroup.position.clone();
        caliperGroup.parent.localToWorld(v);
        v.project(camera);
        const cx = Math.round((v.x * 0.5 + 0.5) * 1080);
        const cy = Math.round((-v.y * 0.5 + 0.5) * 1920);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.50"/>
            </filter>
          </defs>
          <g filter="url(#sh2)">
            <circle cx="\${cx}" cy="\${cy}" r="102" fill="none" stroke="#FFFFFF" stroke-width="18"/>
            <circle cx="\${cx}" cy="\${cy}" r="102" fill="none" stroke="#EF5F18" stroke-width="11"/>
            <path d="M \${cx - 210} \${cy - 180} Q \${cx - 190} \${cy - 55} \${cx - 115} \${cy - 28}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
            <path d="M \${cx - 210} \${cy - 180} Q \${cx - 190} \${cy - 55} \${cx - 115} \${cy - 28}" fill="none" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
            <polygon points="\${cx - 88},\${cy - 18} \${cx - 134},\${cy - 52} \${cx - 124},\${cy + 6}" fill="#EF5F18" stroke="#FFFFFF" stroke-width="4"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap" style="top:150px;">
            <div class="th-title-card">
              <div class="th-main" style="font-size:66px;">REM MATIC BLONG?<br><span class="hl-badge" style="font-size:52px;">JANGAN MATIKAN MESIN!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    const buf2 = Buffer.from(snap2.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_2_Cakram_Membara_Vapor_Lock.png'), buf2);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep03_opsi_2.png'), buf2);
    safeWrite(path.join(OUT_DIR, 'thumb_ep03_opsi_2.png'), buf2);
    console.log('Generated EP03 Thumbnail Opsi 2');

    // =========================================================================
    // OPSI 3: DARK INDIGO HERO + CVT CLUTCH CUTAWAY + ENGINE BRAKE LOST ACTION
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, cvtGroup } = window.OPENER;
        window.OPENER.tl.pause();
        render(39.8);

        // Centered slightly further back inside guardrail so the ENTIRE Red Mio Smile + open CVT clutch cutaway + 5-finger STOP palm fit with zero edge cropping!
        S.camX = 3.55; S.camY = 4.55; S.camZ = 8.15;
        S.lookX = -0.08; S.lookY = 2.08; S.lookZ = -0.05;
        S.fov = 24.5;

        S.mioX = 0.15; S.mioZ = 0.0; S.mioYaw = -0.22; S.mioRoll = 0.04; S.mioPitch = 0.0;
        S.roadSpeed = 2.05;
        S.cvtCutaway = 1.0;
        S.clutchDetach = 1.0;
        S.cvtRingAlpha = 1.0;
        S.cvtRingSafe = 0.0;
        S.rotorHeat = 0.85;
        S.keyOff = 1.0;
        S.speedVectorsAlpha = 1.0;
        S.rakaStand = 0;

        render(39.8);

        window.setRakaExpression('shock_recoil');
        window.setLeftStopHand(true);

        RAKA.bodyPivot.rotation.set(0.08, 0.14, -0.04);
        RAKA.headPivot.rotation.set(-0.06, 0.24, -0.04);
        RAKA.armL.root.rotation.set(-1.32, 0.18, 0.22);
        RAKA.armL.forearmPivot.rotation.set(-0.30, 0, 0);
        RAKA.armL.handPivot.rotation.set(-1.42, -0.15, 0.0);

        renderer.render(scene, camera);

        const v = new cvtGroup.position.constructor(0.05, 0, -0.19);
        cvtGroup.localToWorld(v);
        v.project(camera);
        const vx = Math.round((v.x * 0.5 + 0.5) * 1080);
        const vy = Math.round((-v.y * 0.5 + 0.5) * 1920);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh3" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.52"/>
            </filter>
          </defs>
          <g filter="url(#sh3)">
            <path d="M \${vx + 170} \${vy - 175} Q \${vx + 170} \${vy - 55} \${vx + 96} \${vy - 22}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
            <path d="M \${vx + 170} \${vy - 175} Q \${vx + 170} \${vy - 55} \${vx + 96} \${vy - 22}" fill="none" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
            <polygon points="\${vx + 72},\${vy - 16} \${vx + 118},\${vy - 46} \${vx + 108},\${vy + 8}" fill="#EF5F18" stroke="#FFFFFF" stroke-width="4"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker indigo">&#x1F6AB; REFLEKS PALING FATAL</div>
            <div class="th-title-card dark">
              <div class="th-main" style="font-size:66px;">REM MATIC BLONG?<br><span class="hl-badge" style="font-size:50px;">JANGAN MATIKAN MESIN!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(150);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    const buf3 = Buffer.from(snap3.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '06_Thumbnail_Opsi_3_Bahaya_Kopling_CVT_Lepas.png'), buf3);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep03_opsi_3.png'), buf3);
    safeWrite(path.join(OUT_DIR, 'thumb_ep03_opsi_3.png'), buf3);
    console.log('Generated EP03 Thumbnail Opsi 3');

    // Stitch 3-up horizontal contact sheet via ffmpeg
    const p1 = path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_1_Jangan_Matikan_Mesin.png');
    const p2 = path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_2_Cakram_Membara_Vapor_Lock.png');
    const p3 = path.join(PUBLISH_DIR, '06_Thumbnail_Opsi_3_Bahaya_Kopling_CVT_Lepas.png');
    for (const sheetOut of [
      path.join(PUBLISH_DIR, 'thumb_ep03_3_opsi_sheet.jpg'),
      path.join(VAULT_DIR, 'thumb_ep03_3_opsi_sheet.jpg'),
      path.join(OUT_DIR, 'thumb_ep03_3_opsi_sheet.jpg')
    ]) {
      fs.mkdirSync(path.dirname(sheetOut), { recursive: true });
      execFileSync('ffmpeg', [
        '-y', '-i', p1, '-i', p2, '-i', p3,
        '-filter_complex', '[0:v]scale=720:1280[c0];[1:v]scale=720:1280[c1];[2:v]scale=720:1280[c2];[c0][c1][c2]hstack=inputs=3[out]',
        '-map', '[out]', '-q:v', '2', sheetOut
      ], { stdio: 'ignore', env: CHILD_ENV });
      console.log('Built contact sheet:', path.relative(ROOT, sheetOut));
    }
  } finally {
    try { if (ws) ws.close(); } catch {}
    chrome.kill();
    srv.close();
    await sleep(400);
    try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
  }
})();
