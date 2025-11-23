import { Command } from 'commander';
import { spawn } from 'child_process';
import { mkdir, stat, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import puppeteer, { type Browser, type Page } from 'puppeteer';

type Mode = 'streaming' | 'buffered';
type ImageType = 'png' | 'jpeg';

const DEFAULTS = {
  captureFramerate: 40,
  captureDurationSeconds: 15,
  startupDelayMs: 50,
  navigationTimeoutMs: 20_000,
  viewport: { width: 1200, height: 1732 },
  imageType: 'png' as ImageType,
  jpegQuality: 90,
};

const MODE_STREAMING: Mode = 'streaming';
const MODE_BUFFERED: Mode = 'buffered';
const MAX_STREAM_PENDING_WRITES = 8;

const HEARTBEAT_INTERVAL_MS = 20;
const BASE_TMP_DIR = 'tmp';

const delay = (ms: number) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

let gcWarned = false;
function maybeCollectGarbage() {
  if (typeof global.gc === 'function') {
    global.gc();
  } else if (!gcWarned) {
    console.warn(
      'Garbage collection unavailable. Run node with --expose-gc to reclaim memory between phases.',
    );
    gcWarned = true;
  }
}

type FrameStats = {
  framesCaptured: number;
  framesStored: number;
  skippedInvalidFrames: number;
  frameDurations: number[];
  elapsedMs: number;
  actualFps: number;
};

type CaptureResult = {
  actualFps: number;
  frames: Buffer[] | null;
  stats: FrameStats;
};

type CaptureConfig = {
  framerate: number;
  durationSeconds: number;
  viewport: { width: number; height: number };
  mode: Mode;
  imageType: ImageType;
  jpegQuality?: number;
  navigationTimeoutMs: number;
  startupDelayMs: number;
};

async function ensureFile(path: string): Promise<string> {
  const resolved = resolve(process.cwd(), path);
  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      throw new Error(`Path is not a file: ${resolved}`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`HTML file not found: ${resolved}`);
    }
    throw err;
  }
  return resolved;
}

function parseNumberOption(
  name: string,
  value: string | undefined,
  { positive = true, integer = false }: { positive?: boolean; integer?: boolean } = {},
): number | undefined {
  if (value === undefined) return undefined;
  if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
    throw new Error(`${name} must be a number`);
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`${name} must be a number`);
  }
  if (positive && n <= 0) {
    throw new Error(`${name} must be greater than 0`);
  }
  if (integer && !Number.isInteger(n)) {
    throw new Error(`${name} must be an integer`);
  }
  return n;
}

function parseArgs(argv: string[]): { htmlPath: string; config: CaptureConfig } {
  const program = new Command();
  program
    .argument('<htmlPath>', 'Path to the standalone HTML file to capture (local file only)')
    .option('-m, --mode <mode>', 'streaming | buffered', MODE_STREAMING)
    .option('--fps <number>', 'Capture framerate (default 40)')
    .option('--duration <seconds>', 'Capture duration in seconds (default 15)')
    .option('--width <px>', 'Viewport width (default 1200)')
    .option('--height <px>', 'Viewport height (default 1732)')
    .option('--image-type <png|jpeg>', 'Image type for screencast frames (default png)')
    .option('--jpeg-quality <1-100>', 'JPEG quality (only when --image-type=jpeg; default 90)')
    .parse(argv);

  const opts = program.opts<{
    mode?: Mode;
    fps?: string;
    duration?: string;
    width?: string;
    height?: string;
    imageType?: ImageType;
    jpegQuality?: string;
  }>();
  const modeInput = (opts.mode ?? MODE_STREAMING).toLowerCase() as Mode;
  const mode = modeInput === MODE_BUFFERED || modeInput === MODE_STREAMING ? modeInput : MODE_STREAMING;
  if (modeInput !== mode) {
    console.warn(`Unknown mode "${modeInput}", defaulting to "${MODE_STREAMING}".`);
  }

  const framerate =
    parseNumberOption('fps', opts.fps, { integer: true }) ?? DEFAULTS.captureFramerate;
  const durationSeconds =
    parseNumberOption('duration', opts.duration, { integer: true }) ??
    DEFAULTS.captureDurationSeconds;
  const width =
    parseNumberOption('width', opts.width, { integer: true }) ?? DEFAULTS.viewport.width;
  const height =
    parseNumberOption('height', opts.height, { integer: true }) ?? DEFAULTS.viewport.height;

  const imageTypeInput = (opts.imageType ?? DEFAULTS.imageType).toLowerCase() as ImageType;
  const imageType: ImageType =
    imageTypeInput === 'png' || imageTypeInput === 'jpeg' ? imageTypeInput : DEFAULTS.imageType;
  if (imageTypeInput !== imageType) {
    console.warn(`Unknown image type "${imageTypeInput}", defaulting to "${DEFAULTS.imageType}".`);
  }
  const jpegQuality =
    imageType === 'jpeg'
      ? parseNumberOption('jpeg-quality', opts.jpegQuality, { integer: true }) ??
        DEFAULTS.jpegQuality
      : undefined;
  if (jpegQuality !== undefined && (jpegQuality < 1 || jpegQuality > 100)) {
    throw new Error('jpeg-quality must be between 1 and 100');
  }

  const navigationTimeoutMs = Math.max(
    DEFAULTS.navigationTimeoutMs,
    Math.ceil(durationSeconds * 1000) + DEFAULTS.startupDelayMs + 5000,
  );

  return {
    htmlPath: program.args[0],
    config: {
      framerate,
      durationSeconds,
      viewport: { width, height },
      mode,
      imageType,
      jpegQuality,
      navigationTimeoutMs,
      startupDelayMs: DEFAULTS.startupDelayMs,
    },
  };
}

