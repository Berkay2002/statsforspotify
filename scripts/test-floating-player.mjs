/* global Bun */
// Run with bun run test:player. Install the browser with bunx playwright install chromium.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

if (process.argv.includes("--bundle")) {
  const bundle = await Bun.build({
    entrypoints: ["tests/fixtures/floating-player.tsx"],
    target: "browser",
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    plugins: [{
      name: "spotify-test-boundary",
      setup(build) {
        build.onResolve({ filter: /^next\/image$/ }, () => ({
          path: resolve("tests/fixtures/next-image.tsx"),
        }));
        build.onResolve({ filter: /^@\/lib\/spotify\/player-context$/ }, () => ({
          path: resolve("tests/fixtures/spotify-player.tsx"),
        }));
      },
    }],
  });
  if (!bundle.success) throw new Error(bundle.logs.join("\n"));
  process.stdout.write(await bundle.outputs[0].text());
  process.exit(0);
}
console.log("Bundling the player browser fixture...");
const javascript = execFileSync("bun", [fileURLToPath(import.meta.url), "--bundle"], { maxBuffer: 20 * 1024 * 1024 });
console.log("Compiling the app stylesheet...");
const css = await postcss([tailwindcss()]).process(await readFile("app/globals.css", "utf8"), { from: resolve("app/globals.css") });
const server = createServer((request, response) => {
  if (request.url === "/player.js") {
    response.writeHead(200, { "Content-Type": "text/javascript" });
    response.end(javascript);
  } else if (request.url === "/player.css") {
    response.writeHead(200, { "Content-Type": "text/css" });
    response.end(css.css);
  } else if (request.url === "/test-album.svg" || request.url.startsWith("/_next/image")) {
    response.writeHead(200, { "Content-Type": "image/svg+xml" });
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="sky" x2="1" y2="1"><stop stop-color="#354a62"/><stop offset="1" stop-color="#121f38"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h640v640H0z"/><circle cx="320" cy="260" r="150" fill="#e4b592"/><path d="M0 440 260 240 400 420 640 220v420H0" fill="#203b3a"/><path d="m0 560 230-170 240 210 170-140v180H0" fill="#0e2428"/></svg>');
  } else {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end('<!doctype html><html class="dark"><head><link rel="stylesheet" href="/player.css"></head><body><div id="root"></div><script type="module" src="/player.js"></script></body></html>');
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
console.log("Starting Chromium...");
const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
const page = await context.newPage();
const player = page.getByRole("region", { name: "Now playing player" });
const handle = page.getByRole("button", { name: "Move player", exact: true });
const url = `http://127.0.0.1:${server.address().port}`;
const screenshotDir = process.env.PLAYER_TEST_SCREENSHOTS;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
const box = () => player.boundingBox();
const insideViewport = async () => {
  const bounds = await box();
  const viewport = page.viewportSize();
  assert(bounds.x >= 0 && bounds.y >= 0);
  assert(bounds.x + bounds.width <= viewport.width + 1);
  assert(bounds.y + bounds.height <= viewport.height + 1);
};
async function openPlayer() {
  const options = page.getByRole("button", { name: "Desktop player options" });
  if (await options.getAttribute("aria-expanded") !== "true") await options.click();
  await page.getByRole("button", { name: "Open desktop player", exact: true }).click();
}

try {
  await page.goto(url);
  await expect(player).toBeVisible();
  const start = await box();
  const grip = await handle.boundingBox();
  await page.mouse.move(grip.x + 20, grip.y + 15);
  await page.mouse.down();
  await page.mouse.move(grip.x + 320, grip.y + 215, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await box()).x).toBeGreaterThan(start.x + 250);
  const moved = await box();
  await page.reload();
  await expect.poll(async () => (await box())?.x).toBe(moved.x);
  await expect.poll(async () => (await box())?.y).toBe(moved.y);
  console.log("PASS pointer dragging and position persistence");

  await handle.focus();
  await handle.press("ArrowRight");
  await expect.poll(async () => (await box()).x).toBe(moved.x + 10);
  await handle.press("Home");
  await expect.poll(async () => (await box()).x).toBe(20);
  await page.getByRole("button", { name: "Minimize player", exact: true }).click();
  await handle.focus();
  for (let i = 0; i < 30; i++) await handle.press("Shift+ArrowDown");
  await page.getByRole("button", { name: "Expand player", exact: true }).click();
  await expect.poll(async () => { const b = await box(); return b.y + b.height; }).toBeLessThanOrEqual(792);
  await page.setViewportSize({ width: 800, height: 400 });
  await expect.poll(async () => { const b = await box(); return b.y + b.height; }).toBeLessThanOrEqual(400);
  await insideViewport();
  console.log("PASS keyboard movement, reset, expansion and viewport bounds");

  await page.setViewportSize({ width: 1280, height: 800 });
  await handle.press("Home");
  const beforeControls = await box();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  assert.equal((await box()).x, beforeControls.x);
  if (screenshotDir) await player.screenshot({ path: resolve(screenshotDir, "in-page-player.png") });
  console.log("PASS playback controls do not drag the player");

  assert(await page.evaluate(() => "documentPictureInPicture" in window), "Chromium must support native Document PiP");
  const pipCreated = context.waitForEvent("page");
  await page.getByRole("button", { name: "Minimize player", exact: true }).click();
  await openPlayer();
  const pip = await pipCreated;
  // Headless Chromium inherits the test viewport instead of the requested native size.
  await pip.setViewportSize({ width: 420, height: 480 });
  await expect(pip.getByRole("region", { name: "Now playing player" })).toBeVisible();
  await expect(player).toHaveCount(0);
  await expect(pip.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect.poll(() => pip.getByRole("region").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
  await expect(pip.getByRole("button", { name: "Expand player", exact: true })).toHaveCount(0);
  const cover = pip.getByRole("img", { name: "Test album", exact: true });
  await expect.poll(() => cover.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  const overlay = pip.getByRole("group", { name: "Playback controls", exact: true });
  await pip.mouse.move(-10, -10);
  await expect(overlay).toHaveCSS("opacity", "0");
  if (screenshotDir) await pip.screenshot({ path: resolve(screenshotDir, "desktop-player-idle.png") });
  await pip.bringToFront();
  await expect(pip.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
  await pip.getByRole("button", { name: "Pause", exact: true }).focus();
  await expect(overlay).toHaveCSS("opacity", "1");
  await pip.evaluate(() => document.activeElement.blur());
  await pip.mouse.move(210, 180);
  await expect(overlay).toHaveCSS("opacity", "1");
  if (screenshotDir) await pip.screenshot({ path: resolve(screenshotDir, "desktop-player-hover.png") });
  await pip.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(pip.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await pip.getByRole("slider", { name: "Seek", exact: true }).fill("60000");
  await expect(pip.getByRole("slider", { name: "Seek", exact: true })).toHaveValue("60000");
  await pip.getByRole("slider", { name: "Volume", exact: true }).fill("0.25");
  await expect(pip.getByRole("slider", { name: "Volume", exact: true })).toHaveValue("0.25");
  await expect(pip.getByRole("button", { name: "Next track", exact: true })).toBeEnabled();
  await pip.getByRole("slider", { name: "Volume", exact: true }).fill("0");
  await pip.getByRole("button", { name: "Unmute", exact: true }).click();
  // Let the slider's debounce expire to catch stale updates undoing unmute.
  await page.waitForTimeout(350);
  await expect(pip.getByRole("slider", { name: "Volume", exact: true })).toHaveValue("0.25");
  console.log("PASS artwork layout, independent minimized state, hover/focus controls, seeking and volume");

  for (const size of [{ width: 800, height: 560 }, { width: 240, height: 260 }, { width: 420, height: 480 }]) {
    await pip.setViewportSize(size);
    assert(await pip.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
  }
  await pip.getByRole("button", { name: "Next track", exact: true }).click();
  await expect(pip.getByText("Next track", { exact: true })).toBeVisible();
  if (screenshotDir) await pip.screenshot({ path: resolve(screenshotDir, "desktop-player.png") });
  await pip.getByRole("button", { name: "Return player to website", exact: true }).click();
  await expect(player).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand player", exact: true })).toBeVisible();
  await expect(page.getByText("Next track", { exact: true })).toBeVisible();
  assert(pip.isClosed());
  console.log("PASS native PiP, copied styles, shared playback state and return control");

  const secondCreated = context.waitForEvent("page");
  await openPlayer();
  const second = await secondCreated;
  await second.close();
  await expect(player).toBeVisible();
  const thirdCreated = context.waitForEvent("page");
  await openPlayer();
  const third = await thirdCreated;
  await page.getByRole("button", { name: "Unmount player", exact: true }).click();
  await expect.poll(() => third.isClosed()).toBe(true);
  console.log("PASS window close restores player; unmount closes the pop-out");

  await page.reload();
  await page.evaluate(() => Object.defineProperty(window, "documentPictureInPicture", { value: undefined, configurable: true }));
  await openPlayer();
  await expect(page.getByRole("alert")).toContainText("unavailable in this browser");
  await expect(player).toBeVisible();
  await page.reload();
  await page.evaluate(() => Object.defineProperty(window, "documentPictureInPicture", { value: { requestWindow: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) }, configurable: true }));
  await openPlayer();
  await expect(page.getByRole("alert")).toContainText("could not open");
  await expect(player).toBeVisible();
  console.log("PASS unsupported and denied PiP keep the in-page player usable");

  await page.evaluate(() => localStorage.setItem("floating-player-position", '{"x":999999,"y":999999}'));
  await page.reload();
  await expect(player).toBeVisible();
  await expect.poll(async () => { const b = await box(); return b.x + b.width; }).toBeLessThanOrEqual(1280);
  await insideViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(handle).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desktop player options" })).toHaveCount(0);
  await expect.poll(async () => (await box()).width).toBe(390);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("player-visibility-change", { detail: { visible: false } })));
  await expect(player).toHaveCount(0);
  console.log("PASS stale saved positions and mobile layout/visibility");
  assert.deepEqual(errors, []);
  console.log("All floating-player browser checks passed without runtime errors.");
} finally {
  if (errors.length) console.error("Browser errors:", errors);
  await browser.close();
  server.close();
}
