import { useState } from 'react'
import { useOrdo } from '../contexts/OrdoContext'
import { Link } from 'react-router-dom'
import SaintBioOverlay from '../components/SaintBioOverlay'

export default function Home() {
    const { ordoData, isLoading, error } = useOrdo();
    const [isSaintOpen, setIsSaintOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
            </div>
        );
    }

    if (error || !ordoData) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center text-text-main p-6 text-center">
                <p>Lo sentimos, no pudimos cargar las lecturas de hoy. Por favor, revisa tu conexión a internet.</p>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100 font-body antialiased bg-noise min-h-screen flex flex-col pb-24">
            {/* Header Section */}
            <header className="content-layer sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-[#E5E0D8] dark:border-white/10 px-4 py-3">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div className="w-10">
                        <span className="material-symbols-outlined text-text-main cursor-pointer">menu</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-ui text-xs font-bold tracking-widest uppercase text-primary mb-0.5 capitalize">{ordoData.dayName}</span>
                        <h1 className="font-display text-lg font-bold leading-none text-center px-8 capitalize">{ordoData.dayNumber} {ordoData.monthName}</h1>
                    </div>
                    <div className="w-10 flex justify-end">
                        <button className="relative w-8 h-8 rounded-full overflow-hidden border border-gold/30">
                            <img alt="Profile picture" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZzHgkGFj6JIIGp4uI1UOHD2U16-3__k4MjxCn8WsyyEgHBB6V--q260OCQzwX8uB4J2nlUWAxfjZ29fSv9u8_HBtkgp6cIf1nxEXYZaLdvUgV9GldhTucfGnuKOzL6_tZnU3PcPGukv6kdmVQXrPuVjihqFyjG1ftJZXVAdwK4fVh0Dm7yPzM8GHNn-LvgIaIRCa4S8i7AbyYXiRV6NHO192L0w000TMjRm-GRgOWfGtynBCJ3yz2r50uJLDGMMyEI2p7qY_5jqwk" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Scrollable Content */}
            <main className="content-layer flex-1 px-4 w-full max-w-lg mx-auto">
                {/* Liturgical Info Area */}
                <div className="mb-8">
                    <h2 className="text-3xl font-display text-primary leading-tight font-bold mb-2">
                        {ordoData.liturgicTitle}
                    </h2>
                    {ordoData.saint && (
                        <div
                            className="flex items-center gap-2 mt-4 cursor-pointer group w-max"
                            onClick={() => setIsSaintOpen(true)}
                        >
                            <span className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-gold group-hover:text-primary text-sm">local_library</span>
                            </span>
                            <p className="text-stone italic font-ui">
                                Celebramos a: <span className="font-bold text-ink underline decoration-dotted decoration-gold/50 group-hover:decoration-primary transition-colors">{ordoData.saint}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Hero Card */}
                <Link to="/lectura?tipo=evangelio" className="block mb-8 group cursor-pointer relative">
                    <div className="aspect-[4/3] w-full rounded-xl overflow-hidden shadow-soft relative bg-gray-200">
                        <div className="absolute inset-0 bg-gray-200 animate-pulse z-0"></div>
                        <img alt="Evangelio" className="w-full h-full object-cover z-10 relative transition-transform duration-700 group-hover:scale-105" src="/images/home_hero.png" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20"></div>
                        <div className="absolute bottom-0 left-0 p-6 z-30 w-full">
                            <span className="font-ui text-gold text-xs font-bold tracking-wider uppercase mb-1 block">Evangelio del Día</span>
                            <h2 className="font-display text-white text-3xl font-bold leading-tight drop-shadow-md">{ordoData.gospel_title}</h2>
                            <div className="flex items-center gap-2 mt-2 text-white/80">
                                <span className="material-symbols-outlined text-sm">menu_book</span>
                                <span className="font-ui text-sm">{ordoData.gospel_ref}</span>
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 z-30 animate-pulse">
                            <span className="material-symbols-outlined text-gold/80 drop-shadow-md text-2xl">flare</span>
                        </div>
                    </div>
                </Link>

                {/* Readings List */}
                <section className="space-y-4">
                    <div className="flex items-center gap-4 mb-2 px-1">
                        <div className="h-px bg-gold/30 flex-1"></div>
                        <span className="font-ui text-gold font-bold text-xs tracking-widest uppercase">Lecturas de Hoy</span>
                        <div className="h-px bg-gold/30 flex-1"></div>
                    </div>

                    <Link to="/lectura?tipo=primera_lectura" className="block bg-surface dark:bg-white/5 rounded-lg p-4 shadow-soft border border-transparent hover:border-gold/30 transition-colors flex items-center gap-4 group">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background-light dark:bg-white/10 border border-[#E5E0D8] flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                            <span className="material-symbols-outlined text-gold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-display text-lg font-bold text-text-main dark:text-white leading-tight">Primera Lectura</h3>
                            <p className="font-body text-stone text-sm truncate mt-0.5">{ordoData.reading1_ref}</p>
                        </div>
                    </Link>

                    <Link to="/lectura?tipo=salmo" className="block bg-surface dark:bg-white/5 rounded-lg p-4 shadow-soft border border-transparent hover:border-gold/30 transition-colors flex items-center gap-4 group">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background-light dark:bg-white/10 border border-[#E5E0D8] flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                            <span className="material-symbols-outlined text-gold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-display text-lg font-bold text-text-main dark:text-white leading-tight">Salmo Responsorial</h3>
                            <p className="font-body text-stone text-sm truncate mt-0.5">{ordoData.psalm_ref}</p>
                        </div>
                    </Link>

                    {ordoData.reading2_ref && (
                        <Link to="/lectura?tipo=segunda_lectura" className="block bg-surface dark:bg-white/5 rounded-lg p-4 shadow-soft border border-transparent hover:border-gold/30 transition-colors flex items-center gap-4 group">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background-light dark:bg-white/10 border border-[#E5E0D8] flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                <span className="material-symbols-outlined text-gold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-display text-lg font-bold text-text-main dark:text-white leading-tight">Segunda Lectura</h3>
                                <p className="font-body text-stone text-sm truncate mt-0.5">{ordoData.reading2_ref}</p>
                            </div>
                        </Link>
                    )}

                    <Link to="/lectura?tipo=evangelio" className="block bg-surface dark:bg-white/5 rounded-lg p-4 shadow-soft border border-gold/40 hover:border-gold transition-colors cursor-pointer flex items-center gap-4 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gold/5 dark:bg-gold/10 pointer-events-none"></div>
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background-light dark:bg-white/10 border border-gold/40 flex items-center justify-center group-hover:bg-gold/10 transition-colors z-10">
                            <span className="material-symbols-outlined text-gold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                        </div>
                        <div className="flex-1 min-w-0 z-10">
                            <h3 className="font-display text-lg font-bold text-text-main dark:text-white leading-tight">Evangelio</h3>
                            <p className="font-body text-stone text-sm truncate mt-0.5">{ordoData.gospel_ref}</p>
                        </div>
                        <div className="text-primary z-10">
                            <span className="material-symbols-outlined">play_circle</span>
                        </div>
                    </Link>
                </section>

                <div className="mt-8 text-center opacity-60">
                    <p className="font-ui text-xs text-stone">Ordo Vivo - Inspirando tu día</p>
                </div>
            </main>

            <SaintBioOverlay
                isOpen={isSaintOpen}
                onClose={() => setIsSaintOpen(false)}
                saintName={ordoData.saint}
            />
        </div>
    )
}
