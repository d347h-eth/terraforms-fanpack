## Video Capture Script

The script renders standalone HTML animations into MP4 videos using headless Chromium, CDP screencasting, and ffmpeg. It operates entirely on local files (no HTTP server).

## Setup

```bash
cd scripts/video_capture
npm install
```

- Requires Node 20+, ffmpeg on PATH, and a local HTML file (inline assets) to capture.
- `tmp/capture_<timestamp>` is created automatically for frames and the resulting `capture.mp4`.

## Usage

```bash
NODE_OPTIONS=--expose-gc npm run capture -- path/to/animation.html
```

Options:
- `--mode streaming` (default): write frames to disk as they arrive with a small pending-write buffer.
- `--mode buffered`: keep all frames in memory, then flush to disk before encoding.
- `--fps <n>`: capture framerate (default `40`).
- `--duration <seconds>`: capture duration in seconds (default `15`); also extends the navigation timeout.
- `--width <px>` / `--height <px>`: viewport dimensions (default `1200x1732`).
- `--image-type <png|jpeg>`: screencast image format (default `png`).
- `--jpeg-quality <1-100>`: JPEG quality (only when `--image-type=jpeg`; default `90`).

Defaults live at the top of `src/index.ts`. The script logs stored/received frame counts, interval stats, and the measured FPS fed to ffmpeg.

Example:

```bash
NODE_OPTIONS=--expose-gc npm run capture -- path/to/animation.html --fps 90 --duration 60
```
## Pipeline Overview

1. **Chromium setup**
   - Launches headless Chrome via Puppeteer, sets a fixed viewport (default **1200 × 1732** at **40 fps**).
   - Uses `page.setViewport`, `Emulation.setDeviceMetricsOverride`, and `Emulation.setVisibleSize` so screencast frames match the target resolution exactly.
   - Injects CSS to force `html, body, svg` to fill the viewport and sets `preserveAspectRatio="xMidYMin meet"` to anchor artwork to the top edge for predictable cropping.

2. **Heartbeat repaint**
   - Some pieces pause rendering (“gaps”). Chromium only emits screencast frames on paints, so we toggle the root element's `translateZ(...)` transform every ~20 ms via `setInterval`. This has no visual effect but guarantees continuous frame emission, preserving those intentional gaps.

3. **Native screencast capture**
   - Uses `Page.startScreencast` instead of repeated `page.screenshot` calls to avoid per-frame raster/PNG overhead. Frames arrive as base64 PNG/JPEG buffers with minimal latency, and PNG headers are verified before a frame is considered valid to avoid early frames at wrong dimensions.
   - Supports two modes: **streaming** (default) writes frames to disk sequentially via an async queue so each buffer is released immediately after it hits disk; **buffered** (`--mode buffered`) stores every frame in memory and flushes once at the end for the fastest encode path when RAM is available.
   - Logs per-frame intervals (min/median/max) and overall elapsed time to diagnose jitter.

4. **Temporal throttling**
   - Screencast streams around 60 fps even if we request 40 fps. We throttle by storing a frame only when real time crosses each `1000 / CAPTURE_FRAMERATE` boundary. This keeps the capture duration close to `CAPTURE_DURATION_SECONDS` without stretching playback.

5. **FFmpeg encoding**
   - After buffering, frames are flushed to `tmp/capture_<timestamp>/frame_###.png`.
   - ffmpeg ingests them with the **measured** fps (stored frame count ÷ elapsed seconds) and encodes H.264 (`libx264`, `yuv420p`, `CRF 18`, `preset slow`) to `capture.mp4`, ensuring the video duration matches Chrome's timeline.

6. **Diagnostics and cleanup**
   - Console output confirms page load, reports screencast stats, and prints the output paths.
   - CDP sessions are detached and Chromium exits even on errors.

## Limitations

- All assets must be inline or file-relative; remote URLs won't load under `file://`.
- Large resolutions × long captures consume significant RAM while buffering frames.
- Screencast timing depends on Chrome's compositor; extreme system load can still reduce actual fps (visible in the logged min/median/max intervals).
