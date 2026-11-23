/**
 * Screen sweep: open every route as every persona in a real headless browser and report any
 * screen that renders the error boundary instead of its content.
 *
 * This catches the class of bug a static check cannot: a page that reads a field the API does
 * not return and throws while rendering. It drives the real app over HTTP, so the API must be
 * running on the target port.
 *
 * Usage: node scripts/sweep-screens.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:12000";
const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, "..", "src", "app");

const ROUTES = readdirSync(appDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => `/${d.name}`)
  .filter((r) => !["/api", "/login"].includes(r))
  .sort();

// The personas a reviewer can sign in as; the userId is the seeded account behind each.
const PERSONAS = [
  ["founder", "U-F-S01"],
  ["investor", "U-I-01"],
  ["startup_relationship", "U-SR1"],
  ["investor_relations", "U-IR1"],
  ["finance", "U-FIN1"],
  ["production", "U-PROD1"],
  ["legal", "U-LEGAL1"],
  ["marketing", "U-MKT1"],
  ["community", "U-COMM1"],
  ["analyst", "U-AN1"],
  ["super_admin", "U-MGMT"],
];

const ERROR_MARKERS = ["Something went wrong", "could not load", "Application error"];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const failures = [];
const consoleErrors = [];
let checked = 0;

/** Check one persona across every route on its own page. */
async function sweepPersona(name, userId) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`${name}: pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`${name}: console: ${m.text()}`);
  });

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const switched = await page
    .evaluate(async (uid) => {
      const res = await fetch("/api/v1/auth/dev-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      return res.status;
    }, userId)
    .catch(() => 0);
  if (switched !== 200) {
    failures.push(`${name}: sign-in failed (HTTP ${switched})`);
    await page.close();
    return;
  }

  for (const route of ROUTES) {
    checked += 1;
    await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 45000 }).catch(() => {});
    // Give client components a moment to fetch and render. A client-side redirect (the shell
    // moving a signed-in user off /login) can destroy the execution context mid-read, so the
    // body read is retried rather than failing the whole sweep.
    await new Promise((r) => setTimeout(r, 500));
    let body = "";
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        body = await page.evaluate(() => document.body.innerText);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    const hit = ERROR_MARKERS.find((m) => body.includes(m));
    if (hit) {
      failures.push(`${name} @ ${route}: "${hit}"`);
      console.log(`  FAIL ${name} @ ${route}`);
    }
  }
  await page.close();
}

try {
  // Warm every route once so Next compiles them before the timed sweep, then sweep personas
  // with a little concurrency; the dev server is the bottleneck, not the browser.
  const warm = await browser.newPage();
  for (const route of ROUTES) {
    await warm.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 45000 }).catch(() => {});
  }
  await warm.close();

  const queue = [...PERSONAS];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const [name, userId] = queue.shift();
      console.log(`  sweep ${name} …`);
      await sweepPersona(name, userId);
    }
  });
  await Promise.all(workers);
} finally {
  await browser.close();
}

console.log(`\nChecked ${checked} persona-route combinations across ${ROUTES.length} routes and ${PERSONAS.length} personas.`);
if (consoleErrors.length) {
  console.log(`\nConsole/page errors (${consoleErrors.length}):`);
  for (const e of [...new Set(consoleErrors)].slice(0, 60)) console.log(`  ${e}`);
}
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("\nALL SCREENS RENDER OK");
