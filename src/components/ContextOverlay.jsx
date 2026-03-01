import { useEffect, useState } from 'react'

export default function ContextOverlay({ isOpen, onClose, title, imageSrc, definition, theologicalContext }) {
    const [isRendered, setIsRendered] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true)
        } else {
            setTimeout(() => setIsRendered(false), 300) // Match transition duration
        }
    }, [isOpen])

    if (!isRendered && !isOpen) return null

    return (
        <div className={`fixed inset-0 z-50 flex flex-col items-end justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Overlay Backdrop */}
            <div
                className="absolute inset-0 bg-[#221010]/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Context Overlay Bottom Sheet */}
            <div className={`w-full z-50 h-[85vh] md:h-[70vh] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                {/* Modal Container */}
                <div className="w-full h-full bg-[#FFFDF9] dark:bg-[#1a1a1a] rounded-t-3xl shadow-[0_-4px_24px_rgba(44,36,36,0.15)] flex flex-col relative overflow-hidden ring-1 ring-[#E5E0D8] dark:ring-white/10">

                    {/* Drag Handle Area */}
                    <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onClick={onClose}>
                        <div className="w-12 h-1.5 bg-[#E5E0D8] dark:bg-white/20 rounded-full"></div>
                    </div>

                    {/* Navigation Header */}
                    <div className="px-6 py-2 flex items-center justify-between border-b border-[#E5E0D8]/50 dark:border-white/5">
                        <button aria-label="Previous term" className="p-2 -ml-2 text-[#8C8580] hover:text-primary transition-colors rounded-full hover:bg-primary/5 group">
                            <span className="material-symbols-outlined text-2xl group-hover:-translate-x-0.5 transition-transform">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold tracking-widest text-[#8C8580] uppercase">La Lupa Histórica</span>
                        <button aria-label="Next term" className="p-2 -mr-2 text-[#8C8580] hover:text-primary transition-colors rounded-full hover:bg-primary/5 group">
                            <span className="material-symbols-outlined text-2xl group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-24 no-scrollbar">
                        {/* Term Title */}
                        <h2 className="text-4xl md:text-5xl font-bold italic text-ink dark:text-surface mb-6 font-display text-center">
                            {title || "Denario"}
                        </h2>

                        {/* Visual Context Card */}
                        <div className="relative w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden shadow-md mb-6 group border border-[#E5E0D8] dark:border-white/10 bg-[#F9F5EF]">
                            <img
                                alt="Close up"
                                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                src={imageSrc || "https://lh3.googleusercontent.com/aida-public/AB6AXuB2dcFKa4BQUDaD_wcgWdk4j7uvEzqqJEsup3jp5nEZT_Ln_yMht2yeNlTefYusoKHUE25mbKwPdXmyC9XUApIqLI4QhF5xT16iJxJrzHy7zM-Gb7dNN7KHeDLqqX58uN56x_aNkT4P-_clem_eDRD-v0Zk2LTYnWvjkAwSjo77BGPpFGf0oIHhVcBtYPq2hVSdOpOO7xBz-7Z8UMyaAc_NPmltdylAxJxC0r2wnUMbVnf0inTvhp_CJZcoShTgOjKDUJRc2eaOj7wU"}
                            />
                            <div className="absolute bottom-3 left-3 right-3">
                                <div className="bg-[#FFFDF9]/95 dark:bg-[#221010]/95 backdrop-blur-sm p-3 rounded-lg border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-start gap-3">
                                    <span className="material-symbols-outlined text-gold text-xl mt-0.5">museum</span>
                                    <div>
                                        <p className="text-ink dark:text-surface text-sm font-bold leading-tight">Moneda de plata, Siglo I d.C.</p>
                                        <p className="text-[#896161] dark:text-[#a08080] text-xs font-medium mt-0.5">Museo de Israel, Jerusalén</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Definition & Context */}
                        <div className="space-y-6 max-w-lg mx-auto">
                            <div>
                                <h3 className="text-primary text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">menu_book</span>
                                    Definición
                                </h3>
                                <p className="text-xl text-ink dark:text-gray-200 leading-relaxed font-normal">
                                    {definition || (
                                        <>
                                            Moneda romana de plata que constituía la unidad básica del sistema monetario imperial. En tiempos del Nuevo Testamento, un denario equivalía aproximadamente al <span className="bg-gold/20 px-1 rounded text-ink dark:text-white font-medium">salario de un día</span> de trabajo agrícola para un jornalero.
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="bg-[#F9F5EF] dark:bg-[#2a1a1a] p-5 rounded-xl border border-[#E5E0D8] dark:border-white/10 relative mt-8">
                                <span className="absolute -top-3 -left-2 bg-gold text-white p-1 rounded-md shadow-sm">
                                    <span className="material-symbols-outlined text-lg block">lightbulb</span>
                                </span>
                                <h4 className="text-primary dark:text-[#ff6b6b] font-bold text-lg mb-2 pl-2">Contexto Teológico</h4>
                                <p className="text-[#595050] dark:text-[#b0a8a0] text-base leading-relaxed pl-2">
                                    {theologicalContext || (
                                        <>
                                            Cuando Jesús pide ver la moneda del tributo, resalta la imagen del César grabada en ella. Teológicamente, esto contrasta con el ser humano, quien lleva grabada la <span className="italic">Imago Dei</span> (Imagen de Dios). La moneda pertenece al César, pero la persona pertenece a Dios.
                                        </>
                                    )}
                                </p>
                            </div>

                        </div>

                        {/* Sticky Bottom Action */}
                        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#FFFDF9] via-[#FFFDF9] to-transparent dark:from-[#1a1a1a] dark:via-[#1a1a1a] z-10 pointer-events-none flex justify-center pb-8">
                            <button
                                onClick={onClose}
                                className="pointer-events-auto bg-primary hover:bg-[#7a2626] text-[#FFFDF9] px-6 py-3 rounded-full font-bold text-base shadow-lg shadow-primary/20 flex items-center gap-2 transition-all transform hover:-translate-y-1"
                            >
                                <span>Cerrar context general</span>
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
