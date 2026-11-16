import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SRV_PORT = 8775;
const CDP_PORT = 9258;
const TMP_DIR = path.join(ROOT, '.render_tmp_thumb_ep02_v3');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error('chrome.exe tidak ditemukan.');
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      let filePath = path.join(ROOT, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end('Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(SRV_PORT, '127.0.0.1', () => resolve(server));
  });
}

async function waitForCDP(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Timeout menunggu Chrome CDP.');
}

function createCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          ws.close();
        }
      });
    });

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      }
    });

    ws.addEventListener('error', reject);
  });
}

const VARIANTS = [
  {
    id: 'varian_1a_panic_shield',
    outFiles: [
      'Publish_Kit_EP02/03_Thumbnail_Opsi_1_Jangan_Siram_Air.png',
      'vault/assets/thumb_ep02_opsi_1.png',
      'previews_v2/thumb_ep02_opsi_1.png'
    ],
    seekTime: 18.2,
    expression: 'panic_shield',
    pose: 'shield_cross',
    camera: { x: 7.4, y: 6.1, z: 10.6, fov: 24, lx: 0.2, ly: 3.1, lz: 0.0, roll: -0.05 },
    sceneState: { fireballScale: 1.32, gayungAlpha: 1, gayungTilt: 0.82, lidSlide: 0, flameScale: 1.3 },
    html: `
      <div style="position:absolute;inset:0;pointer-events:none;font-family:'Plus Jakarta Sans','Inter',sans-serif;">
        <!-- Safe Zone 1:1 (y: 420..1500) -->
        <div style="position:absolute;top:445px;left:56px;background:#261A66;color:#FFFFFF;font-weight:800;font-size:27px;letter-spacing:0.06em;padding:12px 24px;border-radius:14px;border:4px solid #FFFFFF;box-shadow:0 10px 0 #150D40;">
           PANIK SAAT WAJAN TERBAKAR?
        </div>

        <div style="position:absolute;top:522px;right:56px;background:#FFFFFF;border:6px solid #261A66;border-radius:26px;padding:22px 28px;box-shadow:0 14px 0 #261A66;text-align:right;max-width:640px;">
          <div style="font-size:66px;font-weight:900;line-height:1.02;color:#261A66;letter-spacing:-0.03em;">
            STOP! JANGAN
          </div>
          <div style="display:inline-block;margin-top:8px;background:#EF5F18;color:#FFFFFF;font-size:68px;font-weight:900;line-height:1.02;padding:6px 20px;border-radius:14px;letter-spacing:-0.02em;">
            DISIRAM AIR!
          </div>
        </div>

        <!-- X Mark over dipper area -->
        <svg width="1080" height="1920" style="position:absolute;inset:0;">
          <circle cx="330" cy="930" r="96" fill="#FFFFFF" stroke="#EF5F18" stroke-width="18"/>
          <line x1="276" y1="876" x2="384" y2="984" stroke="#EF5F18" stroke-width="22" stroke-linecap="round"/>
          <line x1="384" y1="876" x2="276" y2="984" stroke="#EF5F18" stroke-width="22" stroke-linecap="round"/>
        </svg>

        <div style="position:absolute;top:1055px;left:56px;background:#EF5F18;color:#FFFFFF;font-weight:900;font-size:28px;padding:12px 22px;border-radius:14px;border:4px solid #FFFFFF;box-shadow:0 8px 0 #261A66;">
           1 Gayung = Ledakan 1.700
        </div>

        <div style="position:absolute;top:1380px;left:50%;transform:translateX(-50%);background:#261A66;color:#FFFFFF;font-weight:800;font-size:32px;padding:16px 34px;border-radius:999px;border:5px solid #FFFFFF;box-shadow:0 10px 0 #EF5F18;white-space:nowrap;">
          Minyak 300C Bikin Air Jadi Bom Uap!
        </div>
      </div>
    `
  },
  {
    id: 'varian_1b_split_contrast',
    outFiles: [
      'Publish_Kit_EP02/04_Thumbnail_Opsi_2_Cutaway_Uap_1700x.png',
      'vault/assets/thumb_ep02_opsi_2.png',
      'previews_v2/thumb_ep02_opsi_2.png'
    ],
    seekTime: 24.5,
    expression: 'fourth_wall_warning',
    pose: 'host_point_left',
    camera: { x: 8.6, y: 8.4, z: 11.4, fov: 25, lx: 0.0, ly: 3.3, lz: 0.0, roll: 0 },
    sceneState: { fireballScale: 1.15, gayungAlpha: 1, gayungTilt: 0.65, lidSlide: 0.68, flameScale: 0.95 },
    html: `
      <div style="position:absolute;inset:0;pointer-events:none;font-family:'Plus Jakarta Sans','Inter',sans-serif;">
        <!-- Split-screen frame dividers inside 1:1 -->
        <div style="position:absolute;top:420px;left:0;width:537px;height:1080px;border-top:8px solid #EF5F18;border-bottom:8px solid #EF5F18;box-sizing:border-box;"></div>
        <div style="position:absolute;top:420px;right:0;width:537px;height:1080px;border-top:8px solid #261A66;border-bottom:8px solid #261A66;box-sizing:border-box;"></div>
        <div style="position:absolute;top:420px;left:537px;width:6px;height:1080px;background:#FFFFFF;"></div>

        <!-- Top Centered Headline Card -->
        <div style="position:absolute;top:446px;left:50%;transform:translateX(-50%);background:#FFFFFF;border:6px solid #261A66;border-radius:24px;padding:18px 32px;box-shadow:0 12px 0 #261A66;text-align:center;width:880px;">
          <div style="font-size:58px;font-weight:900;line-height:1.05;color:#261A66;letter-spacing:-0.03em;">
            REAKSI PERTAMA
          </div>
          <div style="display:inline-block;margin-top:6px;background:#EF5F18;color:#FFFFFF;font-size:56px;font-weight:900;line-height:1.05;padding:4px 20px;border-radius:12px;">
            PENENTU SELAMAT!
          </div>
        </div>

        <!-- Left Wrong Pill -->
        <div style="position:absolute;top:675px;left:44px;background:#EF5F18;color:#FFFFFF;border:5px solid #FFFFFF;border-radius:18px;padding:14px 22px;box-shadow:0 10px 0 #261A66;text-align:center;width:420px;">
          <div style="font-size:34px;font-weight:900;"> SIRAM AIR</div>
          <div style="font-size:24px;font-weight:800;margin-top:2px;">API MELEDAK 1.700!</div>
        </div>

        <!-- Right Correct Pill -->
        <div style="position:absolute;top:675px;right:44px;background:#261A66;color:#FFFFFF;border:5px solid #FFFFFF;border-radius:18px;padding:14px 22px;box-shadow:0 10px 0 #EF5F18;text-align:center;width:420px;">
          <div style="font-size:34px;font-weight:900;"> TUTUP RAPAT</div>
          <div style="font-size:24px;font-weight:800;margin-top:2px;">API PADAM 3 DETIK</div>
        </div>

        <!-- Bottom Host Callout -->
        <div style="position:absolute;top:1388px;left:50%;transform:translateX(-50%);background:#FFFFFF;color:#261A66;font-weight:900;font-size:31px;padding:14px 32px;border-radius:999px;border:5px solid #261A66;box-shadow:0 10px 0 #EF5F18;white-space:nowrap;">
          Wajan Terbakar? Jangan Siram Air!
        </div>
      </div>
    `
  },
  {
    id: 'varian_1c_tight_pov',
    outFiles: [
      'Publish_Kit_EP02/05_Thumbnail_Opsi_3_Tiga_Langkah_Selamat.png',
      'vault/assets/thumb_ep02_opsi_3.png',
      'previews_v2/thumb_ep02_opsi_3.png'
    ],
    seekTime: 16.8,
    expression: 'wide_eyed_gasp',
    pose: 'reach_prevent',
    camera: { x: 6.4, y: 7.4, z: 8.8, fov: 23, lx: -0.3, ly: 3.4, lz: 0.0, roll: 0.03 },
    sceneState: { fireballScale: 1.24, gayungAlpha: 1, gayungTilt: 0.92, lidSlide: 0, flameScale: 1.25 },
    html: `
      <div style="position:absolute;inset:0;pointer-events:none;font-family:'Plus Jakarta Sans','Inter',sans-serif;">
        <div style="position:absolute;top:448px;left:50%;transform:translateX(-50%);background:#FFFFFF;color:#261A66;font-weight:900;font-size:29px;letter-spacing:0.04em;padding:12px 28px;border-radius:999px;border:5px solid #261A66;box-shadow:0 10px 0 #EF5F18;white-space:nowrap;">
          REFLEKS 90% ORANG DI DAPUR
        </div>

        <!-- Pointer Tag to Dipper -->
        <svg width="1080" height="1920" style="position:absolute;inset:0;">
          <path d="M 300 650 L 300 790 L 420 850" fill="none" stroke="#EF5F18" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
          <polygon points="445,862 405,826 392,866" fill="#EF5F18"/>
        </svg>

        <div style="position:absolute;top:572px;left:64px;background:#EF5F18;color:#FFFFFF;font-weight:900;font-size:38px;padding:14px 26px;border-radius:16px;border:5px solid #FFFFFF;box-shadow:0 10px 0 #261A66;">
          JANGAN TUANG!
        </div>

        <!-- Bottom Punchline Card -->
        <div style="position:absolute;top:1245px;left:50%;transform:translateX(-50%);background:#261A66;border:6px solid #FFFFFF;border-radius:26px;padding:20px 34px;box-shadow:0 14px 0 #EF5F18;text-align:center;width:920px;">
          <div style="font-size:56px;font-weight:900;line-height:1.05;color:#FFFFFF;letter-spacing:-0.02em;">
            AIR + MINYAK PANAS
          </div>
          <div style="display:inline-block;margin-top:8px;background:#EF5F18;color:#FFFFFF;font-size:60px;font-weight:900;line-height:1.05;padding:6px 22px;border-radius:14px;">
            = BOM UAP 1.700!
          </div>
        </div>
      </div>
    `
  }
];

