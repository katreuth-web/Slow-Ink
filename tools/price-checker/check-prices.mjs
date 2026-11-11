#!/usr/bin/env node
// Competitor price checker — drives the webcmd stealth browser over each
// pricing page in competitors.json and writes a dated markdown + JSON report.
//
// Prereqs: `webcmd doctor` must be green (see tools/price-checker/README.md).
// Usage:   node tools/price-checker/check-prices.mjs

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'competitors.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const reportsDir = join(here, 'reports');
mkdirSync(reportsDir, { recursive: true });

const PROFILE = 'pricewatch';
const SESSION_NAME = 'Price Check';

function webcmd(args, input) {
  return execFileSync('webcmd', args, {
    input,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 180_000,
  });
}

// Profile create is idempotent enough to ignore "already exists" failures.
try { webcmd(['profile', 'create', PROFILE]); } catch {}
const sessionOut = webcmd(['--profile', PROFILE, 'session', 'create', SESSION_NAME]);
const sessionId = (sessionOut.match(/id:\s*(\S+)/) || [])[1];
if (!sessionId) throw new Error('Could not create webcmd session:\n' + sessionOut);

// Generic extractor: visible text lines that look like prices, with one line
// of context above each so plan names come along for free.
const extractorFor = (url) => `
await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3500);
const lines = await page.evaluate(() => {
  const text = document.body.innerText || '';
  const rows = text.split('\\n').map(s => s.trim()).filter(Boolean);
  const priceRe = /(?:[$€£]\\s?\\d[\\d.,]*|\\d[\\d.,]*\\s?(?:USD|EUR|GBP))(?:\\s*\\/?\\s*(?:mo|month|yr|year|annually|monthly))?/i;
  const hits = [];
  for (let i = 0; i < rows.length; i++) {
    if (priceRe.test(rows[i]) && rows[i].length < 160) {
      hits.push({ context: rows[i - 1] && rows[i - 1].length < 80 ? rows[i - 1] : '', line: rows[i] });
    }
  }
  return hits.slice(0, 30);
});
return { url: page.url(), title: await page.title(), lines };
`;

const results = [];
for (const c of config.competitors) {
  process.stderr.write(`Checking ${c.name} ... `);
  try {
    const out = webcmd(
      ['--profile', PROFILE, '--session', sessionId, 'browser', 'run', '--stdin', '--no-snapshot-diff', '-f', 'json'],
      extractorFor(c.url),
    );
    const parsed = JSON.parse(out);
    const r = parsed.result ?? parsed;
    results.push({ ...c, ok: true, finalUrl: r.url, title: r.title, prices: r.lines ?? [] });
    process.stderr.write(`ok (${(r.lines ?? []).length} price lines)\n`);
  } catch (err) {
    results.push({ ...c, ok: false, error: String(err).slice(0, 500) });
    process.stderr.write('FAILED\n');
  }
}

try { webcmd(['--profile', PROFILE, 'session', 'close', sessionId]); } catch {}

// Reports
const jsonPath = join(reportsDir, `prices-${today}.json`);
writeFileSync(jsonPath, JSON.stringify({ date: today, results }, null, 2));

let md = `# Competitor prices — ${today}\n\n`;
for (const r of results) {
  md += `## ${r.name}  _(vs ${r.ourProduct})_\n\n`;
  if (!r.ok) {
    md += `Check failed: could not load ${r.url}\n\n`;
    continue;
  }
  md += `Source: ${r.finalUrl}\n\n`;
  if (!r.prices.length) {
    md += `No visible price lines found — the page may gate pricing behind a click or region selector.\n\n`;
    continue;
  }
  md += `| Plan / context | Price line |\n| --- | --- |\n`;
  for (const p of r.prices) {
    md += `| ${(p.context || '—').replaceAll('|', '\\|')} | ${p.line.replaceAll('|', '\\|')} |\n`;
  }
  md += '\n';
}
const mdPath = join(reportsDir, `prices-${today}.md`);
writeFileSync(mdPath, md);

console.log(`Wrote ${mdPath}`);
console.log(`Wrote ${jsonPath}`);
