import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage();
const file = pathToFileURL(path.resolve('second-ground.html')).href;
await page.goto(file, { waitUntil: 'load' });
await page.waitForFunction(() => document.title === 'ready');
const result = await page.evaluate(() => window.__RESULT__);
console.log(JSON.stringify(result, null, 2));
await browser.close();