async function setupPage(browser: Browser, htmlPath: string, config: CaptureConfig): Promise<Page> {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    console.log(`[page:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.error('[page-error]', err);
  });

  await page.setViewport(config.viewport);
  const fileUrl = pathToFileURL(htmlPath).href;
  await page.goto(fileUrl, { waitUntil: 'load', timeout: config.navigationTimeoutMs });
  await page.addStyleTag({
    content: 'html,body,svg{width:100%;height:100%;margin:0;padding:0;overflow:hidden;}',
  });
  await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (svg) {
      svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    }
  });
  await page.evaluate((heartbeatInterval) => {
    if ((window as unknown as { __captureHeartbeatInterval?: number }).__captureHeartbeatInterval) {
      return;
    }
    let toggle = false;
    const target = document.documentElement;
    (window as unknown as { __captureHeartbeatInterval?: number }).__captureHeartbeatInterval =
      window.setInterval(() => {
        target.style.transform = toggle ? 'translateZ(0)' : 'translateZ(0.0001px)';
        toggle = !toggle;
      }, heartbeatInterval);
  }, HEARTBEAT_INTERVAL_MS);

  return page;
}

async function screencastCapture(
  page: Page,
  runDir: string,
  config: CaptureConfig,
): Promise<CaptureResult> {
  const client = await page.target().createCDPSession();
  const bufferFrames = config.mode === MODE_BUFFERED;
  const frameBuffers: Buffer[] | null = bufferFrames ? [] : null;
  let framesCaptured = 0;
  let framesStored = 0;
  let skippedInvalidFrames = 0;
  const frameDurations: number[] = [];

  const captureStart = Date.now();
  let lastFrameTimestamp = captureStart;
  const desiredFrameInterval = 1000 / config.framerate;
  let writeQueue = Promise.resolve();
  let pendingWrites = 0;
  const targetFrameCount = Math.round(config.framerate * config.durationSeconds);

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: config.viewport.width,
    height: config.viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: config.viewport.width,
    screenHeight: config.viewport.height,
  });
  await client.send('Emulation.setVisibleSize', {
    width: config.viewport.width,
    height: config.viewport.height,
  });

  await client.send('Page.startScreencast', {
    format: config.imageType === 'png' ? 'png' : 'jpeg',
    quality: config.imageType === 'png' ? undefined : config.jpegQuality ?? DEFAULTS.jpegQuality,
    everyNthFrame: 1,
    maxWidth: config.viewport.width,
    maxHeight: config.viewport.height,
    captureBeyondViewport: true,
    deviceScaleFactor: 1,
  });

  const frameHandler = async ({
    data,
    sessionId,
  }: {
    data: string;
    sessionId: number;
    metadata?: unknown;
  }) => {
    const now = Date.now();
    frameDurations.push(now - lastFrameTimestamp);
    lastFrameTimestamp = now;

    const elapsed = now - captureStart;
    const expectedStoredFrames = Math.floor(elapsed / desiredFrameInterval);

    if (framesStored < targetFrameCount && expectedStoredFrames > framesStored) {
      const buffer = Buffer.from(data, 'base64');
      if (!frameMatchesViewport(buffer, config)) {
        skippedInvalidFrames += 1;
      } else if (bufferFrames && frameBuffers) {
        frameBuffers.push(buffer);
        framesStored += 1;
      } else {
        const fileName = `frame_${framesStored.toString().padStart(3, '0')}.${config.imageType}`;
        const targetPath = join(runDir, fileName);
        pendingWrites += 1;
        writeQueue = writeQueue.then(async () => {
          try {
            await writeFile(targetPath, buffer);
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

  const frameListener = (event: { data: string; sessionId: number }) => {
    frameHandler(event).catch((err) => {
      console.error('Error handling screencast frame:', err);
    });
  };
  client.on('Page.screencastFrame', frameListener);

  while (framesStored < targetFrameCount) {
    await delay(5);
  }

  await client.send('Page.stopScreencast');
  client.off('Page.screencastFrame', frameListener);
  if (!bufferFrames) {
    await writeQueue;
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
      2,
    )}s (~${actualFps.toFixed(2)} fps). Frame intervals (ms) min/median/max: ${min}/${median}/${max}`,
  );

  return {
    actualFps,
    frames: bufferFrames ? frameBuffers : null,
    stats: {
      framesCaptured,
      framesStored,
      skippedInvalidFrames,
      frameDurations,
      elapsedMs,
      actualFps,
    },
  };
}

