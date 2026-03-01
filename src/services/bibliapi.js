const API_BASE_URL = 'http://localhost:3000';

export const bibliapiService = {
    // Get all books
    async getLibros() {
        try {
            const response = await fetch(`${API_BASE_URL}/libros`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error("Error fetching getLibros:", error);
            return [];
        }
    },

    // Get a specific book by abbreviation
    async getLibro(abreviatura) {
        try {
            const response = await fetch(`${API_BASE_URL}/libros/${abreviatura}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error(`Error fetching getLibro ${abreviatura}:`, error);
            return null;
        }
    },

    // Get all chapters and verses for a specific book
    async getVersiculos(abreviatura) {
        try {
            const response = await fetch(`${API_BASE_URL}/versiculos/${abreviatura}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error(`Error fetching getVersiculos ${abreviatura}:`, error);
            return null;
        }
    },

    // Get a specific verse
    async getVersiculo(abreviatura, capitulo, versiculo) {
        try {
            const response = await fetch(`${API_BASE_URL}/versiculos/${abreviatura}/${capitulo}/${versiculo}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error(`Error fetching getVersiculo ${abreviatura} ${capitulo}:${versiculo}:`, error);
            return null;
        }
    }
};
