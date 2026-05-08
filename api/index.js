import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables for local development
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ─── Utilities ────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function executeWithRetry(fn, maxRetries = 3, initialDelay = 2000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const isRetryable = err.message.includes('429') || 
                               err.message.includes('RESOURCE_EXHAUSTED') ||
                               err.message.includes('503') ||
                               err.message.includes('UNAVAILABLE');
                               
            if (isRetryable && i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                console.warn(`⏳ Temporary Gemini error. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
                await sleep(delay);
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

// ─── Local File Management for Gemini ─────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const CACHE_DIR = isProduction ? path.join('/tmp', '.cache') : path.join(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'contexts.json');
// Where the raw text sources live. In Vercel serverless, process.cwd() points to the project root.
const SOURCES_DIR = isProduction
    ? path.join(process.cwd(), 'src', 'data', 'fuentes_teologicas')
    : path.join(__dirname, '..', 'src', 'data', 'fuentes_teologicas');
const PATCHES_FILE = isProduction
    ? path.join(process.cwd(), 'src', 'data', 'ordo_patch.json')
    : path.join(__dirname, '..', 'src', 'data', 'ordo_patch.json');

// Initialize Gemini
// Try to get API key from .env file or environment variables
let apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    try {
        let envFile = '';
        if (fs.existsSync(path.join(__dirname, '..', '.env.local'))) {
            envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        } else if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
            envFile = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
        }

        const matchGemini = envFile.match(/VITE_GEMINI_API_KEY=(.+)/);
        if (matchGemini) apiKey = matchGemini[1].trim();
        
        const matchSupaUrl = envFile.match(/SUPABASE_URL=(.+)/);
        if (matchSupaUrl) process.env.SUPABASE_URL = matchSupaUrl[1].trim().replace(/"/g, '');
        
        const matchSupaKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
        if (matchSupaKey) process.env.SUPABASE_SERVICE_ROLE_KEY = matchSupaKey[1].trim().replace(/"/g, '');
    } catch (e) { }
}

if (!apiKey) {
    console.warn('⚠️ WARNING: VITE_GEMINI_API_KEY is not defined. Features requiring AI will fail.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;

// The model we will use (using latest stable flash for better quota)
const MODEL_NAME = 'gemini-2.5-flash';

// ─── Sacred Art Gallery (Fallback Level 3) ────────────────────
const SACRED_ART_GALLERY = [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Caravaggio_-_La_vocazione_di_san_Matteo.jpg/1280px-Caravaggio_-_La_vocazione_di_san_Matteo.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/The_Transfiguration_by_Raphael.jpg/800px-The_Transfiguration_by_Raphael.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/L%27Ultima_Cena_-_Da_Vinci_5.jpg/1280px-L%27Ultima_Cena_-_Da_Vinci_5.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/The_Return_of_the_Prodigal_Son_Rembrandt.jpg/800px-The_Return_of_the_Prodigal_Son_Rembrandt.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/The_Incredulity_of_Saint_Thomas-Caravaggio_%281601-2%29.jpg/1280px-The_Incredulity_of_Saint_Thomas-Caravaggio_%281601-2%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/El_Greco_-_Christ_as_Saviour_-_WGA10521.jpg/800px-El_Greco_-_Christ_as_Saviour_-_WGA10521.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Peter_Paul_Rubens_-_The_Adoration_of_the_Magi_-_Google_Art_Project.jpg/1280px-Peter_Paul_Rubens_-_The_Adoration_of_the_Magi_-_Google_Art_Project.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fra_Angelico_-_The_Annunciation_-_WGA00431.jpg/800px-Fra_Angelico_-_The_Annunciation_-_WGA00431.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/The_Storm_on_the_Sea_of_Galilee_Rembrandt.jpg/800px-The_Storm_on_the_Sea_of_Galilee_Rembrandt.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Vel%C3%A1zquez_-_Cristo_crucificado.jpg/800px-Vel%C3%A1zquez_-_Cristo_crucificado.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Sandro_Botticelli_050.jpg/800px-Sandro_Botticelli_050.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Michelangelo_-_Creation_of_Adam.jpg/1280px-Michelangelo_-_Creation_of_Adam.jpg"
];

function getGalleryImage() {
    // Pick an image based on the day of the month in Colombia so it changes daily
    const d = new Date();
    const day = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        day: 'numeric'
    }).format(d));
    return SACRED_ART_GALLERY[day % SACRED_ART_GALLERY.length];
}

// ─── Disk Cache ───────────────────────────────────────────────
let diskCache = {};

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            const count = Object.keys(diskCache).length;
            console.log(`💾 Loaded ${count} cached contexts from disk`);
        }
    } catch { diskCache = {}; }
}

function saveCache() {
    try {
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(diskCache, null, 2));
    } catch (err) { console.warn('⚠️ Could not save cache:', err.message); }
}

function getCacheKey(verseRef, type) {
    return `${verseRef || 'unknown'}::${type}`;
}

function getCached(verseRef, type) {
    const key = getCacheKey(verseRef, type);
    const entry = diskCache[key];
    if (entry) return entry.data;
    return null;
}

function setDiskCache(verseRef, type, data) {
    const key = getCacheKey(verseRef, type);
    diskCache[key] = { data, date: new Date().toISOString() };
    saveCache();
}

// ─── DB Cache (Supabase) ──────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function getSupabaseContext(readingRef, type) {
    if (!supabase || !readingRef) return null;
    const colName = type === 'image' ? 'image_json' : `${type}_json`;
    try {
        const { data, error } = await supabase
            .from('daily_contexts')
            .select('*')
            .eq('reading_ref', readingRef.trim())
            .single();
        if (error || !data) return null;
        return data[colName] || null;
    } catch (err) {
        return null;
    }
}

async function saveSupabaseContext(readingRef, type, payload) {
    if (!supabase || !readingRef) return;
    const colName = type === 'image' ? 'image_json' : `${type}_json`;
    try {
        // Use upsert for atomic operation
        const { error } = await supabase
            .from('daily_contexts')
            .upsert({
                reading_ref: readingRef.trim(),
                [colName]: payload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'reading_ref' });
        
        if (error) throw error;
    } catch (err) {
        console.error(`❌ [Supabase Save] Failed for ${readingRef} (${type}):`, err.message);
    }
}

// ─── Document Management (Smart Context Selection) ────────────
let sourceFilesIndex = [];
let baseSourceSnippets = "";

async function syncDocuments() {
    try {
        if (!fs.existsSync(SOURCES_DIR)) {
            console.warn(`No sources directory found at ${SOURCES_DIR}`);
            return;
        }

        const allFiles = fs.readdirSync(SOURCES_DIR).filter(f => f.endsWith('.txt'));
        sourceFilesIndex = allFiles.map(f => ({
            name: f,
            lowerName: f.toLowerCase().replace(/_/g, ' ')
        }));

        // Load "Base Documents" that provide global context if they exist
        const baseFiles = allFiles.filter(f => {
            const n = f.toLowerCase();
            return n.includes('catecismo') ||
                   n.includes('dei_verbum') ||
                   n.includes('verbum_domini') ||
                   n.includes('divino_afflante') ||
                   n.includes('providentissimus') ||
                   n.includes('sacrosanctum') ||
                   n.includes('navarra');
        });

        baseSourceSnippets = "";
        for (const filename of baseFiles.slice(0, 6)) {
            try {
                const content = fs.readFileSync(path.join(SOURCES_DIR, filename), 'utf8');
                baseSourceSnippets += `\n--- SOURCE: ${filename} ---\n${content.substring(0, 4000)}\n`;
            } catch (e) {}
        }

        console.log(`✅ Indexed ${allFiles.length} source documents. Loaded ${baseFiles.length} base snippets.`);
    } catch (err) {
        console.error('Error indexing documents:', err);
    }
}

async function getRelevantContextSnippets(readingRef = "") {
    if (!readingRef) return baseSourceSnippets;
    
    // Extract book name/abbr (e.g. "Gn", "Génesis", "Jn")
    const match = readingRef.match(/^([A-Za-zÁÉÍÓÚñáéíóú]+)/);
    const bookKey = match ? match[1].toLowerCase() : "";
    
    // Find relevant files based on filename keywords
    const relevantFiles = sourceFilesIndex.filter(f => 
        (bookKey && f.lowerName.includes(bookKey)) ||
        (readingRef.toLowerCase().includes('evangelio') && f.lowerName.includes('evangelio'))
    ).slice(0, 4); // Limit to top 4 matches to keep prompt size reasonable
    
    let snippets = baseSourceSnippets;
    for (const f of relevantFiles) {
        try {
            const content = fs.readFileSync(path.join(SOURCES_DIR, f.name), 'utf8');
            // We take a significant chunk of each relevant file
            snippets += `\n--- SOURCE: ${f.name} ---\n${content.substring(0, 8000)}\n`;
        } catch (e) {}
    }
    
    return snippets;
}

// ─── Fuentes web fidedignas para historico_cultural ───────────
const BOOK_MAP = {
    'Gn': 'Génesis', 'Ex': 'Éxodo', 'Lv': 'Levítico', 'Nm': 'Números',
    'Dt': 'Deuteronomio', 'Jos': 'Josué', 'Jue': 'Jueces', 'Rt': 'Rut',
    '1S': 'Primer libro de Samuel', '2S': 'Segundo libro de Samuel',
    '1R': 'Primer libro de los Reyes', '2R': 'Segundo libro de los Reyes',
    'Is': 'Isaías', 'Jr': 'Jeremías', 'Ez': 'Ezequiel', 'Dn': 'Daniel',
    'Am': 'Amós', 'Os': 'Oseas', 'Mi': 'Miqueas', 'Za': 'Zacarías',
    'Sal': 'Salmos', 'Sb': 'Libro de la Sabiduría', 'Si': 'Eclesiástico',
    'Pr': 'Proverbios', 'Job': 'Libro de Job', 'Qo': 'Eclesiastés',
    'Mt': 'Evangelio de Mateo', 'Mc': 'Evangelio de Marcos',
    'Lc': 'Evangelio de Lucas', 'Jn': 'Evangelio de Juan',
    'Hch': 'Hechos de los Apóstoles', 'Ac': 'Hechos de los Apóstoles',
    'Rm': 'Epístola a los Romanos', 'Ro': 'Epístola a los Romanos',
    '1Co': 'Primera Epístola a los Corintios', '2Co': 'Segunda Epístola a los Corintios',
    'Ga': 'Epístola a los Gálatas', 'Ef': 'Epístola a los Efesios',
    'Flp': 'Epístola a los Filipenses', 'Col': 'Epístola a los Colosenses',
    '1Ts': 'Primera Epístola a los Tesalonicenses', '2Ts': 'Segunda Epístola a los Tesalonicenses',
    '1Tm': 'Primera Epístola a Timoteo', '2Tm': 'Segunda Epístola a Timoteo',
    'Hb': 'Epístola a los Hebreos', 'St': 'Epístola de Santiago',
    '1Pe': 'Primera Epístola de Pedro', '1Jn': 'Primera Epístola de Juan',
    'Ap': 'Apocalipsis',
};

function getBookName(readingRef) {
    const abbr = readingRef?.match(/^([A-Za-z0-9]+)/)?.[1];
    return abbr ? (BOOK_MAP[abbr] || abbr) : '';
}

// Helpers para extraer texto limpio de HTML
function stripHtmlTags(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#(\d+);/gi, (_, n) => String.fromCharCode(n))
        .replace(/\s{2,}/g, ' ').trim();
}

async function safeFetch(url, opts = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'OrdoVivo/1.0 (lectio-divina-app; educational)' },
            signal: AbortSignal.timeout(8000),
            ...opts,
        });
        if (!res.ok) return null;
        return res;
    } catch (_) { return null; }
}

// 1. Wikipedia en español (REST summary — JSON limpio)
async function fetchWikipedia(query) {
    const res = await safeFetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
    if (!res) return '';
    const d = await res.json();
    return d.extract ? `[Wikipedia ES — ${d.title}]\n${d.extract}` : '';
}

// 2. Wikipedia búsqueda full-text (cuando summary no existe)
async function searchWikipedia(query) {
    const url = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3&srprop=snippet`;
    const res = await safeFetch(url);
    if (!res) return '';
    const d = await res.json();
    return (d?.query?.search || [])
        .map(r => `[Wikipedia ES — ${r.title}]\n${stripHtmlTags(r.snippet)}`)
        .join('\n');
}

// 3. Catholic Encyclopedia (New Advent) — en inglés, excelente para historia bíblica
async function fetchNewAdvent(query) {
    const slug = query.toLowerCase().replace(/\s+/g, '_').replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]||c));
    const url = `https://www.newadvent.org/cathen/${slug.substring(0, 2)}${slug}.htm`;
    const res = await safeFetch(url);
    if (!res) return '';
    const html = await res.text();
    const text = stripHtmlTags(html).substring(0, 1500);
    return text.length > 200 ? `[Catholic Encyclopedia (New Advent) — ${query}]\n${text}` : '';
}

