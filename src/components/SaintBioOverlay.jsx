import { useEffect, useState } from 'react';
import { wikipediaService } from '../services/wikipedia';

export default function SaintBioOverlay({ isOpen, onClose, saintName }) {
    const [bioData, setBioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (isOpen && saintName) {
            setIsLoading(true);
            setHasError(false);

            wikipediaService.getSaintBiography(saintName).then(data => {
                if (!isMounted) return;
                if (data && data.extract) {
                    setBioData(data);
                } else {
                    setHasError(true);
                }
                setIsLoading(false);
            });
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen, saintName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100 relative rounded-2xl md:max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl transform transition-all animate-fadeInUp">
                {/* Encabezado */}
                <div className="flex items-center justify-between p-4 border-b border-stone/20 bg-surface dark:bg-white/5">
                    <h2 className="font-display font-bold text-lg text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-gold">local_library</span>
                        Sobre el Santo
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full w-8 h-8 flex items-center justify-center bg-stone/10 hover:bg-stone/20 text-ink transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Contenido desplazable */}
                <div className="p-6 overflow-y-auto font-body text-ink flex-1 bg-background-light dark:bg-background-dark">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
                            <p className="text-sm text-stone font-medium animate-pulse">Consultando biografía...</p>
                        </div>
                    ) : hasError ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-4xl text-stone mb-2">menu_book</span>
                            <p className="text-lg font-medium text-ink">No se encontró una biografía para este santo.</p>
                            <p className="text-sm text-stone mt-2">Puede que el nombre no coincida exactamente con los registros históricos disponibles.</p>
                        </div>
                    ) : bioData ? (
                        <div className="flex flex-col items-center">
                            {bioData.thumbnail && (
                                <div className="w-32 h-32 rounded-full overflow-hidden mb-5 border-4 border-surface shadow-md">
                                    <img src={bioData.thumbnail} alt={bioData.title} className="w-full h-full object-cover" />
                                </div>
                            )}

                            <h3 className="font-display text-2xl text-center mb-1 text-ink">{bioData.title}</h3>

                            {bioData.description && (
                                <p className="text-xs uppercase text-gold tracking-wider mb-5 text-center font-bold">
                                    {bioData.description}
                                </p>
                            )}

                            <div className="bg-surface dark:bg-white/5 p-5 rounded-xl border border-stone/10 shadow-sm mb-6 w-full relative">
                                <span className="material-symbols-outlined absolute top-3 left-3 text-gold/20 text-4xl">format_quote</span>
                                <p className="text-[15px] leading-relaxed text-left opacity-90 first-letter:float-left first-letter:text-4xl first-letter:pr-1 first-letter:font-display first-letter:text-primary pb-2 relative z-10">
                                    {bioData.extract}
                                </p>
                            </div>

                            {bioData.fullUrl && (
                                <a
                                    href={bioData.fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium py-3 px-6 rounded-full hover:bg-black transition-colors shadow-md group"
                                >
                                    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">open_in_new</span>
                                    Ampliar biografía completa
                                </a>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
