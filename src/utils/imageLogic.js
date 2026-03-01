export const getInspiringImage = (title, text = "") => {
    const content = `${title} ${text}`.toLowerCase();

    const imageMap = [
        {
            keywords: ["agua", "bautismo", "río", "mar", "lago", "barca", "pescador", "pescar"],
            url: "https://images.unsplash.com/photo-1542614392-1fb89eb20f5c?q=80&w=2000&auto=format&fit=crop" // Beautiful tranquil water
        },
        {
            keywords: ["pan", "vino", "multiplicación", "comer", "cena", "cuerpo", "sangre", "hambre"],
            url: "https://images.unsplash.com/photo-1595568194458-3645b3cba26b?q=80&w=2000&auto=format&fit=crop" // Bread and wheat rustic
        },
        {
            keywords: ["oveja", "pastor", "rebaño", "perdida"],
            url: "https://images.unsplash.com/photo-1484557985045-edf25e08da73?q=80&w=2000&auto=format&fit=crop" // Sheep in majestic landscape
        },
        {
            keywords: ["luz", "iluminar", "ciego", "ver", "sol", "resplandor"],
            url: "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?q=80&w=2000&auto=format&fit=crop" // Sun rays through forest
        },
        {
            keywords: ["montaña", "monte", "transfiguración", "subió", "oraba"],
            url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000&auto=format&fit=crop" // Majestic mountain peak
        },
        {
            keywords: ["cruz", "crucificado", "pasión", "sufrimiento", "muerte"],
            url: "https://images.unsplash.com/photo-1544026210-23a77d54d2e7?q=80&w=2000&auto=format&fit=crop" // Distant cross on hill silhouette
        },
        {
            keywords: ["semilla", "sembrador", "tierra", "cosecha", "trigo", "fruto", "árbol", "viña"],
            url: "https://images.unsplash.com/photo-15059815594-511ceccdaff4?q=80&w=2000&auto=format&fit=crop" // Golden wheat field
        },
        {
            keywords: ["desierto", "tentación", "ayuno", "cuarenta", "arena"],
            url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=2000&auto=format&fit=crop" // Beautiful desert dunes
        },
        {
            keywords: ["niño", "niños", "pequeños"],
            url: "https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?q=80&w=2000&auto=format&fit=crop" // Child reaching to light
        },
        {
            keywords: ["cielo", "nubes", "ascensión", "ángel", "espíritu"],
            url: "https://images.unsplash.com/photo-1499914485622-a88fac53ebcb?q=80&w=2000&auto=format&fit=crop" // Inspiring sky
        }
    ];

    const defaultImages = [
        "https://images.unsplash.com/photo-1438283173091-5dbf5c5a3206?q=80&w=2000&auto=format&fit=crop", // Majestic landscape 1
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2000&auto=format&fit=crop", // Majestic landscape 2
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop", // Beach sunrise
        "https://images.unsplash.com/photo-1501862700950-18382cd41497?q=80&w=2000&auto=format&fit=crop"  // Stars night sky
    ];

    // Buscamos coincidencia en nuestras categorías
    for (const category of imageMap) {
        if (category.keywords.some(keyword => content.includes(keyword))) {
            return category.url;
        }
    }

    // Si no hay coincidencia, escogemos una imagen pordefecto basada en el día del mes
    // para que sea pseudo-aleatoria pero consistente durante todo el día
    const dayOfMonth = new Date().getDate();
    const index = dayOfMonth % defaultImages.length;

    return defaultImages[index];
};
