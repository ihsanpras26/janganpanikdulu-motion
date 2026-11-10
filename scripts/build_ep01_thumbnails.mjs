import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'previews_v2');
const VAULT_DIR = path.join(ROOT, 'vault', 'assets');
const PUBLISH_DIR = path.join(ROOT, 'Publish_Kit_EP01');

const RENDER_TMP = path.join(ROOT, '.render_tmp_thumb');
fs.rmSync(RENDER_TMP, { recursive: true, force: true });
fs.mkdirSync(RENDER_TMP, { recursive: true });
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9254;
const SRV_PORT = 8771;
const USER_DATA = path.join(RENDER_TMP, 'chrome_thumb');

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

function ensureLocalServer(port) {
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

(async () => {
  const srv = await ensureLocalServer(SRV_PORT);
  const chromeArgs = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
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
    `http://127.0.0.1:${SRV_PORT}/index.html?clean=1`
  ];

  const chrome = spawn(chromeBin, chromeArgs, { stdio: 'ignore', env: CHILD_ENV });
  let targets = null;
  for (let i = 0; i < 30; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length) break;
    } catch {}
    await sleep(250);
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

  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'Boolean(window.OPENER && window.OPENER.ready && document.fonts.status === "loaded")',
      returnByValue: true
    });
    if (r?.result?.result?.value) break;
    await sleep(200);
  }
  await sleep(250);

  // Inject Thumbnail Upgrade: Expressive Face Canvas + Articulated Fingers + Dynamic Acting Rig + Clean Hook UI
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.THUMB_LOCK = true;
      window.OPENER.tl.pause();

      // 1. CSS for Scroll-Stopping @puckermanefacts Isometric Diorama Thumbnail Overlay
      const st = document.createElement('style');
      st.textContent = \`
        #hook-card, #step-tracker, #sub-wrap, #c1, #c2, #c3 {
          display: none !important;
        }
        #thumb-overlay {
          position: absolute;
          inset: 0;
          z-index: 90;
          pointer-events: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .th-header-wrap {
          position: absolute;
          top: 268px;
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
          border: 2.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 12px 28px rgba(239, 95, 24, 0.42);
          text-transform: uppercase;
        }
        .th-kicker.indigo {
          background: #261A66;
          box-shadow: 0 12px 28px rgba(38, 26, 102, 0.38);
        }
        .th-title-card {
          background: rgba(255, 255, 255, 0.90);
          backdrop-filter: blur(24px) saturate(170%);
          border: 3px solid #FFFFFF;
          border-radius: 32px;
          padding: 22px 42px;
          box-shadow: 0 24px 52px rgba(20, 14, 56, 0.22);
        }
        .th-title-card.dark {
          background: rgba(24, 18, 62, 0.90);
          border-color: rgba(255, 255, 255, 0.28);
          box-shadow: 0 24px 52px rgba(8, 6, 26, 0.48);
        }
        .th-main {
          font-size: 68px;
          font-weight: 800;
          line-height: 1.03;
          letter-spacing: -0.035em;
          color: #261A66;
          text-transform: uppercase;
        }
        .th-title-card.dark .th-main {
          color: #FFFFFF;
        }
        .th-main .hl-orange {
          color: #EF5F18;
        }
        .th-title-card.dark .th-main .hl-orange {
          color: #FF742E;
        }
        .th-main .hl-badge {
          display: inline-block;
          background: #EF5F18;
          color: #FFFFFF;
          padding: 2px 20px 6px;
          border-radius: 16px;
          margin-top: 6px;
        }

        /* Floating 3D Scene Prop Callout Pills */
        .th-prop-badge {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 22px;
          border-radius: 18px;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.015em;
          box-shadow: 0 14px 30px rgba(15, 20, 32, 0.28);
        }
        .th-prop-badge.danger {
          background: #EF5F18;
          color: #FFFFFF;
          border: 2.5px solid #FFFFFF;
        }
        .th-prop-badge.dark {
          background: rgba(38, 26, 102, 0.94);
          color: #FFFFFF;
          border: 2.5px solid rgba(255, 255, 255, 0.85);
        }
        .th-prop-badge.white {
          background: rgba(255, 255, 255, 0.94);
          color: #261A66;
          border: 2.5px solid #EF5F18;
        }

        .th-bottom-pill {
          position: absolute;
          bottom: 380px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          background: rgba(38, 26, 102, 0.94);
          backdrop-filter: blur(20px);
          border: 2.5px solid rgba(255, 255, 255, 0.85);
          color: #FFFFFF;
          font-size: 31px;
          font-weight: 800;
          padding: 15px 36px;
          border-radius: 999px;
          box-shadow: 0 18px 40px rgba(15, 20, 32, 0.35);
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .th-bottom-pill .accent {
          color: #FFB703;
        }
        .th-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #EF5F18;
          box-shadow: 0 0 12px #EF5F18;
        }
        svg.th-svg {
          position: absolute;
          inset: 0;
          width: 1080px;
          height: 1920px;
          z-index: 88;
          pointer-events: none;
        }
      \`;
      document.head.appendChild(st);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'th-svg');
      svg.setAttribute('id', 'thumb-svg');
      svg.setAttribute('viewBox', '0 0 1080 1920');
      document.getElementById('hud').appendChild(svg);

      const ov = document.createElement('div');
      ov.id = 'thumb-overlay';
      document.getElementById('hud').appendChild(ov);

      // 2. Helper to generate expressive face CanvasTexture for Mas Raka inside the kitchen diorama!
      window.setRakaExpression = (mode) => {
        const raka = window.OPENER.RAKA;
        const headPivot = raka.headPivot;
        const faceMesh = headPivot.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
        if (!faceMesh) return;

        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, 512, 512);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (mode === 'urgent_stop') {
          // Urgent furrowed warning eyebrows
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 22;
          ctx.beginPath();
          ctx.moveTo(106, 146);
          ctx.quadraticCurveTo(158, 168, 210, 180);
          ctx.moveTo(406, 146);
          ctx.quadraticCurveTo(354, 168, 302, 180);
          ctx.stroke();

          // Wide alert eyes with white sclera & double catchlights
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
            ctx.arc(cx, 232, 20, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx - 7, 220, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 7, 240, 4, 0, Math.PI * 2);
            ctx.fill();
          });

          // Nose
          ctx.strokeStyle = 'rgba(145, 92, 58, 0.85)';
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(256, 216);
          ctx.lineTo(246, 268);
          ctx.lineTo(268, 272);
          ctx.stroke();

          // Open shouting "JANGAN!" mouth with teeth & tongue
          ctx.fillStyle = '#7F1D1D';
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 13;
          ctx.beginPath();
          ctx.roundRect(204, 304, 104, 78, 32);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(218, 310, 76, 20, 7);
          ctx.fill();

          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.ellipse(256, 362, 30, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          // Sweat drop on temple
          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(444, 126);
          ctx.bezierCurveTo(470, 166, 468, 198, 444, 198);
          ctx.bezierCurveTo(420, 198, 418, 166, 444, 126);
          ctx.fill();
          ctx.stroke();
        } else if (mode === 'shock_recoil') {
          // High arched shocked eyebrows
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 22;
          ctx.beginPath();
          ctx.moveTo(106, 158);
          ctx.quadraticCurveTo(158, 122, 210, 152);
          ctx.moveTo(302, 152);
          ctx.quadraticCurveTo(354, 122, 406, 158);
          ctx.stroke();

          [158, 354].forEach(cx => {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(cx, 230, 36, 44, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 9;
            ctx.strokeStyle = '#181E26';
            ctx.stroke();

            ctx.fillStyle = '#181E26';
            ctx.beginPath();
            ctx.arc(cx, 232, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx - 6, 222, 8, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.strokeStyle = 'rgba(145, 92, 58, 0.85)';
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(256, 218);
          ctx.lineTo(246, 268);
          ctx.lineTo(268, 272);
          ctx.stroke();

          // Shocked "O" mouth
          ctx.fillStyle = '#7F1D1D';
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 13;
          ctx.beginPath();
          ctx.ellipse(256, 344, 38, 44, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#181E26';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(444, 126);
          ctx.bezierCurveTo(470, 166, 468, 198, 444, 198);
          ctx.bezierCurveTo(420, 198, 418, 166, 444, 126);
          ctx.fill();
          ctx.stroke();
        }

        const oldTex = faceMesh.material.map;
        const newTex = new oldTex.constructor(cv);
        newTex.colorSpace = oldTex.colorSpace;
        newTex.needsUpdate = true;
        faceMesh.material.map = newTex;
        faceMesh.material.needsUpdate = true;
      };

      // 3. Upgrade Mas Raka's sphere hands into real 3D 5-Finger Open STOP Palm (Left) & 3D Pointing Finger Hand (Right)!
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

  const THUMBS = [
    {
      out: 'thumb_ep01_opsi_1.png',
      pub: '03_Thumbnail_Opsi_1_XRay_Saklar.png',
      setup: `(() => {
        const S = window.OPENER.S;
        const RAKA = window.OPENER.RAKA;
        window.OPENER.tl.pause();

        // OPSI 1: Mas Raka Raises 5-Finger STOP Palm to Viewer + Points Index Finger at Sparking 1.000°C Switch!
        S.camX = 9.0; S.camY = 9.6; S.camZ = 12.4;
        S.lookX = 0.65; S.lookY = 1.65; S.lookZ = -1.35;
        S.fov = 25;

        S.cX = 0.05; S.cZ = -1.02; S.cKneel = 0.05; S.cRotY = 0.34;
        S.cutawayAlpha = 0.90; S.copperClose = 1; S.sparkScale = 1.50;
        S.ringScale = 1.42; S.ringAlpha = 0.98;
        S.gasOpacity = 0.88; S.gasRise = 0.92; S.gasFlushX = 0; S.darkMode = 0.06;
        S.winOpen = 0; S.doorOpen = 0; S.airOpacity = 0; S.regLift = 0;

        window.OPENER.render(32.55);

        window.setRakaExpression('urgent_stop');
        RAKA.root.scale.setScalar(1.20);
        RAKA.bodyPivot.rotation.set(0.08, 0.14, -0.07);
        RAKA.headPivot.rotation.set(-0.08, 0.16, 0.05);
        // Left arm raised forward + wrist bent UP -90° (-1.58 rad) so 5-finger STOP palm faces camera flat with fingers pointing UP (✋)!
        RAKA.armL.rotation.set(-1.35, 0.15, -0.18);
        if (window._handL) window._handL.rotation.set(-1.58, 0.0, 0.0);
        // Right arm extended pointing index finger right at the sparking 1.000°C wall switch!
        RAKA.armR.rotation.set(-1.38, -0.32, 0.62);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);

        RAKA.legL.rotation.set(-0.38, 0, -0.10);
        RAKA.legR.rotation.set(0.38, 0, 0.10);

        window.OPENER.renderer.render(window.OPENER.scene, window.OPENER.camera);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh1" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#EF5F18" flood-opacity="0.75"/>
            </filter>
          </defs>
          <path d="M 725 1185 Q 845 1060 825 935" fill="none" stroke="#FFB703" stroke-width="10" stroke-linecap="round" filter="url(#sh1)"/>
          <polygon points="804,942 828,900 848,946" fill="#FFB703"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">⚠️ BAU GAS DI DAPUR?</div>
            <div class="th-title-card">
              <div class="th-main">1 KLIK SAKLAR =<br><span class="hl-badge">MELEDAK?!</span></div>
            </div>
          </div>
          <div class="th-prop-badge danger" style="top: 645px; right: 44px; transform: rotate(2deg);">
            ⚡ Percikan 1.000°C!
          </div>
          <div class="th-prop-badge dark" style="top: 1235px; right: 64px; transform: rotate(-1.5deg);">
            💨 Gas Mengendap & Naik
          </div>
          <div class="th-bottom-pill">
            <span class="th-dot"></span>Jangan Sentuh <span class="accent">Saklar Lampu</span> Saat Gas Bocor!
          </div>
        \`;
      })()`
    },
    {
      out: 'thumb_ep01_opsi_2.png',
      pub: '04_Thumbnail_Opsi_2_Dapur_Gelap.png',
      setup: `(() => {
        const S = window.OPENER.S;
        const RAKA = window.OPENER.RAKA;
        window.OPENER.tl.pause();

        // OPSI 2: Dark Gas-Filled Kitchen — Mas Raka Standing Right Next to Switch, Finger Reaching to Click It as It Sparks!
        S.camX = 8.4; S.camY = 9.5; S.camZ = 12.0;
        S.lookX = 0.78; S.lookY = 1.68; S.lookZ = -1.50;
        S.fov = 25;

        S.darkMode = 0.65; S.gasOpacity = 0.90; S.gasRise = 0.90; S.gasFlushX = 0;
        S.cX = 0.52; S.cZ = -1.52; S.cKneel = 0.06; S.cRotY = 0.72;
        S.cutawayAlpha = 0.78; S.copperClose = 1; S.sparkScale = 1.55;
        S.ringScale = 1.48; S.ringAlpha = 0.98;
        S.winOpen = 0; S.doorOpen = 0; S.airOpacity = 0; S.regLift = 0;

        window.OPENER.render(11.28);

        window.setRakaExpression('shock_recoil');
        RAKA.root.scale.setScalar(1.18);
        RAKA.bodyPivot.rotation.set(0.10, 0.18, -0.06);
        RAKA.headPivot.rotation.set(-0.06, -0.48, 0.06);
        RAKA.armR.rotation.set(-1.62, 0.12, 0.35);
        if (window._handR) window._handR.rotation.set(-0.45, 0, 0);
        // Upright 5-finger STOP palm toward camera!
        RAKA.armL.rotation.set(-1.35, 0.18, -0.22);
        if (window._handL) window._handL.rotation.set(-1.58, 0, 0.0);

        RAKA.legL.rotation.set(0.42, 0, -0.12);
        RAKA.legR.rotation.set(-0.42, 0, 0.12);

        window.OPENER.renderer.render(window.OPENER.scene, window.OPENER.camera);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#EF5F18" flood-opacity="0.85"/>
            </filter>
          </defs>
          <circle cx="820" cy="835" r="130" fill="none" stroke="#EF5F18" stroke-width="10" filter="url(#sh2)"/>
          <line x1="728" y1="743" x2="912" y2="927" stroke="#EF5F18" stroke-width="10" stroke-linecap="round" filter="url(#sh2)"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">🚫 REFLEKS PALING FATAL</div>
            <div class="th-title-card dark">
              <div class="th-main">JANGAN PENCET<br><span class="hl-orange">SAKLAR LAMPU!</span></div>
            </div>
          </div>
          <div class="th-prop-badge danger" style="top: 605px; right: 38px; transform: rotate(2deg);">
            🔥 Api 1.000°C di Saklar!
          </div>
          <div class="th-bottom-pill">
            <span class="th-dot"></span>Kenapa <span class="accent">1 Klik Saklar</span> Langsung Memicu Ledakan?
          </div>
        \`;
      })()`
    },
    {
      out: 'thumb_ep01_opsi_3.png',
      pub: '05_Thumbnail_Opsi_3_Isometric_Dapur.png',
      setup: `(() => {
        const S = window.OPENER.S;
        const RAKA = window.OPENER.RAKA;
        window.OPENER.tl.pause();

        // OPSI 3: Mas Raka Crouching by the 3kg Gas Melon (Unclipping Regulator) While Raising Upright STOP Hand!
        S.camX = 9.8; S.camY = 10.6; S.camZ = 13.4;
        S.lookX = 0.48; S.lookY = 1.58; S.lookZ = -1.12;
        S.fov = 25;

        S.darkMode = 0.03; S.gasOpacity = 0.85; S.gasRise = 0.85; S.gasFlushX = 0;
        S.cutawayAlpha = 0.85; S.copperClose = 1; S.sparkScale = 1.45;
        S.ringScale = 1.45; S.ringAlpha = 0.95;
        S.cX = 0.14; S.cZ = -1.32; S.cKneel = 0.20; S.cRotY = 0.46;
        S.winOpen = 0.5; S.doorOpen = 0.5; S.airOpacity = 0; S.regLift = 0.45;

        window.OPENER.render(45.2);

        window.setRakaExpression('urgent_stop');
        RAKA.root.scale.setScalar(1.22);
        RAKA.bodyPivot.rotation.set(0.16, 0.10, -0.06);
        RAKA.headPivot.rotation.set(-0.12, -0.24, 0.05);
        // Upright 5-finger STOP palm facing viewer!
        RAKA.armL.rotation.set(-1.35, 0.18, -0.22);
        if (window._handL) window._handL.rotation.set(-1.58, 0, 0.0);
        // Right hand reaching directly onto the 3kg Gas Melon regulator!
        RAKA.armR.rotation.set(-1.18, -0.25, 0.38);
        if (window._handR) window._handR.rotation.set(-0.35, 0, -0.15);

        RAKA.legL.rotation.set(-0.48, 0, -0.10);
        RAKA.legR.rotation.set(0.45, 0, 0.10);

        window.OPENER.renderer.render(window.OPENER.scene, window.OPENER.camera);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh3" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#EF5F18" flood-opacity="0.75"/>
            </filter>
          </defs>
          <path d="M 725 1125 Q 835 1015 825 895" fill="none" stroke="#EF5F18" stroke-width="10" stroke-linecap="round" filter="url(#sh3)"/>
          <polygon points="804,902 828,860 848,906" fill="#EF5F18"/>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker indigo">90% ORANG SALAH PAHAM</div>
            <div class="th-title-card">
              <div class="th-main" style="font-size: 62px;">BUKAN TABUNGNYA<br><span class="hl-badge">YANG MELEDAK!</span></div>
            </div>
          </div>
          <div class="th-prop-badge danger" style="top: 615px; right: 38px; transform: rotate(2deg);">
            🔥 Pemicu Asli: Saklar (1.000°C)
          </div>
          <div class="th-prop-badge white" style="top: 1245px; right: 58px; transform: rotate(-1.5deg);">
            ✅ Lepas Regulator Tabung
          </div>
          <div class="th-bottom-pill">
            <span class="th-dot"></span>3 Langkah Selamat Saat <span class="accent">Dapur Bau Gas</span>
          </div>
        \`;
      })()`
    }
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.mkdirSync(PUBLISH_DIR, { recursive: true });

  function safeWrite(fp, data) {
    try { fs.rmSync(fp, { force: true }); } catch {}
    try { fs.writeFileSync(fp, data); } catch (e) {
      console.warn('Warn write:', fp, e.message);
    }
  }

  for (const th of THUMBS) {
    await send('Runtime.evaluate', {
      expression: `new Promise(r => { ${th.setup}; setTimeout(() => { ${th.setup}; r(true); }, 60); })`,
      awaitPromise: true,
      returnByValue: true
    });
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(snap.result.data, 'base64');
    safeWrite(path.join(OUT_DIR, th.out), buf);
    safeWrite(path.join(VAULT_DIR, th.out), buf);
    safeWrite(path.join(PUBLISH_DIR, th.pub), buf);
    console.log('Generated isometric diorama thumbnail:', th.out);
  }

  try { ws.close(); } catch {}
  chrome.kill();
  if (srv) srv.close();
  await sleep(400);
  try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}

  const inputs = THUMBS.map(t => path.join(PUBLISH_DIR, t.pub));
  const filter = inputs.map((_, i) => `[${i}:v]scale=720:1280[c${i}]`).join(';') + ';[c0][c1][c2]hstack=inputs=3[out]';
  const sheetOut = path.join(OUT_DIR, 'thumb_ep01_sheet_v3.jpg');
  execSync(`ffmpeg -y ${inputs.map(f => `-i "${f}"`).join(' ')} -filter_complex "${filter}" -map "[out]" -q:v 2 "${sheetOut}"`, { stdio: 'ignore', env: CHILD_ENV });
  try { fs.copyFileSync(sheetOut, path.join(OUT_DIR, 'thumb_ep01_3_opsi_sheet.jpg')); } catch {}
  try { fs.copyFileSync(sheetOut, path.join(VAULT_DIR, 'thumb_ep01_3_opsi_sheet.jpg')); } catch {}
  console.log('Built thumbnail sheet:', sheetOut);
  process.exit(0);
})();
