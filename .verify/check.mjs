import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const BASE = "http://localhost:3100/foundation";
const OUT = path.join(os.tmpdir(), "eps_verify");
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: "mobile-390", width: 390, height: 800 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

const report = { route: BASE, runs: [], consoleErrors: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") report.consoleErrors.push(m.text());
});
page.on("pageerror", (e) => report.consoleErrors.push("PAGEERROR: " + e.message));

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    const hero = document.querySelector("h1");
    const sidebar = document.querySelector("aside");
    const menuBtn = [...document.querySelectorAll("button")].find((b) =>
      /menu|open navigation/i.test(b.getAttribute("aria-label") || b.textContent || "")
    );
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      overflowX: de.scrollWidth - de.clientWidth,
      hasHero: !!hero && /design system/i.test(hero.textContent || ""),
      sidebarVisible: !!sidebar && sidebar.getBoundingClientRect().width > 0 && getComputedStyle(sidebar).display !== "none",
      menuButtonPresent: !!menuBtn,
      h1Text: hero ? hero.textContent : null
    };
  });

  // Exercise a button + modal to verify interaction + focus management
  let modalOpened = false;
  let focusWithinModal = false;
  try {
    const openBtn = page.getByRole("button", { name: "Open modal" });
    await openBtn.click();
    await page.waitForTimeout(300);
    modalOpened = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    if (modalOpened) {
      focusWithinModal = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return dlg ? dlg.contains(document.activeElement) : false;
      });
      // Escape closes
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  } catch (e) {
    report.consoleErrors.push("INTERACTION: " + e.message);
  }

  const shot = path.join(OUT, `foundation-${vp.name}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  const fullShot = path.join(OUT, `foundation-${vp.name}-full.png`);
  await page.screenshot({ path: fullShot, fullPage: true });

  report.runs.push({
    viewport: vp.name,
    width: vp.width,
    ...metrics,
    modalOpened,
    focusWithinModalOnOpen: focusWithinModal,
    screenshots: { viewport: shot, full: fullShot }
  });
}

// Toast interaction check on desktop
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
let toastShown = false;
try {
  await page.getByRole("button", { name: "Success toast" }).click();
  await page.waitForTimeout(400);
  toastShown = await page.evaluate(() => {
    const regions = [...document.querySelectorAll("[role='status'], [aria-live]")];
    return regions.some((r) => /request submitted/i.test(r.textContent || ""));
  });
} catch (e) {
  report.consoleErrors.push("TOAST: " + e.message);
}
report.toastShownOnDesktop = toastShown;

await browser.close();
console.log(JSON.stringify(report, null, 2));
