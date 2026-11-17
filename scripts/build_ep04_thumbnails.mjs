import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'previews_ep04');
const VAULT_DIR = path.join(ROOT, 'vault', 'assets');
const PUBLISH_DIR = path.join(ROOT, 'Publish_Kit_EP04');

// Isolate ALL temp files on Disk D:
const RENDER_TMP = path.join(ROOT, '.render_tmp_thumb_ep04');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9284;
const SRV_PORT = 8788;

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
      const rel = urlPath === '/' ? '/ep04.html' : urlPath;
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
    `http://127.0.0.1:${SRV_PORT}/ep04.html?clean=1`
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

    // Inject @janganpanikdulu Thumbnail UI CSS + Expressive Face Canvas + 3D 5-Finger Left STOP Hand
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
            top: 292px;
            left: 48px;
            right: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 8px;
          }
          .th-kicker {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: #EF5F18;
            color: #FFFFFF;
            font-size: 25px;
            font-weight: 800;
            letter-spacing: 0.04em;
            padding: 8px 26px;
            border-radius: 999px;
            border: 3px solid #FFFFFF;
            box-shadow: 0 10px 24px rgba(239, 95, 24, 0.42);
            text-transform: uppercase;
          }
          .th-kicker.indigo {
            background: #261A66;
            box-shadow: 0 10px 24px rgba(38, 26, 102, 0.38);
          }
          .th-title-card {
            background: #FFFFFF;
            border: 4px solid #261A66;
            border-radius: 30px;
            padding: 18px 38px 20px;
            box-shadow: 0 22px 48px rgba(20, 14, 56, 0.24);
          }
          .th-title-card.dark {
            background: #261A66;
            border: 4px solid #FFFFFF;
            box-shadow: 0 22px 48px rgba(8, 6, 26, 0.48);
          }
          .th-main {
            font-size: 66px;
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
            padding: 4px 22px 7px;
            border-radius: 14px;
            margin-top: 6px;
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

        window.setRakaThumbExpression = (mode) => {
          const raka = window.OPENER.RAKA;
          const faceMesh = raka.headPivot.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
          if (!faceMesh) return;

          const cv = document.createElement('canvas');
          cv.width = 512; cv.height = 512;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, 512, 512);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Eyebrows
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 22;
          ctx.beginPath();
          if (mode === 'pain_shock') {
            ctx.moveTo(104, 138); ctx.lineTo(208, 178);
            ctx.moveTo(408, 138); ctx.lineTo(304, 178);
          } else {
            ctx.moveTo(106, 158); ctx.quadraticCurveTo(158, 120, 210, 152);
            ctx.moveTo(302, 152); ctx.quadraticCurveTo(354, 120, 406, 158);
          }
          ctx.stroke();

          // Wide alarmed eyes with crisp highlights
          [158, 354].forEach(cx => {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(cx, 232, 35, 43, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 9;
            ctx.strokeStyle = '#181E26';
            ctx.stroke();

            ctx.fillStyle = '#181E26';
            ctx.beginPath();
            ctx.arc(cx, 236, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx - 7, 224, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 7, 244, 4, 0, Math.PI * 2);
            ctx.fill();
          });

          // Nose
          ctx.strokeStyle = 'rgba(145, 92, 58, 0.85)';
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(256, 218); ctx.lineTo(246, 270); ctx.lineTo(268, 274);
          ctx.stroke();

          // Mouth
          if (mode === 'pain_shock') {
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.roundRect(194, 326, 124, 54, 22);
            ctx.fill(); ctx.stroke();
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(206, 352);
            ctx.bezierCurveTo(234, 340, 278, 364, 306, 350);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#7F1D1D';
            ctx.strokeStyle = '#181E26';
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.ellipse(256, 344, 40, 46, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(226, 304, 60, 18, 7);
            ctx.fill();
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.ellipse(256, 370, 26, 12, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Vivid comic sweat drop
          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(444, 134);
          ctx.bezierCurveTo(470, 174, 468, 206, 444, 206);
          ctx.bezierCurveTo(420, 206, 418, 174, 444, 134);
          ctx.fill(); ctx.stroke();

          const oldTex = faceMesh.material.map;
          const newTex = new oldTex.constructor(cv);
          newTex.colorSpace = oldTex.colorSpace;
          newTex.needsUpdate = true;
          faceMesh.material.map = newTex;
          faceMesh.material.needsUpdate = true;
        };

        window.setLeftStopHand = (enabled) => {
          const { RAKA, handTieProp } = window.OPENER;
          const armL = RAKA.armL;
          const sphereHand = armL.handPivot.children[0];
          if (!window._leftStopPalm) {
            const skinMat = sphereHand.material;
            const outlineMat = sphereHand.children[0]?.material;
            const BoxGeo = handTieProp.geometry.constructor;
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
          window._leftStopPalm.visible = enabled;
        };
      })()`,
      returnByValue: true
    });

    // =========================================================================
    // OPSI 1: THE PANIC STOP HERO — "DIGIGIT ULAR? JANGAN DIIKAT KENCANG!" + 5-Finger STOP Palm + Red Tourniquet Prohibition (X) + Detailed Viper
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, snakeGroup, SNAKE_RIG } = window.OPENER;
        window.OPENER.tl.pause();
        render(5.2);

        S.stageIdx = 0;
        S.camX = -2.65; S.camY = 2.08; S.camZ = 9.45;
        S.lookX = -0.22; S.lookY = 1.44; S.lookZ = 0.15;
        S.fov = 25.5;

        S.rakaPose = 0;
        S.rakaLegStraight = 0;
        S.rakaReachTie = 0.0;
        S.rakaHoldPhone = 0;
        S.handTieVis = 0;
        S.legTieVis = 1;
        S.tieDangerGlow = 1.0;
        S.splintVis = 0;
        S.shoeOffProg = 0;
        S.footRestVis = 0;
        S.biteFlashAlpha = 0;
        S.snakeStrikeProg = 0.0;
        S.snakeJawOpen = 0.65;
        S.snakeZOff = 0.0;

        render(5.2);

        // Pose Detailed Pit Viper safely inside lower-right of 4:5/3:4 safe zone with zero tail cropping
        snakeGroup.position.set(0.06, 0.0, 0.42);
        snakeGroup.scale.setScalar(1.06);
        snakeGroup.rotation.y = 0.62;
        SNAKE_RIG.tongueGroup.visible = true;
        SNAKE_RIG.tongueGroup.position.z = -0.195;

        window.setRakaThumbExpression('urgent_stop');
        window.setLeftStopHand(true);

        RAKA.bodyPivot.rotation.set(0.08, -0.14, 0.02);
        RAKA.headPivot.rotation.set(-0.04, -0.20, 0.02);
        // Left hand raised cleanly in foreground-right STOP palm toward camera
        RAKA.armL.root.rotation.set(-1.35, -0.22, -0.32);
        RAKA.armL.forearmPivot.rotation.set(-0.22, 0, 0);
        RAKA.armL.handPivot.rotation.set(-1.42, -0.20, 0.12);
        // Right arm bent upward-outward safely inside frame so elbow isn't clipped at left edge
        RAKA.armR.root.rotation.set(-0.42, 0.08, -0.38);
        RAKA.armR.forearmPivot.rotation.set(-0.92, 0, 0);

        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        renderer.render(scene, camera);

        const v = new RAKA.calfTourniquetR.position.constructor(0, 0, 0);
        RAKA.calfTourniquetR.localToWorld(v);
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
            <div class="th-kicker">&#x26A0;&#xFE0F; AWAS REFLEKS SALAH!</div>
            <div class="th-title-card">
              <div class="th-main" style="font-size:68px;">DIGIGIT ULAR?<br><span class="hl-badge" style="font-size:50px;">JANGAN LAKUIN INI!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(180);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(snap1.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_1_Jangan_Diikat_Kencang.png'), buf1);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep04_opsi_1.png'), buf1);
    safeWrite(path.join(OUT_DIR, 'thumb_ep04_opsi_1.png'), buf1);
    console.log('Generated EP04 Thumbnail Opsi 1');

    // =========================================================================
    // OPSI 2: DRAMATIC CONSEQUENCE HERO — Detailed Pit Viper Biting Calf + Glowing Red Tourniquet + "BISA DIAMPUTASI!"
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, RAKA, render, renderer, scene, camera, snakeGroup, SNAKE_RIG } = window.OPENER;
        window.OPENER.tl.pause();
        render(5.2);

        S.stageIdx = 0;
        S.camX = -2.62; S.camY = 2.04; S.camZ = 9.25;
        S.lookX = -0.26; S.lookY = 1.42; S.lookZ = 0.08;
        S.fov = 25.5;

        S.rakaPose = 0;
        S.rakaLegStraight = 0;
        S.rakaReachTie = 0;
        S.handTieVis = 0;
        S.legTieVis = 1;
        S.tieDangerGlow = 1.0;
        S.splintVis = 0;
        S.shoeOffProg = 0;
        S.footRestVis = 0;
        S.snakeStrikeProg = 0.92;
        S.snakeJawOpen = 1.0;
        S.biteFlashAlpha = 0.9;

        render(5.2);

        // Place detailed Pit Viper larger & dramatically striking right calf safely inside 4:5/3:4 zone
        snakeGroup.scale.setScalar(1.20);
        snakeGroup.position.set(-0.32, 0.02, 0.24);
        snakeGroup.rotation.y = 0.78;
        SNAKE_RIG.strikeNeckPivot.position.set(0.0, 0.305, 0.02);
        SNAKE_RIG.strikeNeckPivot.rotation.x = -0.12;
        SNAKE_RIG.upperHeadPivot.rotation.x = 0.32;
        SNAKE_RIG.lowerJawPivot.rotation.x = -0.82;
        SNAKE_RIG.tongueGroup.visible = false;

        window.setRakaThumbExpression('pain_shock');
        window.setLeftStopHand(false);

        RAKA.bodyPivot.rotation.set(-0.04, -0.14, 0.02);
        RAKA.headPivot.rotation.set(0.04, -0.16, -0.03);
        // Both arms flung OUTWARD cleanly inside horizontal margins!
        RAKA.armL.root.rotation.set(-0.48, -0.18, 0.56);
        RAKA.armL.forearmPivot.rotation.set(-0.98, 0, 0);
        RAKA.armR.root.rotation.set(-0.48, 0.18, -0.44);
        RAKA.armR.forearmPivot.rotation.set(-0.98, 0, 0);

        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        renderer.render(scene, camera);

        const v = new RAKA.calfTourniquetR.position.constructor(0, -0.05, 0);
        RAKA.calfTourniquetR.localToWorld(v);
        v.project(camera);
        const cx = Math.round((v.x * 0.5 + 0.5) * 1080);
        const cy = Math.round((-v.y * 0.5 + 0.5) * 1920);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.52"/>
            </filter>
          </defs>
          <g filter="url(#sh2)">
            <circle cx="\${cx}" cy="\${cy}" r="106" fill="none" stroke="#FFFFFF" stroke-width="18"/>
            <circle cx="\${cx}" cy="\${cy}" r="106" fill="none" stroke="#EF5F18" stroke-width="11"/>
            <path d="M \${cx - 210} \${cy - 185} Q \${cx - 190} \${cy - 55} \${cx - 118} \${cy - 28}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
            <path d="M \${cx - 210} \${cy - 185} Q \${cx - 190} \${cy - 55} \${cx - 118} \${cy - 28}" fill="none" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
            <polygon points="\${cx - 90},\${cy - 18} \${cx - 136},\${cy - 54} \${cx - 126},\${cy + 6}" fill="#EF5F18" stroke="#FFFFFF" stroke-width="4"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">&#x1F6A8; SALAH TANGANI = FATAL</div>
            <div class="th-title-card dark">
              <div class="th-main" style="font-size:68px;">DIGIGIT ULAR?<br><span class="hl-badge" style="font-size:48px;">AWAS DIAMPUTASI!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(180);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    const buf2 = Buffer.from(snap2.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_2_Serangan_Ular_Amputasi.png'), buf2);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep04_opsi_2.png'), buf2);
    safeWrite(path.join(OUT_DIR, 'thumb_ep04_opsi_2.png'), buf2);
    console.log('Generated EP04 Thumbnail Opsi 2');

    // =========================================================================
    // OPSI 3: ANATOMICAL X-RAY CURIOSITY GAP — "RACUN ULAR TAK LEWAT DARAH!" (3D Calf X-Ray + Tibia + Red X on Blood + Cyan Lymph Glow)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { S, render, renderer, scene, camera, lymphVesselMesh, bloodVesselMesh } = window.OPENER;
        window.OPENER.tl.pause();
        render(16.2);

        S.stageIdx = 1;
        S.camX = -0.04; S.camY = 1.54; S.camZ = 8.95;
        S.lookX = 0.0; S.lookY = 1.64; S.lookZ = 0.08;
        S.fov = 24;

        S.heartActive = 0;
        S.qMarkAlpha = 0;
        S.bloodCrossAlpha = 1.0;
        S.venomMode = 1; // Venom flowing down sub-dermal cyan lymph vessel
        S.muscleSqueeze = 0;
        S.zeroPumpAlpha = 0;
        S.strapTight = 0;
        S.ischemiaLevel = 0;
        S.necrosisLevel = 0;
        S.suctionAlpha = 0;
        S.bacteriaAlpha = 0;

        render(16.2);

        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        renderer.render(scene, camera);

        const vl = new lymphVesselMesh.position.constructor(0, 0.20, 0);
        lymphVesselMesh.localToWorld(vl);
        vl.project(camera);
        const lx = Math.round((vl.x * 0.5 + 0.5) * 1080);
        const ly = Math.round((-vl.y * 0.5 + 0.5) * 1920);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh3" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.46"/>
            </filter>
          </defs>
          <g filter="url(#sh3)">
            <circle cx="\${lx}" cy="\${ly}" r="108" fill="none" stroke="#FFFFFF" stroke-width="18"/>
            <circle cx="\${lx}" cy="\${ly}" r="108" fill="none" stroke="#EF5F18" stroke-width="11"/>
            <path d="M \${lx + 205} \${ly - 205} Q \${lx + 195} \${ly - 65} \${lx + 122} \${ly - 24}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
            <path d="M \${lx + 205} \${ly - 205} Q \${lx + 195} \${ly - 65} \${lx + 122} \${ly - 24}" fill="none" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
            <polygon points="\${lx + 94},\${ly - 16} \${lx + 140},\${ly - 50} \${lx + 130},\${ly + 8}" fill="#EF5F18" stroke="#FFFFFF" stroke-width="4"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker indigo">&#x1F52C; FAKTA MENGEJUTKAN</div>
            <div class="th-title-card">
              <div class="th-main" style="font-size:66px;">DIGIGIT ULAR?<br><span class="hl-badge" style="font-size:46px;">BUKAN LEWAT DARAH!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(180);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    const buf3 = Buffer.from(snap3.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '06_Thumbnail_Opsi_3_Fakta_Medis_XRay.png'), buf3);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep04_opsi_3.png'), buf3);
    safeWrite(path.join(OUT_DIR, 'thumb_ep04_opsi_3.png'), buf3);
    console.log('Generated EP04 Thumbnail Opsi 3');

    // Stitch 3-up horizontal contact sheet via ffmpeg
    const p1 = path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_1_Jangan_Diikat_Kencang.png');
    const p2 = path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_2_Serangan_Ular_Amputasi.png');
    const p3 = path.join(PUBLISH_DIR, '06_Thumbnail_Opsi_3_Fakta_Medis_XRay.png');
    for (const sheetOut of [
      path.join(PUBLISH_DIR, 'thumb_ep04_3_opsi_sheet.jpg'),
      path.join(VAULT_DIR, 'thumb_ep04_3_opsi_sheet.jpg'),
      path.join(OUT_DIR, 'thumb_ep04_3_opsi_sheet.jpg')
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
