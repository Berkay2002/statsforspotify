import { expect, test } from "@playwright/test";

test("standard motion reveals the landing heading", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("h1").locator("..")).toHaveCSS("opacity", "1");
});

test("landing, filters, and sign-in dialog render without errors", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Capture offscreen content without scroll-triggered animation hiding it.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page).toHaveTitle("Stats for Spotify");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("h1").locator("..")).toHaveCSS("opacity", "1");
  for (const artwork of await page.locator("main img").all()) {
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toHaveJSProperty("complete", true);
    await expect(artwork).not.toHaveJSProperty("naturalWidth", 0);
  }
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
  await page.screenshot({ path: testInfo.outputPath("landing.png"), fullPage: true, scale: "css" });
  await page.screenshot({ path: testInfo.outputPath("landing-viewport.png"), scale: "css" });
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Snapshot replay", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rank drift", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rank drift", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /connect spotify|connect with spotify|start tracking|sign in/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Spotify" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("anonymous protected navigation redirects home and APIs reject requests", async ({ page, request }) => {
  for (const path of ["/dashboard", "/profile", "/dashboard/friends"]) {
    await page.goto(path);
    await expect(page).toHaveURL("http://127.0.0.1:3100/");
  }
  for (const path of ["/api/user/delete-data", "/api/user/delete-account", "/api/snapshot"]) {
    const response = await request.post(path);
    expect(response.status()).toBe(401);
  }
});

test("public information pages remain reachable", async ({ page }) => {
  for (const path of ["/privacy", "/terms"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible();
  }
});