// 4. World History Encyclopedia (worldhistory.org) — historia del mundo antiguo
async function fetchWorldHistory(query) {
    const url = `https://www.worldhistory.org/api/v1/search/?q=${encodeURIComponent(query)}&lang=es&size=1`;
    const res = await safeFetch(url);
    if (!res) return '';
    try {
        const d = await res.json();
        const item = d?.results?.[0];
        if (!item?.description) return '';
        return `[World History Encyclopedia — ${item.title}]\n${stripHtmlTags(item.description).substring(0, 1000)}`;
    } catch (_) { return ''; }
}

// 5. Bible Gateway — introducción al libro bíblico (en español)
async function fetchBibleGateway(bookName) {
    const slug = bookName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const url = `https://www.biblegateway.com/resources/encyclopedia-of-the-bible/${slug}`;
    const res = await safeFetch(url);
    if (!res) return '';
    const html = await res.text();
    const text = stripHtmlTags(html).substring(0, 1500);
    return text.length > 200 ? `[BibleGateway Encyclopedia — ${bookName}]\n${text}` : '';
}

// Orquestador principal: combina todas las fuentes en paralelo
async function fetchWebHistoricalSources(verseText, readingRef) {
    const bookName = getBookName(readingRef);
    const searchQuery = bookName
        ? `${bookName} Biblia historia`
        : `${readingRef || verseText.substring(0, 50)} contexto histórico bíblico`;

    console.log(`🌐 [historico_cultural] Buscando en fuentes web: "${searchQuery}"...`);

    // Lanzar todas las fuentes en paralelo
    const [
        wikiBook,
        wikiSearch,
        worldHistory,
    ] = await Promise.all([
        bookName ? fetchWikipedia(bookName) : Promise.resolve(''),
        searchWikipedia(searchQuery),
        bookName ? fetchWorldHistory(bookName) : Promise.resolve(''),
    ]);

    // Concatenar lo que llegó
    let combined = [wikiBook, wikiSearch, worldHistory]
        .filter(s => s && s.length > 100)
        .join('\n\n');

    // Si llegó poco, ampliar con búsqueda en inglés (Wikipedia EN tiene más cobertura bíblica)
    if (combined.length < 400 && bookName) {
        const enBook = bookName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const resEn = await safeFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enBook + ' (Bible)')}`);
        if (resEn) {
            const d = await resEn.json();
            if (d.extract) combined += `\n\n[Wikipedia EN — ${d.title}]\n${d.extract}`;
        }
    }

    console.log(`✅ [historico_cultural] Fuentes web: ${combined.length} caracteres de contexto obtenidos`);
    return combined;
}

// ─── Build query prompt ───────────────────────────────────────
function buildSystemInstruction(contextSnippets = "", contextType = "") {
    if (contextType === 'historico_cultural') {
        return `Eres un historiador y arqueólogo bíblico experto. Tu tarea es proporcionar el contexto HISTÓRICO y CULTURAL de los versículos usando las fuentes web reales proporcionadas (Wikipedia, enciclopedias bíblicas, fuentes académicas).

