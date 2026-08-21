import { expect, test } from "@playwright/test";

async function mockWakeLock(page: import("@playwright/test").Page, reject = false) {
  await page.addInitScript((shouldReject) => {
    class Sentinel extends EventTarget {
      released = false;
      type = "screen";
      async release() { this.released = true; this.dispatchEvent(new Event("release")); }
    }
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request: async () => { if (shouldReject) throw new Error("Wake lock denied for test"); return new Sentinel(); } }
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: async () => undefined });
  }, reject);
}

test("launcher exposes public plugins and private picture controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Don’t Sleep" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose plugins" })).toBeVisible();
  await expect(page.getByText("Text", { exact: true })).toBeVisible();
  await expect(page.getByText("My pictures", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
});

test("starts a protected display session when wake lock succeeds", async ({ page }) => {
  await mockWakeLock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Wake lock active")).toBeVisible();
  await expect(page.getByText("Open another display")).toBeVisible();
});

test("blocks the protected session when wake lock fails", async ({ page }) => {
  await mockWakeLock(page, true);
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Wake lock denied for test")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Don’t Sleep" })).toBeVisible();
});

test("imports a private photo and remembers it after reload", async ({ page }) => {
  await page.goto("/");
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  await page.locator('input[type="file"]').setInputFiles({ name: "approved-test.png", mimeType: "image/png", buffer: onePixelPng });
  await expect(page.getByText("approved-test.png", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("approved-test.png", { exact: true })).toBeVisible();
});

test("adds, persists, and removes a Text plugin message", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Add a message").fill("Remote build is still running");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Remote build is still running", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Remote build is still running", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Remote build is still running" }).click();
  await expect(page.getByText("Remote build is still running", { exact: true })).toHaveCount(0);
});

test("shows the manual display path when Window Management is unavailable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "getScreenDetails", { configurable: true, value: undefined }));
  await page.goto("/");
  await page.getByRole("button", { name: /Detect connected displays/ }).click();
  await expect(page.getByText(/Automatic display placement is not available/)).toBeVisible();
});

test("reloads the cached launcher while offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Don’t Sleep" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
