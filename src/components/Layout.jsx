import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
    const currentPath = location.pathname;

    return (
        <div className="relative min-h-screen pb-[80px]">
            <Outlet />

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-[#FFFDF9] dark:bg-[#1a0c0c] border-t border-[#E5E0D8] pb-safe pt-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-end px-2 pb-5 pt-2 max-w-lg mx-auto relative">

                    <Link to="/" className={`flex flex-col items-center gap-1 min-w-[64px] group ${currentPath === '/' ? 'text-primary' : 'text-[#8C8580] hover:text-primary'}`}>
                        <span className="material-symbols-outlined text-[24px]" style={currentPath === '/' ? { fontVariationSettings: "'FILL' 1" } : {}}>cottage</span>
                        <span className="text-[10px] font-ui font-bold">Inicio</span>
                    </Link>


                    <Link to="/calendario" className={`flex flex-col items-center gap-1 min-w-[64px] group ${currentPath === '/calendario' ? 'text-primary' : 'text-[#8C8580] hover:text-primary'}`}>
                        <span className="material-symbols-outlined text-[24px]" style={currentPath === '/calendario' ? { fontVariationSettings: "'FILL' 1" } : {}}>calendar_month</span>
                        <span className="text-[10px] font-ui font-medium">Ciclo</span>
                    </Link>

                    <Link to="/kids" className="flex flex-col items-center gap-1 min-w-[64px] group text-[#8C8580] hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[24px]">child_care</span>
                        <span className="text-[10px] font-ui font-medium">Niños</span>
                    </Link>

                </div>
            </nav>
        </div>
    )
}
