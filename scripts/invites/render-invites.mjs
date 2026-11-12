// Renders the e-vite cards in this folder to PNG and JPG with headless Chrome.
//
//   node scripts/invites/render-invites.mjs "C:/path/to/output folder"
//
// Each *.html here is one card (600 x 960 CSS px, see invite.css), captured at 2x, so the files
// are 1200 x 1920. PNG is the master; the JPG is the one to text (a quarter of the size, no
// visible difference). Needs Chrome and an internet connection (the fonts come from Google
// Fonts, as on the site). Nothing is uploaded anywhere; Chrome only reads the local files.
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? join(here, "out"));
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.DBG_PORT ?? 9440);
const WIDTH = 600;
const HEIGHT = 960;
const SCALE = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(out, { recursive: true });
const cards = readdirSync(here).filter((f) => f.endsWith(".html"));
if (cards.length === 0) throw new Error("no .html cards in " + here);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(tmpdir(), "invite-render-profile")}`,
    "--no-first-run",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "about:blank",
  ],
  { stdio: "ignore" },
);
process.on("exit", () => chrome.kill());

let page;
for (let i = 0; i < 100 && !page; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    page = list.find((t) => t.type === "page");
  } catch {}
  if (!page) await sleep(200);
}
if (!page) throw new Error("Chrome did not start (is it installed at CHROME?)");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : ok(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((ok, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve: ok, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false });

for (const card of cards) {
  await send("Page.navigate", { url: pathToFileURL(join(here, card)).href });
  // Wait until both fonts are really in and every image has decoded, so no card is captured with a fallback font.
  const ready = `document.fonts.ready.then(() =>
    document.fonts.check('500 52px "Playfair Display"') &&
    document.fonts.check('italic 400 52px "Playfair Display"') &&
    document.fonts.check('600 12px "Source Sans 3"') &&
    [...document.images].every((i) => i.complete && i.naturalWidth > 0))`;
  const start = Date.now();
  while (!(await evaluate(ready))) {
    if (Date.now() - start > 30000) throw new Error(`${card}: fonts or images never loaded (offline?)`);
    await sleep(200);
  }
  await sleep(300);
  const name = basename(card, ".html");
  const png = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(out, `hridee-nyimul-${name}.png`), Buffer.from(png.data, "base64"));
  const jpg = await send("Page.captureScreenshot", { format: "jpeg", quality: 90, captureBeyondViewport: false });
  writeFileSync(join(out, `hridee-nyimul-${name}.jpg`), Buffer.from(jpg.data, "base64"));
  console.log("rendered", `hridee-nyimul-${name}.png + .jpg`, `(${WIDTH * SCALE} x ${HEIGHT * SCALE})`);
}

ws.close();
chrome.kill();