async function main() {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const server = await startStaticServer();
  const chromePath = findChrome();
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=1080,1920',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${TMP_DIR}`,
    `http://127.0.0.1:${SRV_PORT}/index.html?clean=1`
  ], { stdio: 'ignore' });

  let cdp;
  try {
    const wsUrl = await waitForCDP(CDP_PORT);
    cdp = await createCDP(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1080,
      height: 1920,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Wait for window.OPENER.ready
    await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `new Promise((resolve) => {
        const check = () => (window.OPENER && window.OPENER.ready) ? resolve(true) : setTimeout(check, 100);
        check();
      })`
    });

    // Inject expression & pose helpers into page
    await cdp.send('Runtime.evaluate', {
      expression: `
        window.THUMB_LOCK = true;

        window.__setRakaFace = function(mode) {
          const { RAKA } = window.OPENER;
          const faceMesh = RAKA.headPivot.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
          if (!faceMesh) return;
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, 512, 512);

          // Eyebrows
          ctx.strokeStyle = '#1E1B4B';
          ctx.lineWidth = 22;
          ctx.lineCap = 'round';
          if (mode === 'panic_shield') {
            ctx.beginPath(); ctx.moveTo(115, 175); ctx.quadraticCurveTo(165, 130, 215, 165); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(297, 165); ctx.quadraticCurveTo(347, 130, 397, 175); ctx.stroke();
          } else if (mode === 'fourth_wall_warning') {
            ctx.beginPath(); ctx.moveTo(118, 148); ctx.lineTo(215, 178); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(394, 148); ctx.lineTo(297, 178); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(112, 160); ctx.quadraticCurveTo(165, 118, 218, 155); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(294, 155); ctx.quadraticCurveTo(347, 118, 400, 160); ctx.stroke();
          }

          // Eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(172, 228, 44, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(340, 228, 44, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 8; ctx.strokeStyle = '#1E1B4B';
          ctx.stroke();

          ctx.fillStyle = '#111827';
          const px = mode === 'fourth_wall_warning' ? 0 : -10;
          ctx.beginPath(); ctx.arc(172 + px, 228, 20, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(340 + px, 228, 20, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(165 + px, 220, 7, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(333 + px, 220, 7, 0, Math.PI * 2); ctx.fill();

          // Mouth
          if (mode === 'panic_shield') {
            ctx.fillStyle = '#7F1D1D';
            ctx.beginPath(); ctx.ellipse(256, 355, 58, 46, 0, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 10; ctx.strokeStyle = '#1E1B4B'; ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(216, 316, 80, 18);
          } else if (mode === 'fourth_wall_warning') {
            ctx.strokeStyle = '#1E1B4B';
            ctx.lineWidth = 18;
            ctx.beginPath(); ctx.moveTo(195, 360); ctx.quadraticCurveTo(256, 332, 317, 360); ctx.stroke();
          } else {
            ctx.fillStyle = '#7F1D1D';
            ctx.beginPath(); ctx.ellipse(256, 358, 44, 54, 0, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 10; ctx.strokeStyle = '#1E1B4B'; ctx.stroke();
          }

          const tex = new faceMesh.material.map.constructor(canvas);
          tex.colorSpace = faceMesh.material.map.colorSpace;
          tex.needsUpdate = true;
          faceMesh.material.map = tex;
          faceMesh.material.needsUpdate = true;
        };
      `
    });

    for (const v of VARIANTS) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const { OPENER } = window;
            const { RAKA, S, camera, renderer, scene } = OPENER;

            if (S) Object.assign(S, ${JSON.stringify(v.sceneState)});
            OPENER.render(${v.seekTime});

            // Apply camera AFTER render()
            camera.fov = ${v.camera.fov};
            camera.position.set(${v.camera.x}, ${v.camera.y}, ${v.camera.z});
            camera.updateProjectionMatrix();
            camera.lookAt(${v.camera.lx}, ${v.camera.ly}, ${v.camera.lz});
            camera.rotation.z += ${v.camera.roll};

            // Apply custom face & pose AFTER render()
            window.__setRakaFace(${JSON.stringify(v.expression)});
            if (${JSON.stringify(v.pose)} === 'shield_cross') {
              RAKA.bodyPivot.rotation.set(-0.14, -0.35, 0.08);
              RAKA.headPivot.rotation.set(0.08, -0.28, -0.06);
              RAKA.armL.rotation.set(-1.35, 0.55, 0.42);
              RAKA.armR.rotation.set(-1.42, -0.62, -0.48);
            } else if (${JSON.stringify(v.pose)} === 'host_point_left') {
              RAKA.bodyPivot.rotation.set(0.0, 0.12, 0.0);
              RAKA.headPivot.rotation.set(0.02, 0.18, 0.0);
              RAKA.armL.rotation.set(-1.15, -0.45, 0.25);
              RAKA.armR.rotation.set(-0.65, 0.35, -0.35);
            } else {
              RAKA.bodyPivot.rotation.set(0.16, -0.42, -0.06);
              RAKA.headPivot.rotation.set(-0.08, -0.36, 0.05);
              RAKA.armL.rotation.set(-1.28, 0.32, 0.18);
              RAKA.armR.rotation.set(-0.45, -0.25, -0.22);
            }

            renderer.render(scene, camera);

            let overlay = document.getElementById('thumb-v3-overlay');
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.id = 'thumb-v3-overlay';
              overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;';
              document.body.appendChild(overlay);
            }
            overlay.innerHTML = ${JSON.stringify(v.html)};
          })();
        `
      });

      await new Promise((r) => setTimeout(r, 250));
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(data, 'base64');

      for (const rel of v.outFiles) {
        const abs = path.join(ROOT, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, buf);
        console.log('Saved:', rel);
      }
    }

    // Generate 3-panel contact sheet via ffmpeg
    const p1 = path.join(ROOT, VARIANTS[0].outFiles[0]);
    const p2 = path.join(ROOT, VARIANTS[1].outFiles[0]);
    const p3 = path.join(ROOT, VARIANTS[2].outFiles[0]);
    const sheets = [
      path.join(ROOT, 'vault/assets/thumb_ep02_3_opsi_sheet.jpg'),
      path.join(ROOT, 'previews_v2/thumb_ep02_3_opsi_sheet.jpg')
    ];
    for (const s of sheets) {
      fs.mkdirSync(path.dirname(s), { recursive: true });
      execFileSync('ffmpeg', [
        '-y', '-i', p1, '-i', p2, '-i', p3,
        '-filter_complex', 'hstack=inputs=3,scale=1620:-1',
        '-q:v', '2', s
      ], { stdio: 'ignore' });
      console.log('Contact sheet:', path.relative(ROOT, s));
    }
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
    server.close();
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
