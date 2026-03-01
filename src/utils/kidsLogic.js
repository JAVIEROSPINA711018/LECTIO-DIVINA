export function parseEvangelioForKids(text, title) {
    if (!text) return [];

    let cleanText = text.replace(/<[^>]*>?/gm, ''); // quita tags html

    // Simplificaciones básicas y remplazo de palabras difíciles
    cleanText = cleanText.replace(/En aquel tiempo/gi, "🌟 Hace mucho, mucho tiempo");
    cleanText = cleanText.replace(/dijo Jesús a sus discípulos/gi, "Jesús les dijo a sus mejores amigos 👥");
    cleanText = cleanText.replace(/discípulos/gi, "amigos 👫");
    cleanText = cleanText.replace(/Reino de los cielos/gi, "Reino de Dios 🏰✨");
    cleanText = cleanText.replace(/Reino de Dios/gi, "Reino de Dios 🏰✨");
    cleanText = cleanText.replace(/fariseos/gi, "hombres gruñones 😠");
    cleanText = cleanText.replace(/escribas/gi, "hombres sabios que no entendían 📜");
    cleanText = cleanText.replace(/bienaventurados/gi, "muy felices y afortunados 🥰");
    cleanText = cleanText.replace(/amen/gi, "¡así es! 🙌");
    cleanText = cleanText.replace(/amén/gi, "¡así es! 🙌");
    cleanText = cleanText.replace(/parábola/gi, "historia o cuento 📖");
    cleanText = cleanText.replace(/pecadores/gi, "personas que se equivocaron 😔");

    // Dividimos el texto largo en oraciones o fragmentos usando punto.
    // Usamos regex para asegurar que el punto vaya seguido de un espacio y una mayúscula.
    let sentences = cleanText.split(/\. (?=[A-ZÁÉÍÓÚÑ¿¡])/g);

    // Si es muy corto (ej: un solo párrafo sin puntos intermedios que encajen),
    // intentaremos dividir por comas largas o punto y coma
    if (sentences.length === 1 && cleanText.length > 100) {
        sentences = cleanText.split(/; |,\s+(?=(pero|y|porque|cuando|entonces))/gi);
    }

    // Filtramos vacíos y limpiamos
    sentences = sentences.filter(s => s && s.trim().length > 0).map(s => {
        let finalS = s.trim();
        if (!finalS.endsWith('.') && !finalS.endsWith('!') && !finalS.endsWith('?')) {
            finalS += '.';
        }
        return finalS;
    });

    // Agrupamos en "tarjetas" de un tamaño máximo manejable para niños (por ejemplo, 2-3 oraciones breves por tarjeta)
    const cards = [];
    let currentCard = "";

    // Introducción forzada si falta contexto
    if (!sentences[0].includes("Hace mucho") && !sentences[0].includes("Jesús")) {
        cards.push("📖 ¡Vamos a escuchar una historia increíble de Jesús!\n\n" + sentences[0]);
    } else {
        currentCard = sentences[0];
    }

    const maxLen = 150; // Max caracteres por tarjeta para no aburrir
    for (let i = (cards.length > 0 ? 1 : 1); i < sentences.length; i++) {
        if (currentCard.length + sentences[i].length < maxLen) {
            currentCard += " " + sentences[i];
        } else {
            if (currentCard) cards.push(currentCard);
            currentCard = sentences[i];
        }
    }
    if (currentCard) cards.push(currentCard);

    // Decoramos algunas tarjetas resultantes con emojis aleatorios si no tienen
    const randomEmojis = ['✨', '🌟', '😇', '❤️', '🙌', '🕊️', '🌿', '🍞', '🐟'];
    const decoratedCards = cards.map(c => {
        if (!c.match(/\p{Emoji}/u)) {
            const emoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
            return `${c} ${emoji}`;
        }
        return c;
    });

    return decoratedCards;
}
