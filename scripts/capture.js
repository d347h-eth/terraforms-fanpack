const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const CAPTURE_FRAMERATE = 40;
const CAPTURE_DURATION_SECONDS = 15;
const FRAME_COUNT = CAPTURE_FRAMERATE * CAPTURE_DURATION_SECONDS;
const STARTUP_DELAY_MS = 0;
const NAVIGATION_TIMEOUT_MS = 20000;
const VIEWPORT = { width: 1200, height: 1732 };
const SCREENSHOT_EXTENSION = 'png';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureAndCreateMP4(htmlPath, runDir) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--enable-local-file-accesses',
    ],
  });
  let page;
  try {
    page = await browser.newPage();
    page.on('console', (msg) => {
      console.log(`[page:${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.error('[page-error]', err);
    });
    await page.setViewport(VIEWPORT);
    const fileUrl = pathToFileURL(htmlPath).href;
    await page.goto(fileUrl, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
    await page.addStyleTag({
      content: 'html,body,svg{width:100%;height:100%;margin:0;padding:0;overflow:hidden;}',
    });
    await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (svg) {
        svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
      }
    });
    await page.evaluate(() => {
      if (window.__captureHeartbeatInterval) return;
      let toggle = false;
      const target = document.documentElement;
      window.__captureHeartbeatInterval = setInterval(() => {
        target.style.transform = toggle ? 'translateZ(0)' : 'translateZ(0.0001px)';
        toggle = !toggle;
      }, 20);
    });
    console.log('Page loaded; starting capture…');
    await delay(STARTUP_DELAY_MS);

    const { actualFps, frames } = await screencastCapture(page);
    await persistFrames(runDir, frames);
    return createVideo(runDir, actualFps);
  } finally {
    if (page) {
      try {
        const client = await page.target().createCDPSession();
        await client.detach();
      } catch {
        // ignore errors if the session is already closed
      }
    }
    await browser.close();
  }
}

async function createVideo(runDir, actualFps) {
  const mp4File = path.join(runDir, 'capture.mp4');
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-framerate',
        actualFps.toString(),
        '-i',
        path.join(runDir, `frame_%03d.${SCREENSHOT_EXTENSION}`),
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
        actualFps.toString(),
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

async function persistFrames(runDir, frameBuffers) {
  await Promise.all(
    frameBuffers.map((buffer, index) => {
      const fileName = `frame_${index.toString().padStart(3, '0')}.${SCREENSHOT_EXTENSION}`;
      const filePath = path.join(runDir, fileName);
      return fs.promises.writeFile(filePath, buffer);
    })
  );
}

async function screencastCapture(page) {
  const client = await page.target().createCDPSession();
  const frameBuffers = [];
  let framesCaptured = 0;
  const frameDurations = [];
  const captureStart = Date.now();
  let lastFrameTimestamp = captureStart;
  const desiredFrameInterval = 1000 / CAPTURE_FRAMERATE;
  let storedFrames = 0;

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: VIEWPORT.width,
    screenHeight: VIEWPORT.height,
  });
  await client.send('Emulation.setVisibleSize', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
  });

  await client.send('Page.startScreencast', {
    format: SCREENSHOT_EXTENSION === 'png' ? 'png' : 'jpeg',
    quality: SCREENSHOT_EXTENSION === 'png' ? undefined : 90,
    everyNthFrame: 1,
    maxWidth: VIEWPORT.width,
    maxHeight: VIEWPORT.height,
    captureBeyondViewport: true,
    deviceScaleFactor: 1,
  });

  const frameHandler = async ({ data, sessionId }) => {
    const now = Date.now();
    frameDurations.push(now - lastFrameTimestamp);
    lastFrameTimestamp = now;

    const elapsed = now - captureStart;
    const expectedStoredFrames = Math.floor(elapsed / desiredFrameInterval);

    if (storedFrames < FRAME_COUNT && expectedStoredFrames > storedFrames) {
      frameBuffers.push(Buffer.from(data, 'base64'));
      storedFrames += 1;
    }

    framesCaptured += 1;
    await client.send('Page.screencastFrameAck', { sessionId });
  };

  client.on('Page.screencastFrame', frameHandler);

  while (storedFrames < FRAME_COUNT) {
    await delay(5);
  }

  await client.send('Page.stopScreencast');
  client.off('Page.screencastFrame', frameHandler);

  const captureEnd = Date.now();
  const elapsedMs = captureEnd - captureStart;
  const actualFps = storedFrames / (elapsedMs / 1000);

  frameDurations.sort((a, b) => a - b);
  const median = frameDurations[Math.floor(frameDurations.length / 2)] || 0;
  const max = Math.max(...frameDurations, 0);
  const min = Math.min(...frameDurations, 0);
  console.log(
    `Screencast captured ${framesCaptured} frames in ${(elapsedMs / 1000).toFixed(2)}s (~${actualFps.toFixed(
      2
    )} fps). Frame intervals (ms) min/median/max: ${min}/${median}/${max}`
  );

  return { actualFps, frames: frameBuffers.slice(0, FRAME_COUNT) };
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
