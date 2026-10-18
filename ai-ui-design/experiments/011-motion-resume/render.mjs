import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FPS = 60;
const DURATION = 15;
const TOTAL_FRAMES = FPS * DURATION;

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const mode = getArg('mode', 'stills');
const workers = Math.max(1, Math.min(6, Number(getArg('workers', '3'))));
const frameFrom = Math.max(0, Number(getArg('from', '0')));
const frameTo = Math.min(TOTAL_FRAMES - 1, Number(getArg('to', String(TOTAL_FRAMES - 1))));
const audioPath = getArg('audio', 'out/score.wav');
const outputVideo = getArg('out', 'out/m15-resume.mp4');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const target = path.normalize(path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath));
      if (!target.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      fs.readFile(target, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(target)] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[browser]', msg.text());
  });
  page.on('pageerror', (err) => console.error('[pageerror]', err.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?capture=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return page;
}

async function renderStill(page, time, file) {
  await page.evaluate((t) => window.seek(t), time);
  await page.screenshot({
    path: file,
    type: 'png',
    animations: 'disabled',
    caret: 'hide',
  });
}

async function renderFrame(page, frame, dir) {
  await page.evaluate((t) => window.seek(t), frame / FPS);
  const file = path.join(dir, `f_${String(frame).padStart(4, '0')}.png`);
  await page.screenshot({
    path: file,
    type: 'png',
    animations: 'disabled',
    caret: 'hide',
  });
}

function encode(framesDir, withAudio) {
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const out = path.join(ROOT, outputVideo);
  const common = [
    '-y',
    '-framerate', String(FPS),
    '-start_number', '0',
    '-i', path.join(framesDir, 'f_%04d.png'),
  ];
  if (withAudio) common.push('-i', path.join(ROOT, audioPath));
  common.push(
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '15',
    '-tune', 'animation',
    '-profile:v', 'high',
    '-level', '4.2',
    '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-movflags', '+faststart',
    '-metadata', 'title=M/15 — A Résumé in Motion',
    '-metadata', 'artist=M/15',
    '-metadata', 'comment=15 seconds. 900 frames. Design, animation and sound synthesized for this film.',
  );
  if (withAudio) {
    common.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000');
  }
  common.push('-t', String(DURATION), out);
  console.log('[ffmpeg]', 'ffmpeg', common.join(' '));
  const r = spawnSync('ffmpeg', common, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) throw new Error(`ffmpeg failed with ${r.status}`);
  console.log(`[done] ${out}`);
}

async function main() {
  const { server, port } = await startServer();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--force-color-profile=srgb',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });

  try {
    if (mode === 'stills') {
      const times = (getArg('times') || '0,0.4,0.7,0.9,1.2,1.7,2.2,2.75,3.2,3.8,4.5,5.2,5.8,6.3,7.0,8.0,8.8,9.3,10.0,10.7,11.4,11.8,12.4,13.0,13.8,14.6,14.95')
        .split(',')
        .map(Number);
      const dir = path.join(ROOT, 'stills');
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const [i, time] of times.entries()) {
        const file = path.join(dir, `still_${String(i).padStart(2, '0')}_${time.toFixed(2)}.png`);
        await renderStill(page, time, file);
        console.log(`[still] ${time.toFixed(2)}s -> ${path.relative(ROOT, file)}`);
      }
      await page.close();
      return;
    }

    if (mode === 'video') {
      const dir = path.join(ROOT, 'frames');
      fs.mkdirSync(dir, { recursive: true });
      const pages = [];
      for (let i = 0; i < workers; i++) pages.push(await openPage(browser, port));

      const started = Date.now();
      let next = frameFrom;
      let rendered = 0;
      const total = frameTo - frameFrom + 1;

      await Promise.all(
        pages.map(async (page) => {
          while (true) {
            const frame = next++;
            if (frame > frameTo) break;
            await renderFrame(page, frame, dir);
            rendered++;
            if (rendered % 30 === 0 || rendered === total) {
              const elapsed = (Date.now() - started) / 1000;
              const rate = rendered / elapsed;
              const remain = (total - rendered) / Math.max(rate, 0.01);
              console.log(
                `[render] ${rendered}/${total} frames · ${rate.toFixed(2)} fps · eta ${remain.toFixed(0)}s`
              );
            }
          }
        })
      );

      for (const page of pages) await page.close();

      const withAudio = fs.existsSync(path.join(ROOT, audioPath));
      console.log(`[render] finished in ${((Date.now() - started) / 1000).toFixed(1)}s · audio=${withAudio}`);
      if (hasFlag('no-encode')) return;
      encode(dir, withAudio);
      return;
    }

    if (mode === 'encode') {
      const withAudio = fs.existsSync(path.join(ROOT, audioPath));
      encode(path.join(ROOT, 'frames'), withAudio);
      return;
    }

    throw new Error(`Unknown mode: ${mode}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
