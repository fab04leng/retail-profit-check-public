// Records the demo walkthrough videos from the real app on its FICTIONAL demo data.
//
//   npm run build && npx vite preview --port 4173 --strictPort &
//   node marketing/scripts/record-videos.mjs [only-this-video-id]
//
// Frames come from Chromium's screencast (sharper than Playwright's built-in recorder); captions,
// a permanent "demo data" badge, a cursor and the title/end cards are overlays drawn in the page.
// ffmpeg encodes H.264 (-preset veryfast) MP4s with a silent audio track, plus an .srt per video.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, go, loadDemo, APP_URL } from './lib.mjs';
import { VIDEOS } from './video-scripts.mjs';

const OUT = process.env.OUT ?? 'marketing/video';
const FPS = 30;

const FORMATS = {
  landscape: { viewport: { width: 1280, height: 720 }, scale: 1.5, size: '1920x1080' },
  vertical: { viewport: { width: 405, height: 720 }, scale: 8 / 3, size: '1080x1920' },
};

const FONT = 'system-ui, "PingFang SC", "Noto Sans SC", "WenQuanYi Zen Hei", sans-serif';
const OVERLAY_CSS = `
  /* Overlays are manual popovers so they can sit above the app's modal <dialog> (top layer). */
  #mk-caption, #mk-badge, #mk-cursor, #mk-card { inset: auto; margin: 0; border: 0; overflow: visible; }
  #mk-caption { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 9998; width: max-content; max-width: 88vw;
    background: rgba(8, 36, 30, 0.92); color: #fff; font: 700 26px/1.35 ${FONT};
    padding: 14px 22px; border-radius: 14px; text-align: center; opacity: 0; transition: opacity .25s; box-shadow: 0 6px 24px rgba(0,0,0,.25); }
  #mk-caption.on { opacity: 1; }
  #mk-badge { position: fixed; right: 14px; top: 64px; z-index: 9997; background: #fdf3dc; color: #5c3d00; border: 1px solid #f0d58a; padding: 0;
    font: 700 14px/1.2 ${FONT}; padding: 6px 10px; border-radius: 8px; }
  #mk-cursor { position: fixed; z-index: 9999; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; padding: 0;
    background: rgba(242, 180, 0, .35); border: 3px solid #f2b400; left: 50%; top: 50%; transition: left .7s ease-in-out, top .7s ease-in-out, transform .15s; pointer-events: none; }
  #mk-cursor.down { transform: scale(.7); }
  #mk-card { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 10000; background: linear-gradient(160deg, #0b4f42, #12715f); color: #fff; display: flex;
    flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 6vw; gap: 18px;
    font-family: ${FONT}; opacity: 0; transition: opacity .4s; pointer-events: none; }
  #mk-card.on { opacity: 1; }
  #mk-card .k { font: 700 22px/1.2 ${FONT}; letter-spacing: .02em; display: flex; align-items: center; gap: 10px; opacity: .95; }
  #mk-card .h { font: 800 54px/1.15 ${FONT}; max-width: 22ch; }
  #mk-card .s { font: 600 26px/1.4 ${FONT}; max-width: 34ch; color: #d8efe9; }
  #mk-card .cta { margin-top: 10px; background: #1f8f4e; color: #fff; font: 800 28px/1.2 ${FONT}; padding: 16px 30px; border-radius: 999px; }
  #mk-card .f { position: absolute; bottom: 4vh; left: 6vw; right: 6vw; font: 500 16px/1.4 ${FONT}; color: #c4e3db; }
  .mk-vertical #mk-caption { font-size: 21px; bottom: 120px; padding: 12px 16px; max-width: 92vw; }
  .mk-vertical #mk-badge { top: auto; bottom: 64px; right: auto; left: 50%; transform: translateX(-50%); font-size: 13px; white-space: nowrap; }
  .mk-vertical #mk-card .h { font-size: 38px; }
  .mk-vertical #mk-card .s { font-size: 20px; }
  .mk-vertical #mk-card .cta { font-size: 21px; padding: 14px 22px; }
  .mk-vertical #mk-card .k { font-size: 18px; }
  .mk-vertical #mk-card .f { font-size: 13px; bottom: 6vh; }
  .nav { position: static !important; }
  html { scroll-behavior: auto !important; }
`;

/** Adds the overlay elements (built with textContent only). */
async function installOverlays(page, format, badgeText) {
  await page.addStyleTag({ content: OVERLAY_CSS });
  await page.evaluate(
    ({ vertical, badgeText }) => {
      if (vertical) document.documentElement.classList.add('mk-vertical');
      for (const id of ['mk-caption', 'mk-badge', 'mk-cursor', 'mk-card']) {
        if (document.getElementById(id)) continue;
        const el = document.createElement('div');
        el.id = id;
        el.setAttribute('popover', 'manual');
        document.body.appendChild(el);
        el.showPopover();
      }
      document.getElementById('mk-badge').textContent = badgeText;
    },
    { vertical: format === 'vertical', badgeText },
  );
}

async function setCard(page, card) {
  await page.evaluate((c) => {
    const el = document.getElementById('mk-card');
    if (!c) {
      el.classList.remove('on');
      return;
    }
    el.replaceChildren();
    const add = (cls, text) => {
      if (!text) return;
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      el.appendChild(d);
    };
    add('k', 'Retail Profit Check');
    add('h', c.title);
    add('s', c.sub);
    add('cta', c.cta);
    add('f', c.foot);
    el.classList.add('on');
  }, card ?? null);
}

