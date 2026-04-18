/**
 * Descarga el Catecismo de la Iglesia Católica (español) del Vaticano
 * y lo guarda como un solo archivo TXT en fuentes_teologicas/
 * Uso: node scripts/download_catecismo.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://www.vatican.va/archive/catechism_sp/';
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'fuentes_teologicas', 'catecismo_iglesia_catolica_sp.txt');

const PAGES = [
  'lettera-apost_sp.html',
  'aposcons_sp.html',
  'prologue_sp.html',
  'p1s1c1_sp.html',
  'p1s1c2a1_sp.html',
  'p1s1c2a2_sp.html',
  'p1s1c2a3_sp.html',
  'p1s1c3a1_sp.html',
  'p1s1c3a2_sp.html',
  'p1s2_sp.html',
  'p1s2c1p1_sp.html',
  'p1s2c1p2_sp.html',
  'p1s2c1p3_sp.html',
  'p1s2c1p4_sp.html',
  'p1s2c1p5_sp.html',
  'p1s2c1p6_sp.html',
  'p1s2c1p7_sp.html',
  'p1s2c2_sp.html',
  'p1s2c2a2_sp.html',
  'p1s2a3p1_sp.html',
  'p1s2a3p2_sp.html',
  'p122a3p3_sp.html',
  'p122a4p1_sp.html',
  'p122a4p2_sp.html',
  'p122a4p3_sp.html',
  'p122a5p1_sp.html',
  'p122a5p2_sp.html',
  'p1s2c2a6_sp.html',
  'p1s2c2a7_sp.html',
  'p1s2c3_sp.html',
  'p1s2c3a8_sp.html',
  'p1s2c3a9_sp.html',
  'p123a9p1_sp.html',
  'p123a9p2_sp.html',
  'p123a9p3_sp.html',
  'p123a9p4_sp.html',
  'p123a9p5_sp.html',
  'p123a9p6_sp.html',
  'p123a10_sp.html',
  'p123a11_sp.html',
  'p123a12_sp.html',
  'p2_sp.html',
  'p2s1_sp.html',
  'p2s1c1a1_sp.html',
  'p2s1c1a2_sp.html',
  'p2s1c2_sp.html',
  'p2s1c2a1_sp.html',
  'p2s1c2a2_sp.html',
  'p2s2_sp.html',
  'p2s2c1_sp.html',
  'p2s2c1a1_sp.html',
  'p2s2c1a2_sp.html',
  'p2s2c1a3_sp.html',
  'p2s2c2_sp.html',
  'p2s2c2a4_sp.html',
  'p2s2c2a5_sp.html',
  'p2s2c3_sp.html',
  'p2s2c3a6_sp.html',
  'p2s2c3a7_sp.html',
  'p2s2c4a1_sp.html',
  'p2s2c4a2_sp.html',
  'p3_sp.html',
  'p3s1_sp.html',
  'p3s1c1_sp.html',
  'p3s1c1a1_sp.html',
  'p3s1c1a2_sp.html',
  'p3s1c1a3_sp.html',
  'p3s1c1a4_sp.html',
  'p3s1c1a5_sp.html',
  'p3s1c1a6_sp.html',
  'p3s1c1a7_sp.html',
  'p3s1c1a8_sp.html',
  'p3s1c2_sp.html',
  'p3s1c2a1_sp.html',
  'p3s1c2a2_sp.html',
  'p3s1c2a3_sp.html',
  'p3s1c3_sp.html',
  'p3s1c3a1_sp.html',
  'p3s1c3a2_sp.html',
  'p3s1c3a3_sp.html',
  'p3s2_sp.html',
  'p3s2c1_sp.html',
  'p3s2c1a1_sp.html',
  'p3s2c1a2_sp.html',
  'p3s2c1a3_sp.html',
  'p3s2c2_sp.html',
  'p3s2c2a4_sp.html',
  'p3s2c2a5_sp.html',
  'p3s2c2a6_sp.html',
  'p3s2c2a7_sp.html',
  'p3s2c2a8_sp.html',
  'p3s2c2a9_sp.html',
  'p3s2c2a0_sp.html',
  'p4s1_sp.html',
  'p4s1c1_sp.html',
  'p4s1c1a1_sp.html',
  'p4s1c1a2_sp.html',
  'p4s1c1a3_sp.html',
  'p4s1c2_sp.html',
  'p4s1c2a1_sp.html',
  'p4s1c2a2_sp.html',
  'p4s1c2a3_sp.html',
  'p4s1c3_sp.html',
  'p4s1c3a1_sp.html',
  'p4s1c3a2_sp.html',
  'p4s2_sp.html',
  'p4s2a1_sp.html',
  'p4s2a2_sp.html',
  'p4s2a3_sp.html',
];

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchPage(page) {
  const url = BASE_URL + page;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = stripHtml(html);
    return `\n\n${'='.repeat(60)}\n${page}\n${'='.repeat(60)}\n${text}`;
  } catch (err) {
    console.warn(`  ⚠️  Error en ${page}: ${err.message}`);
    return '';
  }
}

async function main() {
  console.log(`📖 Descargando Catecismo de la Iglesia Católica (${PAGES.length} páginas)...\n`);

  let fullText = 'CATECISMO DE LA IGLESIA CATÓLICA\nFuente: vatican.va\n';
  let ok = 0;

  for (let i = 0; i < PAGES.length; i++) {
    const page = PAGES[i];
    process.stdout.write(`  [${i + 1}/${PAGES.length}] ${page} ... `);
    const text = await fetchPage(page);
    if (text) { fullText += text; ok++; process.stdout.write('✅\n'); }
    else process.stdout.write('❌\n');

    // Pausa cortés para no saturar el servidor
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync(OUTPUT_FILE, fullText, 'utf8');
  const kb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`\n✅ Guardado en: ${OUTPUT_FILE}`);
  console.log(`   ${ok}/${PAGES.length} páginas | ${kb} KB`);
}

main().catch(console.error);
