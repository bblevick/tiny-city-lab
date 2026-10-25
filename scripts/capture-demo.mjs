import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0)
  throw Error("Install FFmpeg and ensure it is on PATH.");
await mkdir(".artifacts/demo", { recursive: true });
await mkdir("docs/media", { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4204",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
let browser, context;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4204")).ok) break;
    } catch {}
    await wait(100);
    if (i === 99) throw Error("Demo server failed to start.");
  }
  browser = await chromium.launch({ channel: "chromium", headless: true });
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: ".artifacts/demo", size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage(),
    video = page.video(),
    start = performance.now();
  await page.goto("http://127.0.0.1:4204");
  await page.waitForFunction(() => Boolean(window.tinyCity?.world));
  await wait(1500);
  await page.locator("#van-count").fill("6");
  await page.locator("#van-count").dispatchEvent("change");
  await page.locator("#parcel-count").fill("40");
  await page.locator("#generate").click();
  await wait(2500);
  await page.locator(".dashboard").scrollIntoViewIfNeeded();
  await page.locator("#play").click();
  await wait(8000);
  await page.locator("#toggle").click();
  await wait(4000);
  await page.locator("#reopen").click();
  await page.locator("#city-select").selectOption("manhattan");
  await page.waitForFunction(() => window.tinyCity.city.id === "manhattan");
  await page.locator(".dashboard").scrollIntoViewIfNeeded();
  await page.locator("#play").click();
  await wait(9000);
  await page.locator("#city-select").selectOption("san-francisco");
  await page.waitForFunction(() => window.tinyCity.city.id === "san-francisco");
  await page.locator(".dashboard").scrollIntoViewIfNeeded();
  await page.locator("#tilt").click();
  await page.locator("#zoom-in").click();
  await wait(2500);
  await page.locator("#play").click();
  await wait(8000);
  await page.locator("#save").click();
  await wait(Math.max(0, 51000 - (performance.now() - start)));

  await context.close();
  context = null;
  const source = await video.path();
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      source,
      "-t",
      "50",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      "docs/media/demo.mp4",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw Error(result.stderr);
  console.log("Created docs/media/demo.mp4 (50 seconds).");
} finally {
  await context?.close();
  await browser?.close();
  server.kill();
}
