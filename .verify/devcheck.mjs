import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE: " + m.text());
});

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3101/foundation", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

console.log("=== ERRORS (" + errors.length + ") ===");
for (const e of errors.slice(0, 12)) console.log(e.slice(0, 600));
await browser.close();
