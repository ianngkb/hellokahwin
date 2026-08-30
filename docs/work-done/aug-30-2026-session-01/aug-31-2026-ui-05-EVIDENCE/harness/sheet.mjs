import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const ctx = await b.newContext({ viewport: { width: 620, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(pathToFileURL(process.argv[2]).href, { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[3], fullPage: true });
await b.close();