class Recorder {
  constructor(page, format) {
    this.page = page;
    this.format = format;
    this.frames = [];
    this.captions = [];
    this.dir = mkdtempSync(join(tmpdir(), 'rpc-frames-'));
  }

  async start() {
    const { viewport, scale } = FORMATS[this.format];
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = join(this.dir, `${String(this.frames.length).padStart(5, '0')}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      this.frames.push({ file, t: metadata.timestamp });
      try {
        await this.cdp.send('Page.screencastFrameAck', { sessionId });
      } catch {
        // The session may already be closed after stop(); that frame is simply the last one.
      }
    });
    await this.cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: Math.round(viewport.width * scale),
      maxHeight: Math.round(viewport.height * scale),
      everyNthFrame: 1,
    });
    await this.page.waitForTimeout(200);
    if (!this.frames.length) throw new Error('screencast produced no frames');
    // Screencast timestamps and Date.now() share the wall clock; captions are timed against the first frame.
    this.t0 = this.frames[0].t;
  }

  now() {
    return Date.now() / 1000 - this.t0;
  }

  async caption(text) {
    const at = this.now();
    const last = this.captions.at(-1);
    if (last && last.end == null) last.end = at;
    if (text) this.captions.push({ start: at, end: null, text });
    await this.page.evaluate((t) => {
      const el = document.getElementById('mk-caption');
      if (t) {
        el.textContent = t;
        el.classList.add('on');
      } else el.classList.remove('on');
    }, text ?? null);
  }

  async stop() {
    const end = this.now();
    const last = this.captions.at(-1);
    if (last && last.end == null) last.end = end;
    await this.cdp.send('Page.stopScreencast');
    this.duration = end;
  }

  encode(name) {
    const list = join(this.dir, 'frames.txt');
    const lines = [];
    const tEnd = this.t0 + this.duration;
    this.frames.forEach((f, i) => {
      const next = Math.min(this.frames[i + 1]?.t ?? tEnd, tEnd);
      lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    lines.push(`file '${this.frames.at(-1).file}'`);
    writeFileSync(list, lines.join('\n'));
    const [w, h] = FORMATS[this.format].size.split('x');
    const mp4 = join(OUT, `${name}.mp4`);
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0', '-i', list,
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-vf', `fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '64k', '-shortest',
      '-movflags', '+faststart',
      mp4,
    ]);
    writeFileSync(join(OUT, `${name}.srt`), toSrt(this.captions));
    rmSync(this.dir, { recursive: true, force: true });
    return mp4;
  }
}

function srtTime(s) {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

function toSrt(caps) {
  return caps.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
}

/** Re-shows the overlays so they sit above a <dialog> that just opened (top layer is ordered by insertion). */
async function raiseOverlays(page) {
  await page.evaluate(() => {
    for (const id of ['mk-badge', 'mk-caption', 'mk-cursor', 'mk-card']) {
      const el = document.getElementById(id);
      el.hidePopover();
      el.showPopover();
    }
  });
}

/** Helpers handed to each video script. */
function actions(page, rec) {
  const wait = (ms) => page.waitForTimeout(ms);

  async function cursorTo(locator) {
    const box = await locator.boundingBox();
    if (!box) throw new Error('cursor target is not visible');
    await page.evaluate(({ x, y }) => {
      const c = document.getElementById('mk-cursor');
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await wait(750);
  }

  async function click(locator) {
    await cursorTo(locator);
    await page.evaluate(() => document.getElementById('mk-cursor').classList.add('down'));
    await wait(150);
    await locator.click();
    await page.evaluate(() => document.getElementById('mk-cursor').classList.remove('down'));
  }

  /** Smooth scroll so the element's top sits `offset` px below the top of the viewport. */
  async function scrollTo(locatorOrY, { offset = 70, ms = 900 } = {}) {
    const target = typeof locatorOrY === 'number'
      ? locatorOrY
      : await locatorOrY.evaluate((el, off) => el.getBoundingClientRect().top + window.scrollY - off, offset);
    await page.evaluate(({ to, ms }) => new Promise((done) => {
      const from = window.scrollY;
      const start = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        window.scrollTo(0, from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    }), { to: Math.max(0, target), ms });
  }

  async function nav(path) {
    await scrollTo(0, { ms: 400 });
    const link = page.locator(`nav.nav a[href="#/${path}"]`);
    await link.evaluate((el) => el.scrollIntoView({ inline: 'center', block: 'nearest' }));
    await click(link);
    await page.locator('#page-title').waitFor();
    await wait(400);
  }

  return {
    page, wait, cursorTo, click, scrollTo, nav,
    caption: (t) => rec.caption(t),
    card: (c) => setCard(page, c),
    raise: () => raiseOverlays(page),
    go: (p) => go(page, p),
  };
}

async function record(video) {
  const { viewport, scale } = FORMATS[video.format];
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  if (video.startOn === 'health') {
    await loadDemo(page, video.lang);
  } else {
    await page.goto(APP_URL);
    if (video.lang !== 'en') await page.getByTestId('lang').selectOption(video.lang);
  }
  await installOverlays(page, video.format, video.badge);
  await setCard(page, video.intro);
  await page.waitForTimeout(600);

  const rec = new Recorder(page, video.format);
  await rec.start();
  await video.run(actions(page, rec));
  await rec.stop();
  const file = rec.encode(video.id);
  await browser.close();
  if (errors.length) throw new Error(`${video.id}: page errors: ${errors.join('; ')}`);
  return { file, seconds: rec.duration };
}

mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
for (const video of VIDEOS.filter((v) => !only || v.id === only)) {
  const { file, seconds } = await record(video);
  console.log(`${file}  ${seconds.toFixed(1)} s`);
}
