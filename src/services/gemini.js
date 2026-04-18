const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ─── In-memory cache ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
    // 1. Check in-memory first
    const entry = cache.get(key);
    if (entry && (Date.now() - entry.time) < CACHE_TTL) return entry.data;
    
    // 2. Fallback to localStorage for cross-session persistence
    try {
        const stored = localStorage.getItem(`ordovivo_cache_${key}`);
        if (stored) {
            const { data, time } = JSON.parse(stored);
            if ((Date.now() - time) < CACHE_TTL * 48) { // 24h persistence for local storage
                cache.set(key, { data, time }); // Hydrate memory cache
                return data;
            }
        }
    } catch (e) { /* ignore localStorage issues */ }
    
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    const time = Date.now();
    cache.set(key, { data, time });
    try {
        localStorage.setItem(`ordovivo_cache_${key}`, JSON.stringify({ data, time }));
    } catch (e) { /* ignore localStorage full */ }
}

// ─── In-flight dedup ──────────────────────────────────────────
const inflight = new Map();
function dedup(key, fn) {
    if (inflight.has(key)) return inflight.get(key);
    const promise = fn().finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
}

// ─── Backend query (single source of truth) ───────────────────
async function queryBackend(verseText, readingRef, type, isImage = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min max

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    const endpoint = isImage
        ? (BACKEND_URL ? `${BACKEND_URL}/api/image?raw=true` : `/api/image?raw=true`)
        : (BACKEND_URL ? `${BACKEND_URL}/api/context` : `/api/context`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verseText, readingRef, type }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 500 || response.status === 429) {
                const errText = await response.text();
                throw new Error(`QuotaError: ${response.status} - ${errText}`);
            }
            throw new Error(`Backend ${response.status}`);
        }

        if (isImage) {
            const blob = await response.blob();
            return { imageUrl: URL.createObjectURL(blob) };
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

async function retryQueryBackend(verseText, readingRef, type, isImage = false, maxRetries = 2) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await queryBackend(verseText, readingRef, type, isImage);
        } catch (error) {
            attempt++;
            if (error.message.includes('QuotaError') && attempt < maxRetries) {
                console.warn(`⏳ Rate limit hit. Retrying in ${attempt * 4} seconds...`);
                await new Promise(res => setTimeout(res, attempt * 4000));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Retries exhausted');
}

// ─── Exported Service ─────────────────────────────────────────
export const geminiService = {

    async getHistoricoCultural(verseText, readingRef) {
        const cacheKey = `hc:${verseText.substring(0, 80)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        return dedup(cacheKey, async () => {
            try {
                const data = await retryQueryBackend(verseText, readingRef, 'historico_cultural');
                const result = {
                    historico: data.historico || '',
                    cultural: data.cultural || '',
                    source: 'gemini',
                };
                setCache(cacheKey, result);
                return result;
            } catch (err) {
                console.error('❌ Error fetching historico-cultural:', err.message);
                return {
                    historico: 'No se pudo cargar el contexto. Verifica que el servidor backend esté corriendo (npm run server).',
                    cultural: '',
                    source: 'error',
                    error: err.message,
                };
            }
        });
    },

    async getTeologico(verseText, readingRef) {
        const cacheKey = `teo:${verseText.substring(0, 80)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        return dedup(cacheKey, async () => {
            try {
                const data = await retryQueryBackend(verseText, readingRef, 'teologico');
                const result = {
                    teologico: data.teologico || '',
                    source: 'gemini',
                };
                setCache(cacheKey, result);
                return result;
            } catch (err) {
                console.error('❌ Error fetching teologico:', err.message);
                return {
                    teologico: 'No se pudo cargar la reflexión. Verifica que el servidor backend esté corriendo (npm run server).',
                    source: 'error',
                };
            }
        });
    },

    async getGospelImage(verseText, readingRef) {
        const cacheKey = `img:${readingRef}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        return dedup(cacheKey, async () => {
            try {
                const data = await retryQueryBackend(verseText, readingRef, 'image', true);

                const result = {
                    imageUrl: data.imageUrl || '/images/home_hero.png',
                    source: 'gemini',
                };
                setCache(cacheKey, result);
                return result;
            } catch (err) {
                console.error('❌ Error fetching gospel image:', err.message);
                return {
                    imageUrl: '/images/home_hero.png', // Fallback to safe static image
                    source: 'error',
                };
            }
        });
    },
};
