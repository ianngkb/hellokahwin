#!/usr/bin/env node
/**
 * The anti-fabrication gate for a drafted `Soalan lazim` block.
 *
 * SEO-13's one unbendable rule is "do not invent questions to raise the count",
 * and the failure it is really guarding against is not an invented QUESTION —
 * it is an invented FIGURE inside an answer. A plausible ringgit price, a
 * plausible section number, a plausible capacity: nobody catches those by
 * reading, because they read exactly like the real ones.
 *
 * So this gate does not ask a reviewer to be careful. It extracts every
 * FACT-BEARING TOKEN from each answer — money, years, statute sections, bare
 * numbers, capitalised proper nouns — and asserts each one appears in the
 * article's own body text. A token that does not appear in the body is a claim
 * the article does not make, and the run fails.
 *
 * It is deliberately a token check and not a semantic one. A semantic check
 * would need a judgement, and a judgement is what already failed twelve times
 * in this company's tabulated list. A token either is in the body or it is not.
 *
 * KNOWN AND ACCEPTED LIMIT: this gate cannot catch an answer that reuses the
 * body's own numbers to say something the body does not say. That is what the
 * `support` field and the human read are for, and both are still required. A
 * gate that catches the mechanical half is worth having; pretending it catches
 * the other half is not.
 *
 * Usage:
 *   node scripts/seo/faq-verify-support.mjs <drafts-dir> <bodies-dir>
 *
 * Exit 0 clean, 1 on any unsupported token or shape error.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [draftsDir, bodiesDir] = process.argv.slice(2);
if (!draftsDir || !bodiesDir) {
  console.error('usage: node scripts/seo/faq-verify-support.mjs <drafts-dir> <bodies-dir>');
  process.exit(2);
}

/** Mirrors `FAQ_MIN_QUESTIONS` in src/lib/inspire/faq-schema.ts. */
const FAQ_MIN_QUESTIONS = 2;

/**
 * ⚠ THE FIRST VERSION OF THIS FUNCTION TREATED EVERY CAPITALISED WORD AS A NAME
 * AND FAILED 20 OF 24 FILES ON MALAY SENTENCE OPENERS — `Ambil`, `Ketiga`,
 * `Bergantung`, `Macam`, `Sahkah`. Sixteen of those twenty failures were the
 * checker, not the drafts.
 *
 * That is the exact shape this company has tabulated twelve times: a check
 * returns a surprising result and the result gets believed. Worth writing down
 * that the NOISY direction is the dangerous one here, not the quiet one — a
 * gate that cries wolf on two thirds of a clean corpus is a gate somebody
 * switches off, and then the one real fabrication walks through.
 *
 * The signal is not capitalisation. It is capitalisation WHERE CAPITALISATION IS
 * NOT ALREADY EXPLAINED — that is, mid-sentence. So a word opening the string or
 * following `.` `?` `!` `:` is skipped: its capital is grammar. The short list
 * below catches the remainder, Malay words that legitimately take a capital
 * mid-sentence after a comma or a quote.
 */
const NOT_A_PROPER_NOUN = new Set([
  'Adakah',
  'Apa',
  'Apabila',
  'Bagaimana',
  'Bagi',
  'Berapa',
  'Bila',
  'Bolehkah',
  'Dalam',
  'Dan',
  'Di',
  'Ini',
  'Itu',
  'Jadi',
  'Jika',
  'Kalau',
  'Ke',
  'Kemudian',
  'Maksudnya',
  'Mengikut',
  'Nama',
  'Namun',
  'Pada',
  'Perlukah',
  'Sebab',
  'Selepas',
  'Sesuatu',
  'Siapa',
  'Tanpa',
  'Tetapi',
  'Tidak',
  'Untuk',
  'Wajibkah',
  'Ya',
  'Yang',
]);

/** Trailing sentence punctuation that a greedy number match drags in. */
const trimNum = (s) => s.replace(/[.,]+$/, '');