REGLAS MANDATORIAS:
1. Basa tu respuesta PRINCIPALMENTE en la información de las fuentes web proporcionadas a continuación.
2. Describe hechos históricos concretos: fechas, lugares, pueblos, costumbres, contexto político y social de la época.
3. Incluye datos arqueológicos, geográficos y culturales relevantes que enriquezcan la comprensión del texto.
4. Si las fuentes web proporcionadas no tienen información suficiente, usa tu conocimiento académico general sobre historia bíblica.
5. El formato de salida debe ser el JSON exacto que el usuario solicita. Solo el objeto JSON, sin markdown.

FUENTES WEB CONSULTADAS:
${contextSnippets || "Usa tu conocimiento académico general sobre historia bíblica."}`;
    }

    // teologico, kids, image — usan documentos del Magisterio
    return `Eres un erudito católico experto en Sagradas Escrituras, exégesis, y patrística. Tu tarea es proporcionar contextos y reflexiones basados ESTRICTA Y EXCLUSIVAMENTE en los documentos bibliográficos proporcionados (la biblioteca de OrdoVivo).

REGLAS MANDATORIAS:
1. SIEMPRE fundamenta tus respuestas en los textos de las fuentes proporcionadas a continuación. No inventes doctrina ni historia que no esté soportada por la tradición de la Iglesia Católica y específicamente por estos textos.
2. Cita o menciona ideas de las fuentes si son especialmente relevantes (ej: mención a la Biblia de Navarra, Joseph Ratzinger o los Padres de la Iglesia según los textos).
3. Si los documentos proporcionados no mencionan un tema específico, responde usando tu conocimiento general pero SIEMPRE bajo el prisma del Catecismo de la Iglesia Católica y el Magisterio.
4. El formato de salida debe ser el JSON exacto que el usuario solicita, no uses markdown de código \`\`\`json. Solo el objeto JSON.

FUENTES BIBLIOGRÁFICAS DISPONIBLES PARA ESTA CONSULTA:
${contextSnippets || "No se han proporcionado archivos específicos, usa el conocimiento magisterial general."}`;
}

