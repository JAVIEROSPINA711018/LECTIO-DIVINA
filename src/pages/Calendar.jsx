import { useState, useEffect } from 'react';
import { useOrdo } from '../contexts/OrdoContext';
import SaintBioOverlay from '../components/SaintBioOverlay';
import { evangelizoService } from '../services/evangelizo';

export default function Calendar() {
    const { ordoData, isLoading, error } = useOrdo();
    const [isSaintOpen, setIsSaintOpen] = useState(false);
    const [futureDays, setFutureDays] = useState([]);

    useEffect(() => {
        let isMounted = true;

        async function fetchFutureDays() {
            if (!ordoData || !ordoData.dateObj) return;

            try {
                const today = ordoData.dateObj;
                const promises = [];
                for (let i = 1; i <= 3; i++) {
                    const nextDate = new Date(today);
                    nextDate.setDate(today.getDate() + i);

                    const year = nextDate.getFullYear();
                    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
                    const day = String(nextDate.getDate()).padStart(2, '0');
                    const dateString = `${year}${month}${day}`;

                    promises.push(evangelizoService.getDailyReadings(dateString));
                }

                const results = await Promise.all(promises);
                if (isMounted) {
                    setFutureDays(results.filter(r => r !== null));
                }
            } catch (err) {
                console.error("Failed to fetch future days:", err);
            }
        }

        fetchFutureDays();

        return () => { isMounted = false; };
    }, [ordoData]);

    if (isLoading) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
            </div>
        );
    }

    if (error || !ordoData) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center text-slate-900 dark:text-slate-100 p-6 text-center">
                <p>Lo sentimos, no pudimos cargar el calendario de hoy.</p>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col relative overflow-hidden pb-24">
            {/* Header Section */}
            <header className="pt-8 pb-4 px-6 bg-background-light dark:bg-background-dark sticky top-0 z-20 border-b border-primary/10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-primary dark:text-[#d44a4a] italic tracking-tight">El Ciclo Litúrgico</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-1">Año Actual</p>
                    </div>
                    <button className="flex items-center justify-center size-10 rounded-full bg-surface-light dark:bg-[#2c1a1a] shadow-sm border border-primary/10 text-primary hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined">calendar_today</span>
                    </button>
                </div>

                {/* Season Selector */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                    <button className="flex-shrink-0 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow-md shadow-primary/20 capitalize">
                        {ordoData.monthName}
                    </button>
                    {ordoData.liturgicTitle && (
                        <button className="flex-shrink-0 px-4 py-2 rounded-full bg-surface-light dark:bg-[#2c1a1a] border border-primary/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-primary/5 transition-colors max-w-[200px] truncate">
                            {ordoData.liturgicTitle}
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 px-4 relative z-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiIG9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] dark:bg-none">

                {/* Visual Timeline */}
                <div className="py-6 relative flex justify-center">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-primary/20 -z-10"></div>
                    <div className="flex justify-between items-center px-4 w-full max-w-sm mx-auto">

                        {/* Past Day */}
                        <div className="flex flex-col items-center gap-2 opacity-50 scale-90">
                            <div className="size-3 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                            <span className="text-xs font-medium text-slate-500">{ordoData.dayNumber - 2 > 0 ? ordoData.dayNumber - 2 : '-'}</span>
                        </div>
                        {/* Past Day */}
                        <div className="flex flex-col items-center gap-2 opacity-75 scale-95">
                            <div className="size-3 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                            <span className="text-xs font-medium text-slate-500">{ordoData.dayNumber - 1 > 0 ? ordoData.dayNumber - 1 : '-'}</span>
                        </div>

                        {/* Current Day */}
                        <div className="flex flex-col items-center gap-2 transform transition-transform scale-110">
                            <div className="size-12 rounded-full bg-surface-light dark:bg-[#2c1a1a] border-2 border-primary shadow-lg shadow-primary/20 flex items-center justify-center relative z-10">
                                <span className="text-lg font-bold text-primary">{ordoData.dayNumber}</span>
                            </div>
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Hoy</span>
                        </div>

                        {/* Future Day 1 */}
                        <div className="flex flex-col items-center gap-2 opacity-75 scale-95">
                            <div className="size-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                            <span className="text-xs font-medium text-slate-500">{futureDays[0] ? futureDays[0].dayNumber : '-'}</span>
                        </div>
                        {/* Future Day 2 */}
                        <div className="flex flex-col items-center gap-2 opacity-50 scale-90">
                            <div className="size-3 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                            <span className="text-xs font-medium text-slate-500">{futureDays[1] ? futureDays[1].dayNumber : '-'}</span>
                        </div>

                    </div>
                </div>

                {/* Agenda List */}
                <div className="space-y-4 mt-2 max-w-sm mx-auto">

                    {/* Today Card */}
                    <div className="relative group">
                        <div className="absolute -left-1 top-4 bottom-4 w-1 bg-primary rounded-full"></div>
                        <article className="ml-3 bg-surface-light dark:bg-[#2c1a1a] rounded-xl p-5 shadow-sm border border-primary/10 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-primary/5 pointer-events-none">
                                <span className="material-symbols-outlined text-8xl">church</span>
                            </div>
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <span className="text-xs font-semibold text-primary capitalize">{ordoData.dayName}</span>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">{ordoData.liturgicTitle}</h2>
                                {ordoData.saint && (
                                    <button
                                        onClick={() => setIsSaintOpen(true)}
                                        className="text-sm text-slate-600 dark:text-slate-400 italic mt-2 flex items-center gap-1.5 hover:text-primary transition-colors text-left group"
                                    >
                                        <span className="material-symbols-outlined text-[16px] text-primary/60 group-hover:text-primary">local_library</span>
                                        Memoria: <span className="font-bold underline decoration-dotted decoration-primary/40 group-hover:decoration-primary">{ordoData.saint}</span>
                                    </button>
                                )}
                            </div>

                            {/* Actions / Readings Preview */}
                            <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between relative z-10">
                                <div className="flex gap-3">
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                                        <span className="text-xs font-medium truncate max-w-[150px]">{ordoData.gospel_ref}</span>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-primary">arrow_forward</span>
                            </div>
                        </article>
                    </div>

                    {/* Future Days List */}
                    {futureDays.map((futureDay) => (
                        <div key={futureDay.dateString} className="relative group opacity-80 hover:opacity-100 transition-opacity">
                            <div className={`absolute -left-1 top-4 bottom-4 w-1 rounded-full ${futureDay.liturgicTitle.toLowerCase().includes('domingo') ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            <article className="ml-3 bg-white dark:bg-[#221010] rounded-lg p-4 border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
                                <div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-slate-100 dark:border-white/5 pr-4">
                                    <span className="text-2xl font-bold text-slate-400 dark:text-slate-600">{futureDay.dayNumber}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">{futureDay.dayName}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-base font-semibold line-clamp-2 leading-tight ${futureDay.liturgicTitle.toLowerCase().includes('domingo') ? 'text-green-700 dark:text-green-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {futureDay.liturgicTitle}
                                    </h3>
                                    {futureDay.saint && (
                                        <p className="text-xs text-slate-500 italic mt-1 line-clamp-1 truncate hover:text-primary transition-colors cursor-pointer" onClick={() => setIsSaintOpen(true)}>
                                            {futureDay.saint}
                                        </p>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
                            </article>
                        </div>
                    ))}

                </div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 right-4 z-40">
                <button className="bg-primary hover:bg-[#7a2626] text-white rounded-full p-4 shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined">today</span>
                </button>
            </div>

            <SaintBioOverlay
                isOpen={isSaintOpen}
                onClose={() => setIsSaintOpen(false)}
                saintName={ordoData?.saint}
            />

        </div>
    )
}