/** Fact-bearing tokens: money, sections, years, bare numbers, proper nouns. */
function tokens(text) {
  const out = new Set();
  // RM figures. The trailing trim matters: `RM4,000.` ending a sentence is
  // `RM4,000`, and without it every sentence-final price reads as unsupported.
  for (const m of text.matchAll(/RM\s?\d[\d,.]*/gi))
    out.add(trimNum(m[0].replace(/\s/g, '').toUpperCase()));
  // Any standalone number of two digits or more (years, sections, counts).
  for (const m of text.matchAll(/(?<![\w.,])\d[\d,.]*\d(?![\w])/g)) out.add(trimNum(m[0]));
  // Capitalised words NOT explained by sentence position.
  for (const m of text.matchAll(/[A-Z][a-zA-Z'’]+/g)) {
    const word = m[0];
    if (word.length <= 2 || NOT_A_PROPER_NOUN.has(word)) continue;
    const before = text.slice(0, m.index).replace(/["'“”‘’()\s]+$/, '');
    if (before === '' || /[.?!:]$/.test(before)) continue;
    out.add(word);
  }
  return out;
}

/**
 * Loose containment: case-insensitive, whitespace-insensitive, and tolerant of
 * the two ways a true figure legitimately differs in wording from its source.
 *
 * Both were found by running the gate, not by reasoning about it, and both were
 * REAL facts the first version scored as fabrications:
 *
 *   - **Thousands separators.** The body writes `1000 tetamu`; house style
 *     writes `1,000`. So digits are compared with separators stripped from both
 *     sides. This costs a little strictness — `1500` would now also match
 *     inside `21500` — and that is the right trade for a gate whose job is to
 *     catch a figure that is NOWHERE in the article, not to police formatting.
 *   - **Malay clitics.** `Instagramnya` is `Instagram` + `-nya`, and `Instagram`
 *     appears in that body 14 times. A gate for Malay prose that does not know
 *     `-nya`, `-lah`, `-kah`, `-pun`, `-mu`, `-ku` will fail on ordinary Malay.
 */
const CLITIC = /(nya|lah|kah|pun|mu|ku)$/i;

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/\s+/g, '');

function bodyHas(bodyNorm, token) {
  const t = normalise(token);
  if (bodyNorm.includes(t)) return true;
  const stripped = t.replace(CLITIC, '');
  return stripped.length > 2 && stripped !== t && bodyNorm.includes(stripped);
}

let failures = 0;
let checked = 0;
const summary = [];

for (const file of readdirSync(draftsDir).filter((f) => f.endsWith('.json'))) {
  const draft = JSON.parse(readFileSync(join(draftsDir, file), 'utf8'));
  const slug = draft.slug ?? file.replace(/\.json$/, '');

  if (draft.notApplicable) {
    summary.push(`  n/a       ${slug}  — ${draft.notApplicable}`);
    continue;
  }

  let body;
  try {
    body = readFileSync(join(bodiesDir, `${slug}.md`), 'utf8');
  } catch {
    console.log(`  NO BODY   ${slug} — cannot verify, treated as a failure`);
    failures++;
    continue;
  }
  const bodyNorm = normalise(body);

  const problems = [];
  if (!Array.isArray(draft.entries) || draft.entries.length < FAQ_MIN_QUESTIONS) {
    problems.push(
      `only ${draft.entries?.length ?? 0} entries — the emitter needs ${FAQ_MIN_QUESTIONS}`,
    );
  }
  if (![2, 3].includes(draft.headingLevel)) {
    problems.push(`headingLevel ${draft.headingLevel} is not 2 or 3`);
  }

  for (const e of draft.entries ?? []) {
    checked++;
    if (!e.question?.trim().endsWith('?')) {
      problems.push(`question does not end in "?": ${e.question}`);
    }
    if (!e.answer?.trim()) problems.push(`empty answer for: ${e.question}`);
    if (!e.support?.trim()) problems.push(`no support for: ${e.question}`);
    const words = (e.answer ?? '').trim().split(/\s+/).length;
    if (words < 20 || words > 110) problems.push(`answer is ${words} words: ${e.question}`);

    for (const tok of tokens(`${e.question} ${e.answer}`)) {
      if (!bodyHas(bodyNorm, tok)) problems.push(`UNSUPPORTED TOKEN "${tok}" in: ${e.question}`);
    }
  }

  if (problems.length) {
    failures++;
    summary.push(`  FAIL      ${slug}`);
    for (const p of problems) summary.push(`              ${p}`);
  } else {
    summary.push(`  ok        ${slug}  (${draft.entries.length} Q, h${draft.headingLevel})`);
  }
}

console.log(`FAQ draft support gate — ${draftsDir}`);
console.log(summary.join('\n'));
console.log(`\n${checked} answers checked, ${failures} file(s) failing`);
process.exit(failures > 0 ? 1 : 0);
