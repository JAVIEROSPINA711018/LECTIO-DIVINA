function parseReadingHTML(html) {
    if (!html || !html.trim()) return { ref: '', title: '', text: '' };

    const refMatch = html.match(/<strong>([^<]+)<\/strong>/);
    const ref = refMatch ? refMatch[1].trim() : '';

    const titleMatch = html.match(/<em>\s*<strong>([^<]+)<\/strong>\s*<\/em>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    let text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/gi, (_, n) => String.fromCharCode(Number(n)))
        .trim();

    const lines = text.split('\n');
    const filtered = [];
    let removedRef = false, removedTitle = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!removedRef && trimmed === ref) { removedRef = true; continue; }
        if (!removedTitle && title && trimmed === title) { removedTitle = true; continue; }
        filtered.push(line);
    }

    return {
        ref,
        title,
        text: filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    };
}

function parseLiturgicTitle(encabezado) {
    if (!encabezado) return '';
    const liturgicalColors = ['Blanco', 'Rojo', 'Morado', 'Verde', 'Rosa', 'Negro', 'Dorado'];
    const afterDot = encabezado.split(/\.\s+/).slice(1).join('. ').trim();
    const parts = afterDot.split(',').map(p => p.trim()).filter(p => p && !liturgicalColors.includes(p));
    return parts.join(' · ');
}

function parseSaint(celebracionSanto, preludio) {
    // Try celebracion_santo JSON first
    if (celebracionSanto) {
        try {
            const saints = JSON.parse(celebracionSanto);
            if (Array.isArray(saints) && saints.length > 0) {
                return saints.map(s => s.nombresanto).join(', ');
            }
        } catch (_) {}
    }
    // Fallback: extract plain text from the preludio HTML field
    if (preludio) {
        const text = preludio.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (text) return text;
    }
    return '';
}

export const ordoService = {
    getTodayDateString() {
        try {
            const today = new Date();
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            return formatter.format(today).replace(/-/g, '');
        } catch (_) {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            return `${y}${m}${d}`;
        }
    },

    async getDailyReadings(dateString = null) {
        const fetchDate = dateString || this.getTodayDateString();
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
        const url = `${BACKEND_URL}/api/ordo?date=${fetchDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const item = await response.json();
            if (item.error) throw new Error(item.error);
            return this.mapOrdoItemToModel(item, fetchDate);
        } catch (error) {
            console.error('Error fetching Ordo Colombiano data:', error);
            return null;
        }
    },

    mapOrdoItemToModel(item, dateString) {
        const year  = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1;
        const day   = parseInt(dateString.substring(6, 8));
        const dateObj = new Date(year, month, day);

        const r1 = parseReadingHTML(item.primera_lectura);
        const ps = parseReadingHTML(item.salmo);
        const r2 = parseReadingHTML(item.segunda_lectura);
        const gp = parseReadingHTML(item.evangelio);

        return {
            dateObj,
            dateString,
            date: dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            dayNumber: dateObj.getDate(),
            dayName: dateObj.toLocaleDateString('es-ES', { weekday: 'short' }),
            monthName: dateObj.toLocaleDateString('es-ES', { month: 'long' }),
            liturgicTitle: parseLiturgicTitle(item.encabezado),
            saint: parseSaint(item.celebracion_santo, item.preludio),
            reading1_title: r1.title,
            reading1_ref:   r1.ref,
            reading1_text:  r1.text,
            psalm_title: ps.title,
            psalm_ref:   ps.ref,
            psalm_text:  ps.text,
            reading2_title: r2.title,
            reading2_ref:   r2.ref,
            reading2_text:  r2.text,
            gospel_title: gp.title,
            gospel_ref:   gp.ref,
            gospel_text:  gp.text,
            comment_title: '',
            comment_text:  '',
        };
    },
};