function buildPrompt(verseText, readingRef, contextType) {
    if (contextType === 'historico_cultural') {
        return `Proporciona el contexto HISTÓRICO y CULTURAL de estos versículos basado en los documentos adjuntos.
        
Versículos: "${verseText}"
${readingRef ? `Referencia: ${readingRef}` : ''}

Responde en formato JSON puro (sin markdown):
{
  "historico": "Contexto histórico: qué estaba pasando, a qué eventos responde (1 párrafo).",
  "cultural": "Contexto cultural: costumbres, símbolos, estructura social relevantes (1 párrafo)."
}`;
    } else if (contextType === 'kids') {
        return `Eres un catequista experto en enseñar a niños de 5 a 10 años. Basándote en las fuentes, re-cuenta este evangelio como una historia para niños.
        
Evangelio: "${verseText}"
${readingRef ? `Referencia: ${readingRef}` : ''}

Reglas:
- Usa lenguaje simple, frases cortas, palabras que un niño de 6 años entienda.
- Incluye emojis relevantes en cada tarjeta.
- Divide la historia en exactamente 5 tarjetas narrativas
- Cada tarjeta debe tener máximo 2-3 oraciones cortas
- La primera tarjeta introduce la escena
- La última tarjeta tiene la enseñanza/moraleja para los niños
- Agrega un dato curioso ("¿Sabías qué?") relacionado con el evangelio

Responde en formato JSON puro (sin markdown ni backticks):
{
  "cards": [
    "Tarjeta 1: Introducción de la escena con emojis",
    "Tarjeta 2: Desarrollo de la historia",
    "Tarjeta 3: Momento clave de la historia",
    "Tarjeta 4: Lo que Jesús enseña",
    "Tarjeta 5: ¿Qué podemos hacer nosotros? (moraleja)"
  ],
  "titulo": "Título corto y llamativo para niños",
  "dato_curioso": "Un dato curioso relacionado con el evangelio que sorprenda a los niños"
}`;
    } else {
        return `Basándote en las fuentes de este estudio bíblico, proporciona una reflexión teológica para meditación de Lectio Divina de estos versículos.

Versículos: "${verseText}"
${readingRef ? `Referencia: ${readingRef}` : ''}

Enfócate en: significado espiritual, enseñanzas patrísticas, tradición de la Iglesia y oración contemplativa.

Responde en formato JSON puro (sin markdown ni backticks):
{
  "teologico": "Reflexión teológica profunda para Lectio Divina (1 párrafo denso)."
}`;
    }
}

function buildImagePrompt(verseText, readingRef) {
    return `Eres un director de arte sacro experto en estética clásica. Tu tarea es generar un prompt de imagen en INGLÉS (para DALL-E/Midjourney/Flux) que capture la belleza y divinidad de esta escena bíblica: "${verseText}".

REGLAS PARA EL PROMPT EN INGLÉS:
1. DESCRIPCIÓN: Describe la escena con lujo de detalle (personajes, túnicas, expresiones, entorno histórico).
2. ENCUADRE (CRÍTICO): Especifica un "Wide shot" o "Medium shot" con los personajes centrados. Asegúrate de que el rostro de Jesús esté COMPLETAMENTE VISIBLE y nunca cortado por los bordes.
3. DETALLE FACIAL (MÁXIMA PRIORIDAD): Usa "hyper-realistic and anatomically correct faces", "sharp focus on facial features", "detailed eyes and skin textures", "perfect human anatomy". Especifica que los rostros deben ser hermosos, nítidos y con expresiones claras.
4. ESTILO: Pintura épica al óleo, estilo Maestro del Barroco o Renacimiento (influencia de Caravaggio o Rembrandt). Iluminación cinemática dramática (tenebrism/chiaroscuro), colores profundos y sagrados.
5. CALIDAD: Ultra-HD, masterpiece, 8k, texturas ricas de lienzo y pintura.

INSTRUCCIÓN NEGATIVA (INTEGRADA): Evita "blurry faces, distorted eyes, extra fingers, cartoonish style, or cut-off heads".

SALIDA: Responde únicamente con el texto del prompt en inglés. Sin citas, sin explicaciones ni markdown.`;
}

