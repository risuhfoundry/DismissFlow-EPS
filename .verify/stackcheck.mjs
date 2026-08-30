import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const stacks = [];
page.on("pageerror", (e) => stacks.push(e.stack || e.message));

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3100/foundation", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

console.log("=== PAGEERROR STACKS (" + stacks.length + ") ===");
for (const s of stacks.slice(0, 6)) console.log(s.slice(0, 1200) + "\n---");
await browser.close();
