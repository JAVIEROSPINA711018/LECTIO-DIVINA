export const evangelizoService = {
    /**
     * Obtiene la fecha actual en formato YYYYMMDD según la zona horaria local.
     */
    getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    /**
     * Fetches the daily readings from Evangelizo API
     * @param {string} dateString Format YYYYMMDD, defaults to today
     * @returns {Promise<Object>} Parsed liturgical data
     */
    async getDailyReadings(dateString = null) {
        let fetchDate = dateString;
        if (!fetchDate) {
            fetchDate = this.getTodayDateString();
        }

        // Use AllOrigins secure CORS proxy to bypass browsers blocking HTTP requests from HTTPS Vercel apps
        const targetUrl = encodeURIComponent(`http://feed.evangelizo.org/v2/reader.php?date=${fetchDate}&type=xml&lang=SP`);
        const url = `https://api.allorigins.win/raw?url=${targetUrl}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const xmlText = await response.text();
            return this.parseEvangelizoXML(xmlText, fetchDate);
        } catch (error) {
            console.error("Error fetching Evangelizo data:", error);
            return null;
        }
    },

    /**
     * Parses the XML string returned by Evangelizo API into a structured JSON object
     * @param {string} xmlString 
     * @param {string} dateString Format YYYYMMDD
     */
    parseEvangelizoXML(xmlString, dateString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // Helper function to extract CDATA or text content safely
        const getNodeContent = (tagName) => {
            const node = xmlDoc.getElementsByTagName(tagName)[0];
            if (!node) return '';
            // Support for CDATA sections
            let content = '';
            for (let i = 0; i < node.childNodes.length; i++) {
                if (node.childNodes[i].nodeType === 4) { // CDATA_SECTION_NODE
                    content += node.childNodes[i].nodeValue;
                } else if (node.childNodes[i].nodeType === 3) { // TEXT_NODE
                    content += node.childNodes[i].nodeValue;
                }
            }
            return content.trim();
        };

        // Parse YYYYMMDD back to a JS Date object
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1;
        const day = parseInt(dateString.substring(6, 8));
        const specificDate = new Date(year, month, day);

        return {
            dateObj: specificDate,
            dateString: dateString,
            date: specificDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            dayNumber: specificDate.getDate(),
            dayName: specificDate.toLocaleDateString('es-ES', { weekday: 'short' }),
            monthName: specificDate.toLocaleDateString('es-ES', { month: 'long' }),
            liturgicTitle: getNodeContent('litugic_t'),
            saint: getNodeContent('saint'),

            // Primera Lectura
            reading1_title: getNodeContent('reading_text1_lt'),
            reading1_ref: getNodeContent('reading_text1_st'),
            reading1_text: getNodeContent('reading_text1'),

            // Salmo Responsorial
            psalm_title: getNodeContent('reading_text2_lt'),
            psalm_ref: getNodeContent('reading_text2_st'),
            psalm_text: getNodeContent('reading_text2'),

            // Segunda Lectura (Si aplica)
            reading2_title: getNodeContent('reading_text3_lt'),
            reading2_ref: getNodeContent('reading_text3_st'),
            reading2_text: getNodeContent('reading_text3'),

            // Evangelio
            gospel_title: getNodeContent('reading_gospel_lt'),
            gospel_ref: getNodeContent('reading_gospel_st'),
            gospel_text: getNodeContent('reading_gospel'),

            // Comentario Teológico / Contexto
            comment_title: getNodeContent('comment_t'),
            comment_text: getNodeContent('comment'),
        };
    }
};
