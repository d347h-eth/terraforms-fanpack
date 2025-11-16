## Video Capture Script

`scripts/capture.js` renders standalone HTML animations into MP4 videos using headless Chromium, CDP screencasting, and ffmpeg. It operates entirely on local files (no HTTP server) to mirror the original viewing environment.

### Pipeline Overview

1. **Chromium setup**
   - Launches headless Chrome via Puppeteer, sets a fixed viewport (default **1200 × 1732** at **40 fps**).  
   - Uses `page.setViewport`, `Emulation.setDeviceMetricsOverride`, and `Emulation.setVisibleSize` so screencast frames match the target resolution exactly.
   - Injects CSS to force `html, body, svg` to fill the viewport and sets `preserveAspectRatio="xMidYMin meet"` to anchor artwork to the top edge for predictable cropping.

2. **Heartbeat repaint**
   - Some pieces pause rendering (“gaps”). Chromium only emits screencast frames on paints, so we toggle the root element’s `translateZ(...)` transform every ~20 ms via `setInterval`. This has no visual effect but guarantees continuous frame emission, preserving those intentional gaps.

3. **Native screencast capture**
   - Uses `Page.startScreencast` instead of repeated `page.screenshot` calls to avoid per-frame raster/PNG overhead. Frames arrive as base64 PNG/JPEG buffers with minimal latency.
   - Buffers frames in memory; disk writes occur after capture so I/O never alters timing.
   - Logs per-frame intervals (min/median/max) and overall elapsed time to diagnose jitter.

4. **Temporal throttling**
   - Screencast streams around 60 fps even if we request 40 fps. We throttle by storing a frame only when real time crosses each `1000 / CAPTURE_FRAMERATE` boundary. This keeps the capture duration close to `CAPTURE_DURATION_SECONDS` without stretching playback.

5. **FFmpeg encoding**
   - After buffering, frames are flushed to `tmp/capture_<timestamp>/frame_###.png`.  
   - ffmpeg ingests them with the **measured** fps (stored frame count ÷ elapsed seconds) and encodes H.264 (`libx264`, `yuv420p`, `CRF 18`, `preset slow`) to `capture.mp4`, ensuring the video duration matches Chrome’s timeline.

6. **Diagnostics and cleanup**
   - Console output confirms page load, reports screencast stats, and prints the output paths.  
   - CDP sessions are detached and Chromium exits even on errors.

### Usage

```bash
npm install
npm run capture -- path/to/animation.html
```

Outputs land under `tmp/capture_<timestamp>` (all frames + `capture.mp4`).

### Customization

- Adjust `CAPTURE_FRAMERATE`, `CAPTURE_DURATION_SECONDS`, and `VIEWPORT` at the top of `scripts/capture.js`.  
- Switch `SCREENSHOT_EXTENSION` to `"jpg"` for smaller buffers.  
- Remove or modify the CSS/JS injections if future HTML pieces already handle alignment or if the heartbeat is unnecessary.  
- To downsample or change duration post-capture, tweak the ffmpeg spawn parameters (`scripts/capture.js::createVideo`).

### Limitations

- All assets must be inline or file-relative; remote URLs won’t load under `file://`.  
- Large resolutions × long captures consume significant RAM while buffering frames.  
- Screencast timing depends on Chrome’s compositor; extreme system load can still reduce actual fps (visible in the logged min/median/max intervals).
