// Phase 18.1 — Token governance.
//
// Lightweight check that no RAW HEX COLOR values are introduced inside
// production UI components. The design system is token-driven
// (tailwind.config.ts + app/globals.css); raw hex in components defeats that
// single source of truth.
//
// Scans `components/` by default, PLUS app/globals.css (the one global style
// file that previously held raw hex for selection/focus/scrollbar). Detects 3-
// and 6-digit hex colors like #fff, #ffffff, #000, #123456.
//
// Exit code 0 = clean, 1 = one or more raw hex colors found.
//
// Escape hatches:
//   - a line containing `hex-ignore` is skipped (legitimate non-color hashes)
//   - matches inside `url(...)` / `data:` contexts are skipped (e.g. SVG data
//     URIs), per the "SVG data where not applicable" exclusion.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.argv[2] || "components");
const GLOBALS = path.resolve("app/globals.css");
const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SCAN_EXT = new Set([".ts", ".tsx", ".css"]);

// 3 or 6 hex digits, terminated by a word boundary so a 6-hex hash id is still
// caught but it doesn't bleed into following hex/alnum characters.
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g;

const findings = [];

function scanFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("hex-ignore")) return;
    if (/url\(|data:/.test(line)) return; // skip url()/data: (SVG data URIs)
    // Skip CSS custom-property declarations (e.g. `--color-primary: #2c56d6`).
    // These are legitimate token mirrors of tailwind.config.ts values, not
    // raw color usages in styles.
    if (/--[\w-]+\s*:\s*#/.test(line)) return;
    let m;
    HEX.lastIndex = 0;
    while ((m = HEX.exec(line)) !== null) {
      findings.push({ file, line: i + 1, value: m[0] });
    }
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      scanFile(full);
    }
  }
}

if (!fs.existsSync(ROOT)) {
  console.error(`check-no-hex: target not found: ${ROOT}`);
  process.exit(2);
}

walk(ROOT);
// Global stylesheet is part of the token surface — scan it too.
scanFile(GLOBALS);

if (findings.length === 0) {
  console.log(`check-no-hex: OK — no raw hex colors in ${path.relative(process.cwd(), ROOT)}/`);
  process.exit(0);
}

console.error(`check-no-hex: ${findings.length} raw hex color(s) found in components/`);
for (const f of findings) {
  console.error(`  ${path.relative(process.cwd(), f.file)}:${f.line}  ${f.value}`);
}
console.error("Use semantic tokens (e.g. bg-primary, text-muted-foreground) instead of raw hex.");
process.exit(1);
