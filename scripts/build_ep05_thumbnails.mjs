import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'previews_ep05');
const VAULT_DIR = path.join(ROOT, 'vault', 'assets');
const PUBLISH_DIR = path.join(ROOT, 'Publish_Kit_EP05');

// Isolate ALL temp files on Disk D:
const RENDER_TMP = path.join(ROOT, '.render_tmp_thumb_ep05');
try { fs.rmSync(RENDER_TMP, { recursive: true, force: true }); } catch {}
fs.mkdirSync(RENDER_TMP, { recursive: true });
const USER_DATA = path.join(RENDER_TMP, 'chrome_profile');
const CHILD_ENV = { ...process.env, TEMP: RENDER_TMP, TMP: RENDER_TMP, TMPDIR: RENDER_TMP };

const PORT = 9285;
const SRV_PORT = 8789;

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
      const rel = urlPath === '/' ? '/ep05.html' : urlPath;
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
    `http://127.0.0.1:${SRV_PORT}/ep05.html?clean=1`
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

    // Inject @janganpanikdulu Thumbnail UI CSS (9:16 Safe-Zone Compliant)
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.OPENER.tl.pause();

        const st = document.createElement('style');
        st.textContent = \`
          #hook-card, #step-tracker, #metric-pill, #sub-wrap, #call1, #call2, #call3, #call4, #OverlaySVG, #outro-wipe, #outro-ui, #brand-pill {
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
          /* Safe Zone: Top >= 260px (clear of TikTok/Reels/Shorts top bar), Sides >= 54px, Bottom >= 380px clear */
          .th-header-wrap {
            position: absolute;
            top: 268px;
            left: 54px;
            right: 54px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 10px;
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
            padding: 18px 36px 20px;
            box-shadow: 0 22px 48px rgba(20, 14, 56, 0.24);
          }
          .th-title-card.dark {
            background: #261A66;
            border: 4px solid #FFFFFF;
            box-shadow: 0 22px 48px rgba(8, 6, 26, 0.50);
          }
          .th-main {
            font-size: 64px;
            font-weight: 800;
            line-height: 1.05;
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
            padding: 5px 22px 8px;
            border-radius: 14px;
            margin-top: 8px;
          }
          .th-split-tags {
            position: absolute;
            top: 745px;
            left: 54px;
            right: 54px;
            display: flex;
            justify-content: space-between;
            padding: 0 38px;
          }
          .th-tag-pill {
            font-size: 28px;
            font-weight: 800;
            padding: 8px 24px;
            border-radius: 999px;
            color: #FFFFFF;
            border: 3px solid #FFFFFF;
            box-shadow: 0 10px 24px rgba(20, 14, 56, 0.28);
            text-transform: uppercase;
          }
          .th-tag-pill.ok { background: #0FA968; }
          .th-tag-pill.no { background: #EF5F18; }
        \`;
        document.head.appendChild(st);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'thumb-svg';
        svg.setAttribute('viewBox', '0 0 1080 1920');
        document.body.appendChild(svg);

        const ov = document.createElement('div');
        ov.id = 'thumb-overlay';
        document.body.appendChild(ov);
      })()`
    });

    // =========================================================================
    // OPSI 1: FRAME 0 HOOK — "MOGOK DI BANJIR? JANGAN PENCET STARTER!"
    // Mas Raka (helm) di atas motor matic merah di genangan banjir, jempol kanan di tombol starter
    // =========================================================================
    const r1 = await send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const { tl, S, render, renderer, scene, camera, RAKA } = window.OPENER;
          tl.time(0.15, false);
          render(0.15);

          // Framing: push Mas Raka + motor lower so top title card sits cleanly above helmet
          S.camX = -4.9; S.camY = 3.55; S.camZ = 8.4;
          S.lookX = 0.22; S.lookY = 2.02; S.lookZ = 0.08;
          S.fov = 26;
          S.starterRingAlpha = 0.0;

          render(0.15);
          camera.updateMatrixWorld(true);
          camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
          renderer.render(scene, camera);

          // Project right arm/hand (starter thumb area)
          const handPt = RAKA.armR.handPivot.position.clone().set(0.0, 0.0, 0.06);
          RAKA.armR.handPivot.localToWorld(handPt);
          handPt.project(camera);
          const sx = Math.round((handPt.x * 0.5 + 0.5) * 1080);
          const sy = Math.round((-handPt.y * 0.5 + 0.5) * 1920);

          document.getElementById('thumb-svg').innerHTML = \`
            <defs>
              <filter id="sh1" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.45"/>
              </filter>
            </defs>
            <g filter="url(#sh1)">
              <circle cx="\${sx}" cy="\${sy}" r="84" fill="none" stroke="#FFFFFF" stroke-width="18"/>
              <circle cx="\${sx}" cy="\${sy}" r="84" fill="none" stroke="#EF5F18" stroke-width="11"/>
              <path d="M \${sx - 200} \${sy - 160} Q \${sx - 180} \${sy - 40} \${sx - 98} \${sy - 18}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
              <path d="M \${sx - 200} \${sy - 160} Q \${sx - 180} \${sy - 40} \${sx - 98} \${sy - 18}" fill="none" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
              <polygon points="\${sx - 72},\${sy - 10} \${sx - 118},\${sy - 46} \${sx - 108},\${sy + 14}" fill="#EF5F18" stroke="#FFFFFF" stroke-width="4"/>
            </g>
          \`;

          document.getElementById('thumb-overlay').innerHTML = \`
            <div class="th-header-wrap">
              <div class="th-kicker">&#x26A0;&#xFE0F; STOP REFLEKS INI!</div>
              <div class="th-title-card">
                <div class="th-main" style="font-size:66px;">MOGOK DI BANJIR?<br><span class="hl-badge" style="font-size:44px;">JANGAN PENCET STARTER!</span></div>
              </div>
            </div>
          \`;
          return { ok: true, sx, sy };
        } catch (e) {
          return { ok: false, err: e.stack || e.message };
        }
      })()`,
      returnByValue: true
    });
    console.log('Opsi 1 eval:', JSON.stringify(r1?.result?.result?.value));
    await sleep(180);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    const buf1 = Buffer.from(snap1.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_1_Jangan_Pencet_Starter.png'), buf1);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep05_opsi_1.png'), buf1);
    safeWrite(path.join(OUT_DIR, 'thumb_ep05_opsi_1.png'), buf1);
    console.log('Generated EP05 Thumbnail Opsi 1');

    // =========================================================================
    // OPSI 2: X-RAY CATASTROPHE — "NEKAT STARTER? MESIN BISA JEBOL!"
    // Cutaway silinder penuh air biru + setang seher bengkok S + blok retak oranye
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { tl, S, render, renderer, scene, camera, engineStageGroup } = window.OPENER;
        tl.time(52.8, false);
        render(52.8);

        S.stageIdx = 1;
        S.camX = 0.0; S.camY = 2.08; S.camZ = 9.4;
        S.lookX = 0.0; S.lookY = 2.08; S.lookZ = 0.0;
        S.fov = 25;

        render(52.8);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        renderer.render(scene, camera);

        // Project bent connecting rod area
        const rodPt = camera.position.clone().set(-0.08, 0.90, 0.25);
        engineStageGroup.localToWorld(rodPt);
        rodPt.project(camera);
        const rx = Math.round((rodPt.x * 0.5 + 0.5) * 1080);
        const ry = Math.round((-rodPt.y * 0.5 + 0.5) * 1920);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.52"/>
            </filter>
          </defs>
          <g filter="url(#sh2)">
            <circle cx="\${rx}" cy="\${ry}" r="118" fill="none" stroke="#FFFFFF" stroke-width="18"/>
            <circle cx="\${rx}" cy="\${ry}" r="118" fill="none" stroke="#EF5F18" stroke-width="11"/>
            <path d="M \${rx + 215} \${ry - 175} Q \${rx + 200} \${ry - 45} \${rx + 128} \${ry - 18}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
            <path d="M \${rx + 215} \${ry - 175} Q \${rx + 200} \${ry - 45} \${rx + 128} \${ry - 18}" fill="none" stroke="#EF5F18" stroke-width="13" stroke-linecap="round"/>
            <polygon points="\${rx + 98},\${ry - 10} \${rx + 146},\${ry - 46} \${rx + 136},\${ry + 14}" fill="#EF5F18" stroke="#FFFFFF" stroke-width="4"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker">&#x1F6A8; 1 PENCETAN = JEBOL</div>
            <div class="th-title-card dark">
              <div class="th-main" style="font-size:66px;">NEKAT STARTER?<br><span class="hl-badge" style="font-size:44px;">SETANG SEHER BENGKOK!</span></div>
            </div>
          </div>
        \`;
      })()`
    });
    await sleep(180);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    const buf2 = Buffer.from(snap2.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_2_Mesin_Jebol_Water_Hammer.png'), buf2);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep05_opsi_2.png'), buf2);
    safeWrite(path.join(OUT_DIR, 'thumb_ep05_opsi_2.png'), buf2);
    console.log('Generated EP05 Thumbnail Opsi 2');

    // =========================================================================
    // OPSI 3: SPLIT PHYSICS CURIOSITY GAP — "KOK BISA JEBOL? AIR TAK BISA DITEKAN!"
    // Split-view silinder kiri (Gas hijau) vs silinder kanan (Air biru beton)
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { tl, S, render, renderer, scene, camera, splitPhysicsGroup } = window.OPENER;
        tl.time(42.5, false);
        render(42.5);

        S.stageIdx = 2;
        S.camX = 0.0; S.camY = 2.15; S.camZ = 9.4;
        S.lookX = 0.0; S.lookY = 2.08; S.lookZ = 0.0;
        S.fov = 25;

        render(42.5);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        renderer.render(scene, camera);

        // Project right cylinder (incompressible water)
        const watPt = camera.position.clone().set(0.56, 1.32, 0.25);
        splitPhysicsGroup.localToWorld(watPt);
        watPt.project(camera);
        const wx = Math.round((watPt.x * 0.5 + 0.5) * 1080);
        const wy = Math.round((-watPt.y * 0.5 + 0.5) * 1920);

        document.getElementById('thumb-svg').innerHTML = \`
          <defs>
            <filter id="sh3" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#140E38" flood-opacity="0.46"/>
            </filter>
          </defs>
          <g filter="url(#sh3)">
            <circle cx="\${wx}" cy="\${wy}" r="122" fill="none" stroke="#FFFFFF" stroke-width="18"/>
            <circle cx="\${wx}" cy="\${wy}" r="122" fill="none" stroke="#EF5F18" stroke-width="11"/>
          </g>
        \`;

        document.getElementById('thumb-overlay').innerHTML = \`
          <div class="th-header-wrap">
            <div class="th-kicker indigo">&#x1F52C; FAKTA FISIKA MESIN</div>
            <div class="th-title-card">
              <div class="th-main" style="font-size:66px;">KOK BISA JEBOL?<br><span class="hl-badge" style="font-size:44px;">AIR TAK BISA DITEKAN!</span></div>
            </div>
          </div>
          <div class="th-split-tags">
            <div class="th-tag-pill ok">&#x2713; GAS: KOMPRES</div>
            <div class="th-tag-pill no">&#x2717; AIR: BETON!</div>
          </div>
        \`;
      })()`
    });
    await sleep(180);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    const buf3 = Buffer.from(snap3.result.data, 'base64');
    safeWrite(path.join(PUBLISH_DIR, '06_Thumbnail_Opsi_3_Fakta_Fisika_Gas_vs_Air.png'), buf3);
    safeWrite(path.join(VAULT_DIR, 'thumb_ep05_opsi_3.png'), buf3);
    safeWrite(path.join(OUT_DIR, 'thumb_ep05_opsi_3.png'), buf3);
    console.log('Generated EP05 Thumbnail Opsi 3');

    // Stitch 3-up horizontal contact sheet via ffmpeg
    const p1 = path.join(PUBLISH_DIR, '04_Thumbnail_Opsi_1_Jangan_Pencet_Starter.png');
    const p2 = path.join(PUBLISH_DIR, '05_Thumbnail_Opsi_2_Mesin_Jebol_Water_Hammer.png');
    const p3 = path.join(PUBLISH_DIR, '06_Thumbnail_Opsi_3_Fakta_Fisika_Gas_vs_Air.png');
    for (const sheetOut of [
      path.join(PUBLISH_DIR, 'thumb_ep05_3_opsi_sheet.jpg'),
      path.join(VAULT_DIR, 'thumb_ep05_3_opsi_sheet.jpg'),
      path.join(OUT_DIR, 'thumb_ep05_3_opsi_sheet.jpg')
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