// ─── Query + cache a single context ───────────────────────────
async function getContext(verseText, readingRef, contextType) {
    // Check local disk cache first
    const cached = getCached(readingRef, contextType);
    if (cached) {
        console.log(`⚡ [${contextType}] Disk Cache hit: ${readingRef}`);
        return cached;
    }

    // Check Supabase edge DB
    const supaCached = await getSupabaseContext(readingRef, contextType);
    if (supaCached) {
        console.log(`☁️ [${contextType}] Supabase hit: ${readingRef}`);
        setDiskCache(readingRef, contextType, supaCached); // Sync down
        return supaCached;
    }

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const query = buildPrompt(verseText, readingRef, contextType);
    console.log(`📖 [${contextType}] Querying Gemini: ${readingRef || verseText.substring(0, 40)}...`);

    try {
        let snippets = '';

        if (contextType === 'historico_cultural') {
            // Fuentes web reales: Wikipedia, World History Encyclopedia, etc.
            snippets = await fetchWebHistoricalSources(verseText, readingRef);
        } else {
            // Teológico / kids / image → documentos del Magisterio local
            if (sourceFilesIndex.length === 0) await syncDocuments();
            snippets = await getRelevantContextSnippets(readingRef);
        }

        const payload = {
            systemInstruction: { parts: [{ text: buildSystemInstruction(snippets, contextType) }] },
            contents: [{ parts: [{ text: query }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const result = await executeWithRetry(async () => {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errBody = await response.text();
                // Special handling for 429 (Quota) to return a graceful fallback instead of error
                if (response.status === 429) {
                    throw new Error('QUOTA_EXHAUSTED');
                }
                throw new Error(`Gemini API Error ${response.status}: ${errBody}`);
            }

            return await response.json();
        });

        const answerText = result.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(answerText);
        
        // Cache and return successful results
        setDiskCache(readingRef, contextType, parsed);
        saveSupabaseContext(readingRef, contextType, parsed);
        return parsed;

    } catch (err) {
        if (err.message === 'QUOTA_EXHAUSTED') {
            console.warn(`⏳ [${contextType}] Quota exhausted. Returning temporary standby response.`);
            const standby = {
                historico: "Nuestra IA de contexto histórico está descansando un momento (límite de cuota alcanzado). Por favor, vuelve a intentar en unos segundos para obtener la reflexión completa.",
                cultural: "Estamos consultando las fuentes bibliográficas. El sistema generará este contexto automáticamente en breve.",
                teologico: "La reflexión apostólica completa se está terminando de procesar. Estará disponible en unos instantes.",
                cards: [],
                titulo: "Reflexión en camino...",
                dato_curioso: "¡Vuelve a intentar en un momento! 💡"
            };
            return standby;
        }
        console.error(`❌ [${contextType}] Gemini REST query failed:`, err.message);
        throw err;
    }
}

// ─── Fetch readings from Evangelizo ───────────────────────────
async function fetchReadings(dateString) {
    const url = `https://feed.evangelizo.org/v2/reader.php?date=${dateString}&type=xml&lang=SP`;
    const response = await fetch(url);
    const xmlText = await response.text();

    // Simple XML parsing (extract key fields)
    const extract = (tag) => {
        const match = xmlText.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
        return match ? match[1].trim() : '';
    };

    const readings = [];

    const r1Text = extract('reading_text1');
    const r1Ref = extract('reading_text1_st');
    if (r1Text) readings.push({ text: r1Text, ref: r1Ref, name: 'Primera Lectura' });

    const psText = extract('reading_text2');
    const psRef = extract('reading_text2_st');
    if (psText) readings.push({ text: psText, ref: psRef, name: 'Salmo' });

    const r2Text = extract('reading_text3');
    const r2Ref = extract('reading_text3_st');
    if (r2Text) readings.push({ text: r2Text, ref: r2Ref, name: 'Segunda Lectura' });

    const gText = extract('reading_gospel');
    const gRef = extract('reading_gospel_st');
    if (gText) readings.push({ text: gText, ref: gRef, name: 'Evangelio' });

    return readings;
}

function getDateString(daysOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    
    // Force Colombia Timezone (America/Bogota)
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(d).replace(/-/g, '');
    } catch (err) {
        console.warn('⚠️ Timezone formatting failed, falling back to local:', err.message);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${dd}`;
    }
}

// ─── Prefetch all contexts for a date (Sequential with throttling) ──
async function prefetchDate(dateString) {
    console.log(`\n🔄 Prefetching contexts for ${dateString}...`);
    let readings;
    try {
        readings = await fetchReadings(dateString);
    } catch (err) {
        console.error(`❌ Could not fetch readings for ${dateString}:`, err.message);
        return { fetched: 0, cached: 0, errors: 0 };
    }

    let fetched = 0, cached = 0, errors = 0;

    // Process readings sequentially to avoid hitting Free Tier RPM limits
    for (const reading of readings) {
        console.log(`  -> Processing: ${reading.name} (${reading.ref})`);
        
        // Standard contexts for all readings
        for (const type of ['historico_cultural', 'teologico']) {
            const existing = getCached(reading.ref, type) || await getSupabaseContext(reading.ref, type);
            if (existing) {
                cached++;
                console.log(`     ⚡ [${type}] Skip (Cached)`);
            } else {
                try {
                    await getContext(reading.text, reading.ref, type);
                    fetched++;
                    // Add a larger delay to stay under Rate Limits (RPM)
                    await sleep(3000);
                } catch (err) {
                    console.error(`     ❌ Failed: [${type}]: ${err.message}`);
                    errors++;
                }
            }
        }

        // Kids context ONLY for the gospel
        if (reading.name === 'Evangelio') {
            const kidsExisting = getCached(reading.ref, 'kids') || await getSupabaseContext(reading.ref, 'kids');
            if (kidsExisting) {
                cached++;
                console.log(`     ⚡ [kids] Skip (Cached)`);
            } else {
                try {
                    await getContext(reading.text, reading.ref, 'kids');
                    fetched++;
                    await sleep(3000);
                } catch (err) {
                    console.error(`     ❌ Failed: [kids]: ${err.message}`);
                    errors++;
                }
            }
        }
    }

    console.log(`✅ Prefetch ${dateString} complete: ${fetched} fetched, ${cached} cached, ${errors} errors\n`);
    return { fetched, cached, errors };
}

// ─── API Routes ───────────────────────────────────────────────

// Evangelizo Proxy Route with Regional Patching
app.get('/api/evangelizo', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter is required' });

    try {
        // 1. Fetch from standard source
        const url = `https://feed.evangelizo.org/v2/reader.php?date=${date}&type=xml&lang=SP`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Evangelizo HTTP ${response.status}`);
        let xmlText = await response.text();

        // 2. Apply Colombian/Regional Patches if exist
        try {
            if (fs.existsSync(PATCHES_FILE)) {
                const patchData = JSON.parse(fs.readFileSync(PATCHES_FILE, 'utf8'));
                // Format date as YYYY-MM-DD from YYYYMMDD
                const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
                const patch = patchData.patches.find(p => p.date === formattedDate);

                if (patch && patch.override) {
                    console.log(`💎 Applying patch for ${formattedDate}: ${patch.override.title}`);
                    // Crude but effective XML patching for common fields
                    if (patch.override.title) {
                        xmlText = xmlText.replace(/<title><!\[CDATA\[.*?\]\]><\/title>/, `<title><![CDATA[${patch.override.title}]]></title>`);
                    }
                    if (patch.override.rank) {
                        // Assuming your UI or Gemini uses this, Evangelizo doesn't have a direct rank tag usually 
                        // but we can inject it or use specific titles.
                    }
                }
            }
        } catch (patchErr) {
            console.warn('⚠️ Patching failed:', patchErr.message);
        }

        res.type('application/xml').send(xmlText);
    } catch (error) {
        console.error('❌ Error in /api/evangelizo proxy:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Evangelizo' });
    }
});

