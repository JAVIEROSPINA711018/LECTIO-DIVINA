import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrdo } from '../contexts/OrdoContext'
import { getInspiringImage } from '../utils/imageLogic'
import { parseEvangelioForKids } from '../utils/kidsLogic'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function KidsMode() {
    const navigate = useNavigate()
    const { ordoData, isLoading: ordoLoading } = useOrdo()
    const [currentCardIndex, setCurrentCardIndex] = useState(0)
    const [factVisible, setFactVisible] = useState(false)

    // AI-generated story state
    const [storyCards, setStoryCards] = useState([])
    const [storyTitle, setStoryTitle] = useState('')
    const [funFact, setFunFact] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // Contextual image based on gospel content
    const heroImage = ordoData ? getInspiringImage(ordoData.gospel_title, ordoData.gospel_text) : null;

    // Fetch AI-powered kids story from backend
    useEffect(() => {
        if (!ordoData?.gospel_text) return;
        let cancelled = false;

        async function fetchKidsStory() {
            setIsLoading(true);
            try {
                const response = await fetch(`${BACKEND_URL}/api/context`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        verseText: ordoData.gospel_text,
                        readingRef: ordoData.gospel_ref,
                        type: 'kids',
                    }),
                });

                if (!response.ok) throw new Error(`Backend ${response.status}`);
                const data = await response.json();

                if (!cancelled && data.cards?.length > 0) {
                    setStoryCards(data.cards);
                    setStoryTitle(data.titulo || ordoData.gospel_title);
                    setFunFact(data.dato_curioso || `Hoy recordamos a ${ordoData.saint || 'un amigo de Jesús'}. ¡Tú también puedes ser muy buen amigo de Jesús!`);
                } else if (!cancelled) {
                    // Fallback to regex-based story
                    const fallbackCards = parseEvangelioForKids(ordoData.gospel_text, ordoData.gospel_title);
                    setStoryCards(fallbackCards);
                    setStoryTitle(ordoData.gospel_title);
                    setFunFact(`Hoy recordamos a ${ordoData.saint || 'un amigo de Jesús'}. ¡Tú también puedes ser muy buen amigo de Jesús!`);
                }
            } catch (err) {
                console.error('❌ Kids story error:', err.message);
                if (!cancelled) {
                    // Fallback to regex-based story
                    const fallbackCards = parseEvangelioForKids(ordoData.gospel_text, ordoData.gospel_title);
                    setStoryCards(fallbackCards);
                    setStoryTitle(ordoData.gospel_title);
                    setFunFact(`Hoy recordamos a ${ordoData.saint || 'un amigo de Jesús'}. ¡Tú también puedes ser muy buen amigo de Jesús!`);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchKidsStory();
        return () => { cancelled = true; };
    }, [ordoData?.gospel_text]);

    const kidImages = [
        '/kids/jesus_teaching.png',
        '/kids/jesus_parable.png',
        '/kids/jesus_miracle.png',
    ];

    const currentImage = kidImages[currentCardIndex % kidImages.length] || heroImage;

    const handleNext = () => {
        if (currentCardIndex < storyCards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setFactVisible(false);
        }
    };

    const handlePrev = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setFactVisible(false);
        }
    };

    const progressPercentage = storyCards.length > 0 ? ((currentCardIndex + 1) / storyCards.length) * 100 : 0;
    const isLastCard = currentCardIndex === storyCards.length - 1;
    const isFirstCard = currentCardIndex === 0;

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-surface-light min-h-[calc(100vh-80px)] font-body relative overflow-hidden transition-colors duration-300">

            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-40 bg-vellum-texture z-0"></div>

            {/* Main Container */}
            <div className="relative z-10 flex flex-col h-[calc(100vh-80px)] max-w-md mx-auto shadow-2xl bg-background-light/50 backdrop-blur-sm dark:bg-background-dark/50">

                {/* Header */}
                <header className="flex items-center justify-between px-4 py-4 pt-6 shrink-0 z-20">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} aria-label="Close" className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-light dark:bg-[#3a3030] shadow-soft text-primary hover:bg-primary/10 transition-colors">
                            <span className="material-symbols-outlined text-[24px]">close</span>
                        </button>
                    </div>
                    <h1 className="font-ui font-extrabold text-xl text-primary tracking-wide uppercase">Evangelio Niños</h1>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {storyCards.length > 0 ? `${currentCardIndex + 1}/${storyCards.length}` : '…'}
                    </div>
                </header>

                {/* Main Content: Carousel Area */}
                <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 relative w-full">

                    <button
                        onClick={handlePrev}
                        disabled={isFirstCard}
                        className={`absolute left-2 z-20 items-center justify-center w-12 h-12 rounded-full transition-all shadow-soft backdrop-blur-sm hidden sm:flex
                        ${isFirstCard ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-[32px]">chevron_left</span>
                    </button>

                    {/* Card Stack Container */}
                    <div className="relative w-full h-[75vh] perspective-1000 group">

                        {/* Main Active Card */}
                        <article className="absolute inset-0 w-full h-full bg-surface-light dark:bg-[#3a3030] rounded-[2rem] shadow-xl overflow-hidden flex flex-col transform transition-transform duration-500 border border-[#E5E0D8]">

                            {/* Top Section - Image */}
                            <div className="relative h-[50%] w-full bg-[#D4AF37]/10 overflow-hidden group-hover:scale-[1.02] transition-transform duration-700 ease-out">
                                <img
                                    key={currentImage}
                                    alt="Ilustración Bíblica Infantil"
                                    className="w-full h-full object-cover animate-fade-in"
                                    src={currentImage}
                                />

                                {/* Fun fact button */}
                                <div className="absolute bottom-4 right-4 animate-bounce-slow">
                                    <button onClick={() => setFactVisible(!factVisible)} className="bg-gold text-white font-ui font-bold text-sm px-4 py-2 rounded-full shadow-lg shadow-gold/40 flex items-center gap-2 hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                                        <span>¿Sabías qué?</span>
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Section - Story Text */}
                            <div className="relative h-[50%] p-6 flex flex-col items-center text-center justify-start bg-surface-light dark:bg-[#3a3030]">
                                <div className="w-12 h-1 bg-gold/30 rounded-full mb-3 shrink-0"></div>
                                <div className="flex-1 flex flex-col justify-start items-center overflow-y-auto no-scrollbar pb-2 w-full">
                                    {(ordoLoading || isLoading) ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3">
                                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
                                            <p className="text-primary font-bold font-ui">
                                                {ordoLoading ? 'Buscando el evangelio de hoy...' : 'Preparando tu historia...'}
                                            </p>
                                            <p className="text-stone text-sm font-ui">
                                                ¡Un momento! Jesús está preparando una historia especial para ti ✨
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {isFirstCard && (
                                                <h2 className="font-display text-2xl text-primary mb-3 leading-tight w-full text-center">
                                                    {storyTitle}
                                                </h2>
                                            )}
                                            <p className="font-ui text-lg md:text-xl text-text-main dark:text-gray-200 leading-relaxed font-medium">
                                                {storyCards[currentCardIndex] || "✨ ¡Fin de la historia! ¿Te gustó? ✨"}
                                            </p>
                                            {isLastCard && storyCards.length > 0 && (
                                                <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                                                    <p className="font-ui text-sm text-primary font-bold">🙏 ¡Eso es todo por hoy!</p>
                                                    <p className="font-ui text-xs text-stone mt-1">¿Qué aprendiste de Jesús hoy?</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </article>

                        {/* Next Cards Peaking (Visual flair) */}
                        {!isLastCard && storyCards.length > 0 && (
                            <div className="absolute top-4 scale-[0.95] translate-y-4 -z-10 w-full h-full bg-surface-light/50 rounded-[2rem] border border-stone/20 shadow-sm opacity-60"></div>
                        )}
                        {currentCardIndex < storyCards.length - 2 && (
                            <div className="absolute top-8 scale-[0.90] translate-y-8 -z-20 w-full h-full bg-surface-light/30 rounded-[2rem] border border-stone/20 shadow-sm opacity-30"></div>
                        )}

                    </div>

                    <button
                        onClick={handleNext}
                        disabled={isLastCard}
                        className={`absolute right-2 z-20 items-center justify-center w-12 h-12 rounded-full transition-all shadow-soft hidden sm:flex
                        ${isLastCard ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' : 'bg-primary text-white hover:bg-red-800 shadow-primary/30'}`}
                    >
                        <span className="material-symbols-outlined text-[32px]">chevron_right</span>
                    </button>
                </main>

                {/* Progress Bar & Mobile Controls */}
                <footer className="shrink-0 px-6 pb-8 pt-2 z-20">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 dark:bg-gray-700">
                        <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex w-full items-center justify-between sm:hidden px-2">
                            <button
                                onClick={handlePrev}
                                disabled={isFirstCard}
                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors
                                ${isFirstCard ? 'bg-surface-light border-gray-200 text-gray-300' : 'bg-surface-light border-[#E5E0D8] text-stone active:bg-gray-100'}`}
                            >
                                <span className="material-symbols-outlined text-[32px]">chevron_left</span>
                            </button>

                            <div className="flex gap-2 items-center justify-center flex-1">
                                <span className="font-ui font-bold text-sm text-primary">
                                    {isLastCard ? '¡Historia terminada!' : 'Continúa leyendo...'}
                                </span>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={isLastCard}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95
                                ${isLastCard ? 'bg-gray-300 text-white shadow-none' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}
                            >
                                <span className="material-symbols-outlined text-[32px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </footer>

                {/* Did You Know? Modal */}
                {factVisible && (
                    <div className="absolute inset-x-4 bottom-24 z-50 bg-white dark:bg-[#3a3030] p-4 rounded-2xl shadow-2xl border-2 border-gold transform transition-all duration-300 animate-slide-up">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                                <span className="material-symbols-outlined">lightbulb</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-display font-bold text-lg text-primary mb-1">¿Sabías Qué? 💡</h4>
                                <p className="font-ui text-text-main dark:text-white leading-snug">
                                    {funFact}
                                </p>
                            </div>
                            <button className="text-stone hover:text-primary shrink-0" onClick={() => setFactVisible(false)}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
