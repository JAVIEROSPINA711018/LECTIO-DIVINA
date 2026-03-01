import { createContext, useState, useEffect, useContext } from 'react';
import { evangelizoService } from '../services/evangelizo';

const OrdoContext = createContext();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function OrdoProvider({ children }) {
    const [ordoData, setOrdoData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadOrdoData() {
            setIsLoading(true);
            setError(null);
            try {
                const data = await evangelizoService.getDailyReadings();
                if (data) {
                    setOrdoData(data);
                    // Prefetch deactivated to prevent Gemini quota exhaustion (Error 429) on Vercel Serverless
                    setError("No se pudieron obtener los datos litúrgicos de hoy.");
                }
            } catch (err) {
                console.error("Error cargando OrdoContext:", err);
                setError("Error de red al conectar con el Ordo.");
            } finally {
                setIsLoading(false);
            }
        }

        loadOrdoData();
    }, []);

    return (
        <OrdoContext.Provider value={{ ordoData, isLoading, error }}>
            {children}
        </OrdoContext.Provider>
    );
}

export function useOrdo() {
    const context = useContext(OrdoContext);
    if (context === undefined) {
        throw new Error('useOrdo must be used within an OrdoProvider');
    }
    return context;
}
