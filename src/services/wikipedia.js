export const wikipediaService = {
    /**
     * Obtiene la biografía corta y la imagen de un santo usando Wikipedia API
     * @param {string} saintName 
     * @returns 
     */
    async getSaintBiography(saintName) {
        if (!saintName) return null;

        // Omitir prefijos para que el buscador encuentre mejor el personaje histórico
        let cleanName = saintName.replace(/^(san |santa |santo |sancta )/i, '');
        // Remover también si hay comas o detalles extra (ej. "San Gregorio, Obispo")
        cleanName = cleanName.split(',')[0].trim();

        try {
            // 1. Buscar en Wikipedia para obtener el título de página exacto
            const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName)}&utf8=&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
                return null;
            }

            const bestMatchTitle = searchData.query.search[0].title;

            // 2. Traer el resumen ("extract") con ese título
            const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatchTitle)}`;
            const summaryRes = await fetch(summaryUrl);
            const summaryData = await summaryRes.json();

            if (summaryData.type === 'standard' || summaryData.type === 'disambiguation') {
                return {
                    title: summaryData.title,
                    description: summaryData.description,
                    extract: summaryData.extract,
                    thumbnail: summaryData.thumbnail ? summaryData.thumbnail.source : null,
                    fullUrl: summaryData.content_urls ? summaryData.content_urls.desktop.page : null
                };
            }

            return null;
        } catch (e) {
            console.error("Error fetching Wikipedia data:", e);
            return null;
        }
    },

    /**
     * Extrae el nombre del libro de la cita y obtiene información de Wikipedia
     * @param {string} fullTitle Ej: "Evangelio según San Mateo 5,20-26."
     */
    async getBookContext(fullTitle) {
        if (!fullTitle) return null;

        // Limpiar cita para intentar obtener solo el nombre del libro
        let bookQuery = fullTitle
            .replace(/[0-9,\-.:;]+$/, '') // Remover versículos al final
            .replace(/Lectura de la /i, '')
            .replace(/Lectura del /i, '')
            .replace(/Lectura /i, '')
            .trim();

        // Si es Evangelio, ayudar al buscador agregando "Evangelio de "
        if (bookQuery.toLowerCase().includes('evangelio según san')) {
            bookQuery = bookQuery.replace(/evangelio según san/i, 'Evangelio de');
        } else if (bookQuery.toLowerCase().includes('evangelio según')) {
            bookQuery = bookQuery.replace(/evangelio según/i, 'Evangelio de');
        }

        try {
            // Buscar en Wikipedia
            const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(bookQuery + " Biblia")}&utf8=&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
                return null;
            }

            const bestMatchTitle = searchData.query.search[0].title;
            const detailUrl = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&piprop=thumbnail&pithumbsize=400&exsentences=12&explaintext=1&titles=${encodeURIComponent(bestMatchTitle)}&format=json&origin=*`;
            const detailRes = await fetch(detailUrl);
            const detailData = await detailRes.json();

            const pages = detailData.query?.pages;
            if (pages) {
                const pageId = Object.keys(pages)[0];
                const pageInfo = pages[pageId];
                if (pageInfo && pageInfo.extract) {
                    return {
                        title: pageInfo.title,
                        extract: pageInfo.extract,
                        thumbnail: pageInfo.thumbnail ? pageInfo.thumbnail.source : null,
                    };
                }
            }
            return null;

        } catch (e) {
            console.error("Error fetching Book Context from Wikipedia:", e);
            return null;
        }
    }
};
