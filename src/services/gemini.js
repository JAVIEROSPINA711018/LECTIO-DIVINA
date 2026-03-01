const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ─── In-memory cache ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
    const entry = cache.get(key);
    if (entry && (Date.now() - entry.time) < CACHE_TTL) return entry.data;
    cache.delete(key);
    return null;
}
function setCache(key, data) {
    cache.set(key, { data, time: Date.now() });
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
async function queryBackend(verseText, readingRef, type) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min max

    try {
        const response = await fetch(`${BACKEND_URL}/api/context`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verseText, readingRef, type }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Backend ${response.status}`);
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// ─── Exported Service ─────────────────────────────────────────
export const geminiService = {

    async getHistoricoCultural(verseText, readingRef) {
        const cacheKey = `hc:${verseText.substring(0, 80)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        return dedup(cacheKey, async () => {
            try {
                const data = await queryBackend(verseText, readingRef, 'historico_cultural');
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
                const data = await queryBackend(verseText, readingRef, 'teologico');
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
};
