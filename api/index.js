import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ─── Local File Management for Gemini ─────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const CACHE_DIR = isProduction ? path.join('/tmp', '.cache') : path.join(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'contexts.json');
// Where the raw text sources live. In Vercel serverless, process.cwd() points to the project root.
const SOURCES_DIR = isProduction
    ? path.join(process.cwd(), 'src', 'data', 'fuentes_teologicas')
    : path.join(__dirname, '..', 'src', 'data', 'fuentes_teologicas');

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

        const match = envFile.match(/VITE_GEMINI_API_KEY=(.+)/);
        if (match) apiKey = match[1].trim();
    } catch (e) { }
}

if (!apiKey) {
    console.warn('⚠️ WARNING: VITE_GEMINI_API_KEY is not defined. Features requiring AI will fail.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;

// The model we will use
const MODEL_NAME = 'gemini-2.5-flash';

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

// ─── Document Upload & Management ─────────────────────────────
let uploadedFileUris = [];
let isUploadingDocs = false;

async function syncDocuments() {
    if (!fileManager) {
        console.warn('Cannot sync documents: No API key');
        return;
    }
    if (isUploadingDocs) return;

    isUploadingDocs = true;
    try {
        if (!fs.existsSync(SOURCES_DIR)) {
            console.warn(`No sources directory found at ${SOURCES_DIR}`);
            return;
        }

        // Vercel Serverless has a strict 10-second timeout on Hobby plan.
        // Reading and uploading 50 files synchronously takes way too long.
        // We will strict disable file uploads in production to restore sub-second latency,
        // relying entirely on Gemini's massive pre-trained knowledge of Catholic doctrine.
        const allFiles = fs.readdirSync(SOURCES_DIR).filter(f => f.endsWith('.txt'));
        const files = isProduction ? [] : allFiles.slice(0, 15);

        if (files.length === 0) {
            console.log(`📚 Skipping document API upload for Vercel Serverless performance.`);
            return;
        }
        console.log(`📚 Found ${allFiles.length} docs. Preparing context with top ${files.length}...`);

        let existingFiles = [];
        try {
            const listResult = await fileManager.listFiles();
            existingFiles = listResult.files || [];
        } catch (e) {
            console.warn('Could not list existing Gemini files. Assuming none.');
        }

        uploadedFileUris = [];

        // Speed up using limited concurrency
        const uploadPromises = files.map(async (filename) => {
            const filePath = path.join(SOURCES_DIR, filename);
            const existing = existingFiles.find(f => f.displayName === filename);

            if (existing) {
                return { mimeType: existing.mimeType, fileUri: existing.uri };
            }

            try {
                const uploadResponse = await fileManager.uploadFile(filePath, {
                    mimeType: 'text/plain',
                    displayName: filename
                });
                return { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri };
            } catch (err) {
                console.error(`Failed to upload ${filename}:`, err.message);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        uploadedFileUris = results.filter(r => r !== null).map(r => ({ fileData: r }));

        console.log(`✅ Successfully mapped ${uploadedFileUris.length} source documents to Gemini.`);

    } catch (err) {
        console.error('Error syncing documents to Gemini:', err);
    } finally {
        isUploadingDocs = false;
    }
}

// ─── Build query prompt ───────────────────────────────────────
function buildSystemInstruction() {
    return `Eres un erudito católico experto en Sagradas Escrituras, exégesis, y patrística. Tu tarea es proporcionar contextos y reflexiones basados ESTRICTA Y EXCLUSIVAMENTE en los documentos bibliográficos proporcionados (la biblioteca de OrdoVivo).
    
REGLAS MANDATORIAS:
1. SIEMPRE fundamenta tus respuestas en los textos proporcionados. No inventes doctrina ni historia que no esté soportada por la tradición de la Iglesia Católica.
2. Si los documentos proporcionados no mencionan un tema específico, responde usando tu conocimiento general pero SIEMPRE bajo el prisma del Catecismo de la Iglesia Católica y el Magisterio.
3. El formato de salida debe ser el JSON exacto que el usuario solicita, no uses markdown de código \`\`\`json. Solo el objeto JSON.
4. El estilo de redacción debe ser pastoral, formativo, y reverente.`;
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
    return `Create a highly detailed, extremely beautiful painting visualizing this biblical scene: "${verseText}". 
Reference: ${readingRef || 'Gospel'}.
Style: Cinematic lighting, masterpiece, classical renaissance or baroque painting style, dramatic, sacred, vibrant colors.
Respond WITH ONLY THE ENGLISH PROMPT TEXT. No explanations, no markdown, no quotes. Just the prompt string suitable for an image generator.`;
}

// ─── Query + cache a single context ───────────────────────────
async function getContext(verseText, readingRef, contextType) {
    // Check disk cache first
    const cached = getCached(readingRef, contextType);
    if (cached) {
        console.log(`⚡ [${contextType}] Cache hit: ${readingRef}`);
        return cached;
    }

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const query = buildPrompt(verseText, readingRef, contextType);
    console.log(`📖 [${contextType}] Querying Gemini: ${readingRef || verseText.substring(0, 40)}...`);

    try {
        // Fire and forget document sync if needed, but do NOT block the request on Vercel Serverless
        // The Gemini model is already heavily pre-trained on Catholic doctrine so base responses are excellent.
        if (uploadedFileUris.length === 0 && !isUploadingDocs) {
            syncDocuments().catch(() => { });
        }

        const contentsParts = uploadedFileUris.map(f => ({
            fileData: { mimeType: f.fileData.mimeType, fileUri: f.fileData.fileUri }
        }));

        contentsParts.push({ text: query });

        const payload = {
            systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
            contents: [{ parts: contentsParts }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errBody}`);
        }

        const result = await response.json();
        const answerText = result.candidates[0].content.parts[0].text;

        console.log('✅ Got response from Gemini REST API');

        // Parse JSON
        const parsed = JSON.parse(answerText);

        if (contextType === 'historico_cultural' && parsed.historico) {
            console.log(`✅ [${contextType}] OK: ${readingRef}`);
            setDiskCache(readingRef, contextType, parsed);
            return parsed;
        }
        if (contextType === 'teologico' && parsed.teologico) {
            console.log(`✅ [${contextType}] OK: ${readingRef}`);
            setDiskCache(readingRef, contextType, parsed);
            return parsed;
        }
        if (contextType === 'kids' && parsed.cards) {
            console.log(`✅ [${contextType}] OK: ${readingRef} (${parsed.cards.length} cards)`);
            setDiskCache(readingRef, contextType, parsed);
            return parsed;
        }

        console.warn(`⚠️ [${contextType}] JSON parsed but missing expected keys:`, parsed);
        return parsed;

    } catch (err) {
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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dd}`;
}

// ─── Prefetch all contexts for a date ─────────────────────────
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

    for (const reading of readings) {
        // Standard contexts for all readings
        for (const type of ['historico_cultural', 'teologico']) {
            const existing = getCached(reading.ref, type);
            if (existing) {
                cached++;
                continue;
            }

            try {
                await getContext(reading.text, reading.ref, type);
                fetched++;
            } catch (err) {
                console.error(`❌ Failed: ${reading.ref} [${type}]: ${err.message}`);
                errors++;
            }
        }

        // Kids context ONLY for the gospel (last reading, name = 'Evangelio')
        if (reading.name === 'Evangelio') {
            const kidsExisting = getCached(reading.ref, 'kids');
            if (kidsExisting) {
                cached++;
            } else {
                try {
                    await getContext(reading.text, reading.ref, 'kids');
                    fetched++;
                } catch (err) {
                    console.error(`❌ Failed: ${reading.ref} [kids]: ${err.message}`);
                    errors++;
                }
            }
        }
    }

    console.log(`✅ Prefetch ${dateString} complete: ${fetched} fetched, ${cached} cached, ${errors} errors\n`);
    return { fetched, cached, errors };
}

// ─── API Routes ───────────────────────────────────────────────

// Evangelizo Proxy Route
app.get('/api/evangelizo', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter is required' });

    try {
        const url = `https://feed.evangelizo.org/v2/reader.php?date=${date}&type=xml&lang=SP`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Evangelizo HTTP ${response.status}`);
        const xmlText = await response.text();
        res.type('application/xml').send(xmlText);
    } catch (error) {
        console.error('❌ Error in /api/evangelizo proxy:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Evangelizo' });
    }
});

// Single context query (used by frontend)
app.post('/api/context', async (req, res) => {
    const { verseText, readingRef, type } = req.body;
    if (!verseText) return res.status(400).json({ error: 'verseText is required' });

    const contextType = type || 'teologico';
    try {
        const result = await getContext(verseText, readingRef, contextType);
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

// Prefetch all readings for today + tomorrow
app.post('/api/prefetch', async (req, res) => {
    const today = getDateString(0);
    const tomorrow = getDateString(1);

    // Run in background, respond immediately
    res.json({ status: 'prefetching', dates: [today, tomorrow] });

    prefetchDate(today).then(() => {
        // Also prefetch the image for today
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
        console.log(`⚡ [${contextType}] Cache hit: ${readingRef}`);
        return cached;
    }

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    // 1. Ask Gemini to build a prompt in English
    const promptQuery = buildImagePrompt(verseText, readingRef);
    console.log(`🎨 [${contextType}] Generating prompt with Gemini for: ${readingRef || verseText.substring(0, 40)}...`);

    try {
        const payload = {
            contents: [{ parts: [{ text: promptQuery }] }],
            // Removed contentsParts with files to save quota 
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errBody}`);
        }

        const result = await response.json();
        let englishPrompt = result.candidates[0].content.parts[0].text.trim();
        // Remove surrounding quotes if Gemini added them
        if (englishPrompt.startsWith('"') && englishPrompt.endsWith('"')) {
            englishPrompt = englishPrompt.slice(1, -1);
        }

        console.log(`✅ Gemini Prompt: "${englishPrompt}"`);

        // 2. Build URL for pollinations.ai
        const encodedPrompt = encodeURIComponent(englishPrompt);
        // Using flux model, high quality, no logo
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

        const payloadObj = { imageUrl };
        setDiskCache(readingRef, contextType, payloadObj);
        return payloadObj;

    } catch (err) {
        console.error(`❌ [${contextType}] Gemini REST query failed:`, err.message);
        throw err;
    }
}

// Get or Generate image for the daily gospel
app.post('/api/image', async (req, res) => {
    const { verseText, readingRef, rawImage } = req.body;
    if (!verseText) return res.status(400).json({ error: 'verseText is required' });

    try {
        const result = await getImageContext(verseText, readingRef, 'image');

        if (rawImage || req.query.raw === 'true') {
            // Act as a proxy to bypass strict browser CORS/ORB
            console.log(`🖼️ Proxying image from: ${result.imageUrl}`);
            const imageResponse = await fetch(result.imageUrl);

            if (!imageResponse.ok) {
                console.error('Pollinations fetch failed:', imageResponse.status);
                // Redirecting tells the browser to try itself as a fallback if proxy fails
                return res.redirect(result.imageUrl);
            }

            // Forward headers and binary stream
            res.set('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.send(buffer);
        } else {
            // Default behavior just returns the URL
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