function frameMatchesViewport(buffer: Buffer, config: CaptureConfig): boolean {
  if (config.imageType === 'png') {
    if (buffer.length < 24) return false;
    const signature = buffer.readUInt32BE(0);
    if (signature !== 0x89504e47) return false;
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType !== 'IHDR') return false;
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return width === config.viewport.width && height === config.viewport.height;
  }
  return true;
}

async function persistFrames(
  runDir: string,
  frameBuffers: Buffer[],
  imageType: ImageType,
): Promise<void> {
  for (let i = 0; i < frameBuffers.length; i += 1) {
    const fileName = `frame_${i.toString().padStart(3, '0')}.${imageType}`;
    const filePath = join(runDir, fileName);
    await writeFile(filePath, frameBuffers[i]);
    frameBuffers[i] = Buffer.alloc(0);
  }
  frameBuffers.length = 0;
}

async function createVideo(runDir: string, actualFps: number, imageType: ImageType): Promise<string> {
  const mp4File = join(runDir, 'capture.mp4');
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-framerate',
        actualFps.toString(),
        '-i',
        join(runDir, `frame_%03d.${imageType}`),
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
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    ffmpeg.on('error', (err) => {
      rejectPromise(err);
    });
  });

  return mp4File;
}

async function captureAndCreateMP4(htmlPath: string, config: CaptureConfig): Promise<string> {
  const baseTempDir = resolve(process.cwd(), BASE_TMP_DIR);
  await mkdir(baseTempDir, { recursive: true });
  const runDir = join(baseTempDir, `capture_${Date.now()}`);
  await mkdir(runDir, { recursive: true });

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--allow-file-access-from-files',
        '--enable-local-file-accesses',
      ],
    });

    page = await setupPage(browser, htmlPath, config);
    console.log('Page loaded; starting capture...');
    await delay(config.startupDelayMs);

    const { actualFps, frames } = await screencastCapture(page, runDir, config);
    if (config.mode === MODE_BUFFERED && frames) {
      await persistFrames(runDir, frames, config.imageType);
    }

    await page.close();
    page = null;
    await browser.close();
    browser = null;

    maybeCollectGarbage();
    const mp4File = await createVideo(runDir, actualFps, config.imageType);
    maybeCollectGarbage();

    console.log(`Capture complete. Frames and video stored in: ${runDir}`);
    console.log(`MP4 file: ${mp4File}`);
    return mp4File;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // ignore
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}

async function main() {
  try {
    const { htmlPath, config } = parseArgs(process.argv);
    const resolvedHtmlPath = await ensureFile(htmlPath);
    await captureAndCreateMP4(resolvedHtmlPath, config);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