// Ordo Colombiano Proxy Route
app.get('/api/ordo', async (req, res) => {
    const { date } = req.query; // YYYYMMDD
    if (!date) return res.status(400).json({ error: 'date query parameter is required' });

    const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;

    try {
        const url = 'https://74j2tngwfd.execute-api.us-east-1.amazonaws.com/api-app/ediciones/obtener-contenido-principal';
        const response = await fetch(url, {
            headers: {
                'fecha': formattedDate,
                'User-Agent': 'OrdoVivo/1.0 (lectio-divina-app; educational)',
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`Ordo API HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) throw new Error('Invalid Ordo API response structure');

        const item = data.data.find(i => i.fecha === formattedDate);
        if (!item) throw new Error(`No data found for date ${formattedDate} in Ordo API response`);

        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
        res.json(item);
    } catch (error) {
        console.error('❌ Error in /api/ordo:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Ordo Colombiano API', details: error.message });
    }
});

// Single context query (used by frontend)
app.post('/api/context', async (req, res) => {
    const { verseText, readingRef, type } = req.body;
    if (!verseText) return res.status(400).json({ error: 'verseText is required' });

    const contextType = type || 'teologico';
    try {
        const result = await getContext(verseText, readingRef, contextType);
        // Vercel Edge caching - cache this API response aggressively for the rest of the day
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
        res.json(result);
    } catch (error) {
        console.error(`❌ [${contextType}] Error:`, error.message);

        const errMsg = 'No se pudo obtener el contexto del Estudio Bíblico.';
        if (contextType === 'historico_cultural') {
            res.status(500).json({ historico: errMsg, cultural: '', debug: error.message, stack: error.stack });
        } else if (contextType === 'kids') {
            res.status(500).json({ cards: [], titulo: 'Error', dato_curioso: '', debug: error.message, stack: error.stack });
        } else {
            res.status(500).json({ teologico: errMsg, debug: error.message, stack: error.stack });
        }
    }
});

// Secure Cron Job to prefetch and save everything to Supabase
app.get('/api/cron', async (req, res) => {
    // Basic Bearer token auth for the cron
    const authHeader = req.headers.authorization;
    const CRON_SECRET = process.env.CRON_SECRET;

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized CRON endpoint' });
    }

    const today = getDateString(0);
    const tomorrow = getDateString(1);

    console.log(`🚀 Starting Cron Sync for ${today} and ${tomorrow} (Colombia time)`);

    try {
        console.log('📡 Fetching readings...');
        const readingsToday = await fetchReadings(today).catch(e => {
            console.error(`❌ Failed to fetch readings for ${today}:`, e.message);
            return [];
        });
        const readingsTomorrow = await fetchReadings(tomorrow).catch(e => {
            console.error(`❌ Failed to fetch readings for ${tomorrow}:`, e.message);
            return [];
        });

        if (readingsToday.length === 0 && readingsTomorrow.length === 0) {
            throw new Error('Could not fetch readings for any date. Check Evangelizo API.');
        }

        // 1. Prefetch Text Contexts
        const summaryToday = await prefetchDate(today);
        const summaryTomorrow = await prefetchDate(tomorrow);

        // 2. Prefetch Images for Gospel (Sequential to avoid race conditions with Supabase)
        const imageLog = [];
        
        const gospelToday = readingsToday.find(x => x.name === 'Evangelio');
        if (gospelToday) {
            console.log(`🎨 Prefetching image for TODAY: ${gospelToday.ref}`);
            await getImageContext(gospelToday.text, gospelToday.ref)
                .then(() => imageLog.push(`Today image OK: ${gospelToday.ref}`))
                .catch(e => imageLog.push(`Today image FAILED: ${e.message}`));
        }

        const gospelTomorrow = readingsTomorrow.find(x => x.name === 'Evangelio');
        if (gospelTomorrow) {
            console.log(`🎨 Prefetching image for TOMORROW: ${gospelTomorrow.ref}`);
            await getImageContext(gospelTomorrow.text, gospelTomorrow.ref)
                .then(() => imageLog.push(`Tomorrow image OK: ${gospelTomorrow.ref}`))
                .catch(e => imageLog.push(`Tomorrow image FAILED: ${e.message}`));
        }

        res.json({
            status: 'success',
            timezone: 'America/Bogota',
            today: { date: today, ...summaryToday },
            tomorrow: { date: tomorrow, ...summaryTomorrow },
            images: imageLog,
            supabase: !!supabase
        });
    } catch (err) {
        console.error('❌ Cron Execution Failed:', err);
        res.status(500).json({ 
            error: 'Cron execution failed', 
            details: err.message,
            supabase: !!supabase,
            apiKeyExists: !!apiKey
        });
    }
});

// User-triggered async prefetch
app.post('/api/prefetch', async (req, res) => {
    const today = getDateString(0);
    const tomorrow = getDateString(1);

    res.json({ status: 'prefetching', dates: [today, tomorrow] });

    prefetchDate(today).then(() => {
        const readings = fetchReadings(today);
        readings.then(r => {
            const gospel = r.find(x => x.name === 'Evangelio');
            if (gospel) getImageContext(gospel.text, gospel.ref);
        }).catch(() => { });
        return prefetchDate(tomorrow);
    }).catch(console.error);
});

async function getImageContext(verseText, readingRef, contextType = 'image') {
    const cached = getCached(readingRef, contextType);
    if (cached) {
        console.log(`⚡ [${contextType}] Disk Cache hit: ${readingRef}`);
        return cached;
    }

    const supaCached = await getSupabaseContext(readingRef, contextType);
    if (supaCached) {
        console.log(`☁️ [${contextType}] Supabase hit: ${readingRef}`);
        setDiskCache(readingRef, contextType, supaCached);
        return supaCached;
    }

    // LEVEL 1: Attempt Gemini-optimized generation
    let englishPrompt = "";
    try {
        if (apiKey) {
            const promptQuery = buildImagePrompt(verseText, readingRef);
            console.log(`🎨 [image-L1] Generating prompt with Gemini for: ${readingRef || verseText.substring(0, 40)}...`);

            const result = await executeWithRetry(async () => {
                const payload = { contents: [{ parts: [{ text: promptQuery }] }] };
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errBody = await response.text();
                    throw new Error(`Gemini API Error ${response.status}: ${errBody}`);
                }
                return await response.json();
            });

            englishPrompt = result.candidates[0].content.parts[0].text.trim();
            if (englishPrompt.startsWith('"') && englishPrompt.endsWith('"')) englishPrompt = englishPrompt.slice(1, -1);
            console.log(`✅ [image-L1] Gemini Prompt: "${englishPrompt.substring(0, 50)}..."`);
        }
    } catch (err) {
        console.warn(`⚠️ [image-L1] Gemini failed, falling back to L2. Error: ${err.message}`);
    }

    // LEVEL 2: Emergency Direct Prompt (No Gemini)
    if (!englishPrompt) {
        console.log(`🎨 [image-L2] Building emergency prompt for: ${readingRef}`);
        // Simple but high-quality prompt construction
        englishPrompt = `A sacred masterpiece painting illustrating the biblical scene: ${readingRef || verseText.substring(0, 50)}. Epic classical oil painting style, Baroque chiaroscuro lighting, centered characters, hyper-realistic anatomically correct faces, sharp focus on facial features, detailed skin and eyes, high definition, 8k, inspired by Caravaggio and Rembrandt. Avoid blurry or distorted faces.`;
    }

    // Attempt Pollinations with the prompt (L1 or L2)
    // We do a full GET (not HEAD) so the image is generated and ready to stream
    try {
        const encodedPrompt = encodeURIComponent(englishPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

        console.log(`🎨 [image] Fetching from Pollinations (may take up to 60s)...`);
        const imgFetch = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrdoVivo/1.0)' },
            signal: AbortSignal.timeout(90000),
        });
        if (!imgFetch.ok) throw new Error(`Pollinations returned ${imgFetch.status}`);

        const imageBuffer = Buffer.from(await imgFetch.arrayBuffer());
        const contentType = imgFetch.headers.get('content-type') || 'image/jpeg';

        // Store bytes alongside the URL so the proxy can return them without re-fetching
        const payloadObj = {
            imageUrl,
            _cachedBuffer: imageBuffer.toString('base64'),
            _cachedContentType: contentType,
        };
        setDiskCache(readingRef, contextType, payloadObj);
        saveSupabaseContext(readingRef, contextType, { imageUrl });
        return payloadObj;

    } catch (err) {
        console.warn(`⚠️ [image-L2] Pollinations failed, falling back to L3 gallery. Error: ${err.message}`);
    }

    // LEVEL 3: Premium Static Gallery (Guaranteed Variety)
    console.log(`🎨 [image-L3] Returning masterpiece from gallery for: ${readingRef}`);
    const galleryImageUrl = getGalleryImage();
    const finalPayload = { imageUrl: galleryImageUrl, isGallery: true };
    
    // We don't necessarily cache L3 permanently so that it rotates daily if checked again
    return finalPayload;
}

// Get or Generate image for the daily gospel
app.post('/api/image', async (req, res) => {
    const { verseText, readingRef, rawImage } = req.body;
    if (!verseText) return res.status(400).json({ error: 'verseText is required' });

    try {
        const result = await getImageContext(verseText, readingRef, 'image');

        if (rawImage || req.query.raw === 'true') {
            const isPollinations = result.imageUrl && result.imageUrl.includes('pollinations.ai');

            // Non-Pollinations URLs (Wikipedia gallery, etc.) support CORS — redirect directly
            if (!isPollinations) {
                return res.redirect(302, result.imageUrl);
            }

            // Pollinations: serve from buffer cached during generation
            if (result._cachedBuffer) {
                const buf = Buffer.from(result._cachedBuffer, 'base64');
                res.set('Content-Type', result._cachedContentType || 'image/jpeg');
                res.set('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
                return res.send(buf);
            }

            // Fallback: fetch on-demand with generous timeout (image already generated)
            console.log(`🖼️ Re-fetching Pollinations image: ${result.imageUrl}`);
            const imageResponse = await fetch(result.imageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrdoVivo/1.0)' },
                signal: AbortSignal.timeout(90000),
            });

            if (!imageResponse.ok) {
                console.error('Pollinations re-fetch failed:', imageResponse.status);
                return res.redirect(302, getGalleryImage());
            }

            const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
            if (imgBuf.length === 0) {
                console.warn('⚠️ Pollinations returned empty body, falling back to gallery');
                return res.redirect(302, getGalleryImage());
            }
            res.set('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
            res.set('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
            return res.send(imgBuf);
        } else {
            // Devuelve solo la URL — el componente Hero la carga vía proxy con raw=true
            res.json(result);
        }

    } catch (error) {
        console.error(`❌ [image] Error:`, error.message);
        res.status(500).json({ imageUrl: '/images/home_hero.png', debug: error.message, stack: error.stack }); // Fallback to static
    }
});

// Check cache status
app.get('/api/cache-status', (req, res) => {
    const keys = Object.keys(diskCache);
    res.json({
        total: keys.length,
        entries: keys.map(k => ({
            key: k,
            date: diskCache[k]?.date,
            hasData: !!diskCache[k]?.data,
        })),
    });
});

// Health check / Debug
app.get('/api/health', (req, res) => {
    let sourceFilesCount = -1;
    try {
        sourceFilesCount = fs.existsSync(SOURCES_DIR) ? fs.readdirSync(SOURCES_DIR).length : -1;
    } catch (err) { }

    const debugInfo = {
        hasApiKey: !!apiKey,
        hasSupabase: !!supabase,
        apiKeyLength: apiKey ? apiKey.length : 0,
        sourcesPath: SOURCES_DIR,
        cwd: process.cwd(),
        dirname: __dirname,
        sourceFilesCount: sourceFilesCount,
        cachedEntries: Object.keys(diskCache).length,
        NODE_ENV: process.env.NODE_ENV,
    };

    if (genAI && fileManager) {
        res.json({ status: 'ok', usingLocalSources: true, connected: true, ...debugInfo });
    } else {
        res.json({ status: 'degraded', usingLocalSources: false, connected: false, ...debugInfo });
    }
});

// ─── Startup ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        console.log(`\n🕯️  Lectio Divina Backend running on http://localhost:${PORT}\n`);
        console.log(`Endpoints:`);
        console.log(`  POST /api/context   — Query verse context`);
        console.log(`  POST /api/image     — Query AI image generator`);
        console.log(`  POST /api/prefetch  — Prefetch today + tomorrow`);
        console.log(`  GET  /api/cache-status — View cached entries`);
        console.log(`  GET  /api/health    — Health check\n`);

        loadCache();

        // Wait for connection ...
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Push local files to Gemini File API if not already cached
        await syncDocuments();

        // Optionally run prefetch on startup for the current date
        const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        // await prefetchContextsForDay(todayStr).catch(() => {});
    });
}

// Export for Vercel Serverless
export default app;
