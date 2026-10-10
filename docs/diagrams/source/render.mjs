import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 400)));
// serve this folder first: python3 -m http.server 4455 --bind 127.0.0.1
await page.goto("http://127.0.0.1:4455/diagrams.html");
await page.waitForFunction(() => window.__done, null, { timeout: 180000 });
const out = await page.evaluate(() => window.__out);
const dir = new URL("..", import.meta.url).pathname;
for (const [name, { svg, json }] of Object.entries(out)) {
  writeFileSync(`${dir}/${name}.svg`, svg);
  writeFileSync(`${dir}/${name}.excalidraw`, json);
  // a PNG preview to check the drawing by eye
  const p = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  await p.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
  await p.waitForTimeout(300);
  await p.locator("svg").first().screenshot({ path: `/tmp/${name}.png` });
  await p.close();
  console.log(name, svg.length, "chars");
}
await browser.close();
