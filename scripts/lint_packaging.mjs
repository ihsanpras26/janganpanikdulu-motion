#!/usr/bin/env node
/**
 * Packaging linter for @janganpanikdulu YouTube Shorts.
 * Adapts yt-package / title.py rules to Bahasa Indonesia + Shorts:
 * - Title length: <= 40 chars ideal (mobile safe), <= 60 chars hard max, no #Shorts tag
 * - Card text: <= 4 words and <= 32 chars for feed-size legibility
 * - Zero content-word overlap between title and thumbnail/hook card
 * - Specificity check (number or concrete metric signal)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STOPWORDS_ID = new Set([
  'di', 'ke', 'dari', 'yang', 'dan', 'atau', 'ini', 'itu', 'saat', 'kalau',
  'jika', 'bila', 'pas', 'untuk', 'buat', 'jadi', 'ada', 'adalah', 'pada',
  'dengan', 'dalam', 'karena', 'agar', 'supaya', 'oleh', 'akan', 'bisa',
  'dapat', 'sudah', 'telah', 'belum', 'lagi', 'lebih', 'paling', 'sangat',
  'cuma', 'hanya', 'aja', 'saja', 'kok', 'nih', 'sih', 'dong', 'ya', 'kamu',
  'kita', 'anda', 'nya', 'tak', 'gak', 'nggak', 'tidak', 'bukan', 'jangan',
  'hal', 'cara', 'kenapa', 'apa', 'gimana', 'mengapa', 'seperti', 'kayak'
]);

function normalizeTokens(text) {
  return text
    .toLowerCase()
    .replace(/#shorts\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function contentWords(text) {
  return normalizeTokens(text).filter((w) => !STOPWORDS_ID.has(w));
}

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function lintPackaging({ title, card = '' }) {
  const issues = [];
  const warnings = [];
  const passes = [];

  const cleanTitle = (title || '').trim();
  const cleanCard = (card || '').trim();
  const titleLen = cleanTitle.length;
  const cardLen = cleanCard.length;
  const cardWords = cleanCard ? countWords(cleanCard) : 0;

  if (!cleanTitle) {
    issues.push('Judul kosong.');
  } else {
    if (/#shorts\b/i.test(cleanTitle)) {
      issues.push('Judul mengandung "#Shorts" — hapus karena membuang kuota karakter.');
    }
    if (titleLen > 60) {
      issues.push(`Judul terlalu panjang (${titleLen}/60 karakter). Potong agar tidak terpotong di feed.`);
    } else if (titleLen > 40) {
      warnings.push(`Judul ${titleLen} karakter (di atas batas aman mobile 40 karakter; pastikan kata kunci utama di 40 karakter pertama).`);
    } else {
      passes.push(`Panjang judul ideal untuk mobile (${titleLen}/40 karakter).`);
    }

    if (/\d/.test(cleanTitle) || (cleanCard && /\d/.test(cleanCard))) {
      passes.push('Memiliki angka/metrik spesifik pada pasangan judul/kartu.');
    } else {
      warnings.push('Belum ada angka konkret di judul maupun kartu — pertimbangkan angka terverifikasi jika relevan.');
    }
  }

  if (cleanCard) {
    if (cardWords > 6) {
      issues.push(`Teks kartu thumbnail terlalu padat (${cardWords} kata, maks 4–6 kata agar terbaca di ukuran feed HP).`);
    } else if (cardWords > 4) {
      warnings.push(`Teks kartu thumbnail ${cardWords} kata (target ideal <= 4 kata).`);
    } else {
      passes.push(`Jumlah kata kartu thumbnail ringkas (${cardWords} kata).`);
    }

    if (cardLen > 32) {
      warnings.push(`Teks kartu thumbnail ${cardLen} karakter (disarankan <= 32 karakter).`);
    }

    const titleSet = new Set(contentWords(cleanTitle));
    const cardContent = contentWords(cleanCard);
    const overlap = [...new Set(cardContent.filter((w) => titleSet.has(w)))];

    if (overlap.length > 0) {
      issues.push(`Pengulangan kata antara judul & kartu thumbnail: [${overlap.join(', ')}]. Kartu harus melengkapi judul, bukan mengulanginya.`);
    } else {
      passes.push('Nol pengulangan kata konten antara judul dan kartu thumbnail.');
    }
  } else {
    warnings.push('Tidak ada teks kartu thumbnail (--card) yang diberikan; cek duplikasi judul-kartu dilewati.');
  }

  const status = issues.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS';
  return {
    status,
    title: cleanTitle,
    titleLength: titleLen,
    card: cleanCard,
    cardWords,
    cardLength: cardLen,
    issues,
    warnings,
    passes
  };
}

function parseArgs(argv) {
  const args = { title: '', card: '', file: '', strict: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title' && argv[i + 1] !== undefined) args.title = argv[++i];
    else if (a === '--card' && argv[i + 1] !== undefined) args.card = argv[++i];
    else if (a === '--file' && argv[i + 1] !== undefined) args.file = argv[++i];
    else if (a === '--strict') args.strict = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  node scripts/lint_packaging.mjs --title "<judul>" --card "<teks kartu>" [--strict] [--json]
  node scripts/lint_packaging.mjs --file <candidates.json> [--strict] [--json]`);
      process.exit(0);
    }
  }
  return args;
}

function printReport(result, index = null) {
  const prefix = index !== null ? `[#${index + 1}] ` : '';
  console.log(`\n${prefix}STATUS: ${result.status}`);
  console.log(`  Judul (${result.titleLength} char): "${result.title}"`);
  if (result.card) {
    console.log(`  Kartu (${result.cardWords} kata, ${result.cardLength} char): "${result.card}"`);
  }
  for (const p of result.passes) console.log(`  [OK]   ${p}`);
  for (const w of result.warnings) console.log(`  [WARN] ${w}`);
  for (const e of result.issues) console.log(`  [FAIL] ${e}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  let items = [];

  if (args.file) {
    const raw = fs.readFileSync(path.resolve(args.file), 'utf8');
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } else if (args.title) {
    items = [{ title: args.title, card: args.card }];
  } else {
    console.error('Error: wajib isi --title "..." atau --file <path.json>. Gunakan --help untuk bantuan.');
    process.exit(2);
  }

  const results = items.map(lintPackaging);
  if (args.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    results.forEach((r, idx) => printReport(r, results.length > 1 ? idx : null));
  }

  const hasFail = results.some((r) => r.status === 'FAIL' || (args.strict && r.status === 'WARN'));
  process.exit(hasFail ? 1 : 0);
}
