const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const CAPTURE_FRAMERATE = 40;
const CAPTURE_DURATION_SECONDS = 15;
const FRAME_COUNT = CAPTURE_FRAMERATE * CAPTURE_DURATION_SECONDS;
const STARTUP_DELAY_MS = 50;
const NAVIGATION_TIMEOUT_MS = 20000;
const VIEWPORT = { width: 1200, height: 1732 };
const SCREENSHOT_EXTENSION = 'png';
const MODE_STREAMING = 'streaming';
const MODE_BUFFERED = 'buffered';
const MAX_STREAM_PENDING_WRITES = 8;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let gcWarned = false;

function maybeCollectGarbage() {
  if (typeof global.gc === 'function') {
    global.gc();
  } else if (!gcWarned) {
    console.warn('Garbage collection unavailable. Run node with --expose-gc to reclaim memory between phases.');
    gcWarned = true;
  }
}

function parseArgs(argv) {
  const options = { mode: MODE_STREAMING };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1]?.toLowerCase() || MODE_BUFFERED;
    } else if (arg === '--mode') {
      options.mode = argv[i + 1]?.toLowerCase() || MODE_BUFFERED;
      i += 1;
    } else {
      positional.push(arg);
    }
  }

  if (options.mode !== MODE_BUFFERED && options.mode !== MODE_STREAMING) {
    console.warn(`Unknown mode "${options.mode}", defaulting to "${MODE_STREAMING}".`);
    options.mode = MODE_STREAMING;
  }

  return { htmlPath: positional[0], mode: options.mode };
}

async function captureAndCreateMP4(htmlPath, runDir, mode) {
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
    console.log('Page loaded; starting capture...');
    await delay(STARTUP_DELAY_MS);

    const { actualFps, frames } = await screencastCapture(page, runDir, mode);
    if (mode === MODE_BUFFERED && frames) {
      await persistFrames(runDir, frames);
    }
    await page.close();
    await browser.close();
    page = null;
    maybeCollectGarbage();
    const mp4File = await createVideo(runDir, actualFps);
    maybeCollectGarbage();
    return mp4File;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // ignore errors if page already closed
      }
    }
    try {
      await browser.close();
    } catch {
      // ignore errors on close
    }
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
  for (let i = 0; i < frameBuffers.length; i += 1) {
    const fileName = `frame_${i.toString().padStart(3, '0')}.${SCREENSHOT_EXTENSION}`;
    const filePath = path.join(runDir, fileName);
    await fs.promises.writeFile(filePath, frameBuffers[i]);
    frameBuffers[i] = null;
  }
  frameBuffers.length = 0;
}

async function screencastCapture(page, runDir, mode) {
  const client = await page.target().createCDPSession();
  const bufferFrames = mode !== MODE_STREAMING;
  const frameBuffers = bufferFrames ? [] : null;
  let framesCaptured = 0;
  let framesStored = 0;
  const frameDurations = [];
  const captureStart = Date.now();
  let lastFrameTimestamp = captureStart;
  const desiredFrameInterval = 1000 / CAPTURE_FRAMERATE;
  let writeQueue = Promise.resolve();
  let pendingWrites = 0;
  let skippedInvalidFrames = 0;

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

  const frameHandler = async ({ data, metadata, sessionId }) => {
    const now = Date.now();
    frameDurations.push(now - lastFrameTimestamp);
    lastFrameTimestamp = now;

    const elapsed = now - captureStart;
    const expectedStoredFrames = Math.floor(elapsed / desiredFrameInterval);

    if (
      framesStored < FRAME_COUNT &&
      expectedStoredFrames > framesStored
    ) {
      const fileName = `frame_${framesStored.toString().padStart(3, '0')}.${SCREENSHOT_EXTENSION}`;
      const buffer = Buffer.from(data, 'base64');
      if (!frameMatchesViewport(buffer)) {
        skippedInvalidFrames += 1;
      } else if (bufferFrames) {
        frameBuffers.push(buffer);
        framesStored += 1;
      } else {
        const targetPath = path.join(runDir, fileName);
        pendingWrites += 1;
        writeQueue = writeQueue.then(async () => {
          try {
            await fs.promises.writeFile(targetPath, buffer);
          } finally {
            pendingWrites -= 1;
          }
        });
        if (pendingWrites >= MAX_STREAM_PENDING_WRITES) {
          await writeQueue;
        }
        framesStored += 1;
      }
    }

    framesCaptured += 1;
    await client.send('Page.screencastFrameAck', { sessionId });
  };

  client.on('Page.screencastFrame', frameHandler);

  while (framesStored < FRAME_COUNT) {
    await delay(5);
  }

  await client.send('Page.stopScreencast');
  client.off('Page.screencastFrame', frameHandler);
  if (!bufferFrames) {
    await writeQueue;
    writeQueue = null;
  }

  const captureEnd = Date.now();
  const elapsedMs = captureEnd - captureStart;
  const actualFps = framesStored / (elapsedMs / 1000);

  frameDurations.sort((a, b) => a - b);
  const median = frameDurations[Math.floor(frameDurations.length / 2)] || 0;
  const max = Math.max(...frameDurations, 0);
  const min = Math.min(...frameDurations, 0);
  console.log(
    `Screencast stored ${framesStored} frames (received ${framesCaptured}, skipped ${skippedInvalidFrames}) in ${(elapsedMs / 1000).toFixed(
      2
    )}s (~${actualFps.toFixed(
      2
    )} fps). Frame intervals (ms) min/median/max: ${min}/${median}/${max}`
  );

  return { actualFps, frames: bufferFrames ? frameBuffers : null };
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
  const { htmlPath, mode } = parseArgs(process.argv.slice(2));
  const resolvedHtmlPath = ensureHtmlPath(htmlPath);

  const baseTempDir = path.resolve(process.cwd(), 'tmp');
  fs.mkdirSync(baseTempDir, { recursive: true });
  const runDir = path.join(baseTempDir, `capture_${Date.now()}`);
  fs.mkdirSync(runDir, { recursive: true });

  try {
    const mp4File = await captureAndCreateMP4(resolvedHtmlPath, runDir, mode);
    console.log(`Capture complete. Frames and video stored in: ${runDir}`);
    console.log(`MP4 file: ${mp4File}`);
  } catch (error) {
    console.error('Failed to capture HTML content:', error);
    process.exitCode = 1;
  }
}

main();
function frameMatchesViewport(buffer) {
  if (SCREENSHOT_EXTENSION === 'png') {
    if (buffer.length < 24) {
      return false;
    }
    // PNG signature + IHDR chunk
    const signature = buffer.readUInt32BE(0);
    if (signature !== 0x89504e47) {
      return false;
    }
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType !== 'IHDR') {
      return false;
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return width === VIEWPORT.width && height === VIEWPORT.height;
  }
  // For JPEG we skip validation (not used currently).
  return true;
}
