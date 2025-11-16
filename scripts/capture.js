const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const CAPTURE_FRAMERATE = 20;
const FRAME_COUNT = 300;
const VIEWPORT = { width: 790, height: 1140 };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureAndCreateMP4(htmlPath, runDir) {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--enable-local-file-accesses',
    ],
  });
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      console.log(`[page:${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.error('[page-error]', err);
    });
    await page.setViewport(VIEWPORT);
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-color-scheme', value: 'light' },
    ]);
    const fileUrl = pathToFileURL(htmlPath).href;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    try {
      await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    } catch {
      // ignore if the Fonts API is unavailable
    }
    await delay(1000);

    const frameDelay = 1000 / CAPTURE_FRAMERATE;
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const fileName = `frame_${i.toString().padStart(3, '0')}.png`;
      const filePath = path.join(runDir, fileName);
      await page.screenshot({ path: filePath });
      if (i < FRAME_COUNT - 1) {
        await delay(frameDelay);
      }
    }
  } finally {
    await browser.close();
  }

  const mp4File = path.join(runDir, 'capture.mp4');
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-framerate',
        CAPTURE_FRAMERATE.toString(),
        '-i',
        path.join(runDir, 'frame_%03d.png'),
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'slow',
        '-crf',
        '18',
        '-b:v',
        '5000k',
        '-maxrate',
        '5000k',
        '-bufsize',
        '10000k',
        '-r',
        CAPTURE_FRAMERATE.toString(),
        '-an',
        '-movflags',
        '+faststart',
        '-y',
        mp4File,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'] }
    );

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });
  });

  return mp4File;
}

function ensureHtmlPath(htmlPath) {
  if (!htmlPath) {
    console.error('Usage: node scripts/capture.js <path-to-html-file>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), htmlPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`HTML file not found: ${resolvedPath}`);
    process.exit(1);
  }
  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile()) {
    console.error(`HTML path is not a file: ${resolvedPath}`);
    process.exit(1);
  }
  return resolvedPath;
}

async function main() {
  const htmlPath = ensureHtmlPath(process.argv[2]);

  const baseTempDir = path.resolve(process.cwd(), 'tmp');
  fs.mkdirSync(baseTempDir, { recursive: true });
  const runDir = path.join(baseTempDir, `capture_${Date.now()}`);
  fs.mkdirSync(runDir, { recursive: true });

  try {
    const mp4File = await captureAndCreateMP4(htmlPath, runDir);
    console.log(`Capture complete. Frames and video stored in: ${runDir}`);
    console.log(`MP4 file: ${mp4File}`);
  } catch (error) {
    console.error('Failed to capture HTML content:', error);
    process.exitCode = 1;
  }
}

main();
