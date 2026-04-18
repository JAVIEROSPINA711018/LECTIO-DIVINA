/**
 * Descarga documentos del Magisterio de la Iglesia Católica del Vaticano
 * y los guarda como archivos TXT separados en fuentes_teologicas/
 * Uso: node scripts/download_vatican_docs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'fuentes_teologicas');

// ─── Documentos a descargar ───────────────────────────────────
// Cada entrada puede ser una URL única o un array de URLs (para docs multi-página)
const DOCUMENTS = [

  // ── Concilio Vaticano II ──────────────────────────────────────
  {
    filename: 'dei_verbum_vaticano_ii_sp.txt',
    title: 'Dei Verbum — Constitución Dogmática sobre la Divina Revelación (Vaticano II, 1965)',
    urls: ['https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_sp.html'],
  },
  {
    filename: 'lumen_gentium_vaticano_ii_sp.txt',
    title: 'Lumen Gentium — Constitución Dogmática sobre la Iglesia (Vaticano II, 1964)',
    urls: ['https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19641121_lumen-gentium_sp.html'],
  },
  {
    filename: 'sacrosanctum_concilium_vaticano_ii_sp.txt',
    title: 'Sacrosanctum Concilium — Constitución sobre la Sagrada Liturgia (Vaticano II, 1963)',
    urls: ['https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19631204_sacrosanctum-concilium_sp.html'],
  },
  {
    filename: 'gaudium_et_spes_vaticano_ii_sp.txt',
    title: 'Gaudium et Spes — Constitución Pastoral sobre la Iglesia en el Mundo Actual (Vaticano II, 1965)',
    urls: ['https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651207_gaudium-et-spes_sp.html'],
  },

  // ── Documentos sobre la Sagrada Escritura ─────────────────────
  {
    filename: 'verbum_domini_benedicto_xvi_sp.txt',
    title: 'Verbum Domini — Exhortación Apostólica sobre la Palabra de Dios (Benedicto XVI, 2010)',
    urls: ['https://www.vatican.va/content/benedict-xvi/es/apost_exhortations/documents/hf_ben-xvi_exh_20100930_verbum-domini.html'],
  },
  {
    filename: 'divino_afflante_spiritu_pio_xii_sp.txt',
    title: 'Divino Afflante Spiritu — Encíclica sobre los Estudios Bíblicos (Pío XII, 1943)',
    urls: ['https://www.vatican.va/content/pius-xii/es/encyclicals/documents/hf_p-xii_enc_30091943_divino-afflante-spiritu.html'],
  },
  {
    filename: 'providentissimus_deus_leon_xiii_sp.txt',
    title: 'Providentissimus Deus — Encíclica sobre el Estudio de la Sagrada Escritura (León XIII, 1893)',
    urls: ['https://www.vatican.va/content/leo-xiii/es/encyclicals/documents/hf_l-xiii_enc_18111893_providentissimus-deus.html'],
  },

  // ── Encíclicas doctrinales ────────────────────────────────────
  {
    filename: 'fides_et_ratio_juan_pablo_ii_sp.txt',
    title: 'Fides et Ratio — Encíclica sobre las Relaciones entre Fe y Razón (Juan Pablo II, 1998)',
    urls: ['https://www.vatican.va/content/john-paul-ii/es/encyclicals/documents/hf_jp-ii_enc_14091998_fides-et-ratio.html'],
  },
  {
    filename: 'deus_caritas_est_benedicto_xvi_sp.txt',
    title: 'Deus Caritas Est — Encíclica sobre el Amor Cristiano (Benedicto XVI, 2005)',
    urls: ['https://www.vatican.va/content/benedict-xvi/es/encyclicals/documents/hf_ben-xvi_enc_20051225_deus-caritas-est.html'],
  },
  {
    filename: 'dominum_et_vivificantem_juan_pablo_ii_sp.txt',
    title: 'Dominum et Vivificantem — Encíclica sobre el Espíritu Santo (Juan Pablo II, 1986)',
    urls: ['https://www.vatican.va/content/john-paul-ii/es/encyclicals/documents/hf_jp-ii_enc_18051986_dominum-et-vivificantem.html'],
  },
  {
    filename: 'redemptor_hominis_juan_pablo_ii_sp.txt',
    title: 'Redemptor Hominis — Primera Encíclica de Juan Pablo II (1979)',
    urls: ['https://www.vatican.va/content/john-paul-ii/es/encyclicals/documents/hf_jp-ii_enc_04031979_redemptor-hominis.html'],
  },
  {
    filename: 'evangelium_vitae_juan_pablo_ii_sp.txt',
    title: 'Evangelium Vitae — Encíclica sobre el Valor de la Vida Humana (Juan Pablo II, 1995)',
    urls: ['https://www.vatican.va/content/john-paul-ii/es/encyclicals/documents/hf_jp-ii_enc_25031995_evangelium-vitae.html'],
  },

  // ── Exhortaciones Apostólicas ─────────────────────────────────
  {
    filename: 'novo_millennio_ineunte_juan_pablo_ii_sp.txt',
    title: 'Novo Millennio Ineunte — Carta Apostólica al inicio del nuevo milenio (Juan Pablo II, 2001)',
    urls: ['https://www.vatican.va/content/john-paul-ii/es/apost_letters/2001/documents/hf_jp-ii_apl_20010106_novo-millennio-ineunte.html'],
  },
  {
    filename: 'evangelii_nuntiandi_pablo_vi_sp.txt',
    title: 'Evangelii Nuntiandi — Exhortación Apostólica sobre la Evangelización (Pablo VI, 1975)',
    urls: ['https://www.vatican.va/content/paul-vi/es/apost_exhortations/documents/hf_p-vi_exh_19751208_evangelii-nuntiandi.html'],
  },
  {
    filename: 'redemptoris_mater_juan_pablo_ii_sp.txt',
    title: 'Redemptoris Mater — Encíclica sobre la Virgen María (Juan Pablo II, 1987)',
    urls: ['https://www.vatican.va/content/john-paul-ii/es/encyclicals/documents/hf_jp-ii_enc_25031987_redemptoris-mater.html'],
  },

  // ── Francisco ─────────────────────────────────────────────────
  {
    filename: 'evangelii_gaudium_francisco_sp.txt',
    title: 'Evangelii Gaudium — Exhortación Apostólica sobre el Anuncio del Evangelio (Francisco, 2013)',
    urls: ['https://www.vatican.va/content/francesco/es/apost_exhortations/documents/papa-francesco_esortazione-ap_20131124_evangelii-gaudium.html'],
  },
  {
    filename: 'amoris_laetitia_francisco_sp.txt',
    title: 'Amoris Laetitia — Exhortación Apostólica sobre el Amor en la Familia (Francisco, 2016)',
    urls: ['https://www.vatican.va/content/francesco/es/apost_exhortations/documents/papa-francesco_esortazione-ap_20160319_amoris-laetitia.html'],
  },
  {
    filename: 'laudato_si_francisco_sp.txt',
    title: 'Laudato Si — Encíclica sobre el Cuidado de la Casa Común (Francisco, 2015)',
    urls: ['https://www.vatican.va/content/francesco/es/encyclicals/documents/papa-francesco_20150524_enciclica-laudato-si.html'],
  },
];

// ─── Utilidades ───────────────────────────────────────────────
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
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Catholic-Study-App/1.0)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return stripHtml(html);
}

async function downloadDocument(doc, index, total) {
  const outputPath = path.join(OUTPUT_DIR, doc.filename);

  // Saltar si ya existe
  if (fs.existsSync(outputPath)) {
    console.log(`  ⏭️  [${index}/${total}] Ya existe: ${doc.filename}`);
    return true;
  }

  console.log(`  📥 [${index}/${total}] ${doc.title}`);

  let fullText = `${doc.title}\nFuente: vatican.va\n${'='.repeat(70)}\n\n`;
  let pagesOk = 0;

  for (const url of doc.urls) {
    try {
      const text = await fetchPage(url);
      fullText += text + '\n\n';
      pagesOk++;
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.warn(`     ⚠️  Error en ${url}: ${err.message}`);
    }
  }

  if (pagesOk === 0) {
    console.log(`     ❌ No se pudo descargar ninguna página`);
    return false;
  }

  fs.writeFileSync(outputPath, fullText, 'utf8');
  const kb = Math.round(fs.statSync(outputPath).size / 1024);
  console.log(`     ✅ Guardado (${kb} KB)`);
  return true;
}

async function main() {
  console.log(`\n📚 Descargando ${DOCUMENTS.length} documentos del Magisterio Católico...\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < DOCUMENTS.length; i++) {
    const success = await downloadDocument(DOCUMENTS[i], i + 1, DOCUMENTS.length);
    if (success) ok++; else fail++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Completado: ${ok} documentos | ❌ Fallidos: ${fail}`);

  // Resumen de archivos en la carpeta
  const allFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.txt'));
  const totalKB = allFiles.reduce((sum, f) => {
    return sum + Math.round(fs.statSync(path.join(OUTPUT_DIR, f)).size / 1024);
  }, 0);
  console.log(`📂 Total fuentes: ${allFiles.length} archivos | ${Math.round(totalKB / 1024)} MB\n`);
}

main().catch(console.error);
