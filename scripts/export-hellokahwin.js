#!/usr/bin/env node
/**
 * Exports all content from the live hellokahwin.com WordPress site via its REST API.
 *
 * Downloads:
 *   - All posts, pages, categories, users, media metadata -> data/hellokahwin-export/content/*.json
 *   - Every media file (original full-size) -> data/hellokahwin-export/media/wp-content/uploads/...
 *     (preserves the uploads path so in-content URLs can be remapped during rebuild)
 *
 * Usage: node scripts/export-hellokahwin.js
 * Safe to re-run: already-downloaded media files are skipped.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const SITE = 'https://hellokahwin.com';
const API = `${SITE}/wp-json/wp/v2`;
const OUT = path.join(__dirname, '..', 'data', 'hellokahwin-export');
const CONTENT_DIR = path.join(OUT, 'content');
const MEDIA_DIR = path.join(OUT, 'media');
const CONCURRENCY = 6;

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'HelloKahwin-Migration/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return { data: await res.json(), totalPages: Number(res.headers.get('x-wp-totalpages') || 1) };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function fetchAll(endpoint, params = '') {
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${API}/${endpoint}?per_page=100&page=${page}${params}`;
    const { data, totalPages: tp } = await fetchJson(url);
    totalPages = tp;
    items.push(...data);
    console.log(`  ${endpoint}: page ${page}/${totalPages} (${items.length} items)`);
    page++;
  } while (page <= totalPages);
  return items;
}

function save(name, data) {
  const file = path.join(CONTENT_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`  saved ${file} (${Array.isArray(data) ? data.length : 1} items)`);
}

function localPathForUrl(url) {
  // https://hellokahwin.com/wp-content/uploads/2025/11/foo.jpg -> media/wp-content/uploads/2025/11/foo.jpg
  const u = new URL(url);
  return path.join(MEDIA_DIR, ...u.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s)));
}

async function downloadFile(url, dest, retries = 3) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'skipped';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'HelloKahwin-Migration/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tmp = `${dest}.part`;
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
      fs.renameSync(tmp, dest);
      return 'downloaded';
    } catch (err) {
      if (attempt === retries) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function downloadPool(jobs) {
  let downloaded = 0;
  let skipped = 0;
  const failures = [];
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      const job = jobs[i++];
      try {
        const result = await downloadFile(job.url, job.dest);
        result === 'skipped' ? skipped++ : downloaded++;
        const done = downloaded + skipped + failures.length;
        if (done % 50 === 0 || done === jobs.length) {
          console.log(`  media: ${done}/${jobs.length} (${downloaded} new, ${skipped} existing, ${failures.length} failed)`);
        }
      } catch (err) {
        failures.push({ url: job.url, error: err.message });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { downloaded, skipped, failures };
}

async function main() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });

  console.log('Fetching content...');
  const posts = await fetchAll('posts', '&status=publish&_embed=1');
  save('posts', posts);
  const pages = await fetchAll('pages', '&_embed=1');
  save('pages', pages);
  const categories = await fetchAll('categories');
  save('categories', categories);
  const users = await fetchAll('users');
  save('users', users);
  const media = await fetchAll('media');
  save('media', media);

  console.log('Building media download list...');
  const jobs = new Map();
  for (const m of media) {
    const url = m.source_url;
    if (url) jobs.set(url, { url, dest: localPathForUrl(url) });
  }
  // Also catch any image URLs referenced in post/page content that aren't in the media library
  const uploadUrlRe = /https?:\/\/(?:www\.)?hellokahwin\.com\/wp-content\/uploads\/[^\s"'<>)\\]+\.(?:jpe?g|png|gif|webp|svg|avif|mp4|pdf)/gi;
  for (const item of [...posts, ...pages]) {
    const html = (item.content?.rendered || '') + (item.excerpt?.rendered || '');
    for (const url of html.match(uploadUrlRe) || []) {
      // strip WP size suffix (-300x200) to also grab the original
      const clean = url.replace(/&#\d+;/g, '');
      if (!jobs.has(clean)) jobs.set(clean, { url: clean, dest: localPathForUrl(clean) });
      const original = clean.replace(/-\d+x\d+(\.\w+)$/, '$1');
      if (!jobs.has(original)) jobs.set(original, { url: original, dest: localPathForUrl(original) });
    }
  }

  console.log(`Downloading ${jobs.size} media files...`);
  const { downloaded, skipped, failures } = await downloadPool([...jobs.values()]);

  const summary = {
    exportedAt: new Date().toISOString(),
    site: SITE,
    counts: {
      posts: posts.length,
      pages: pages.length,
      categories: categories.length,
      users: users.length,
      mediaLibraryItems: media.length,
      mediaFilesRequested: jobs.size,
      mediaDownloaded: downloaded,
      mediaAlreadyPresent: skipped,
      mediaFailed: failures.length,
    },
    failures,
  };
  fs.writeFileSync(path.join(OUT, 'export-summary.json'), JSON.stringify(summary, null, 2));

  console.log('\nDone.');
  console.log(JSON.stringify(summary.counts, null, 2));
  if (failures.length) {
    console.log(`\n${failures.length} failures — see data/hellokahwin-export/export-summary.json`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
