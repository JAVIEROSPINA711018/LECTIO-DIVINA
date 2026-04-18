import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useOrdo } from './contexts/OrdoContext'
import { geminiService } from './services/gemini'

// ─── Qué tabs muestra cada tipo de lectura ──────────────────────
const TABS_BY_TYPE = {
  primera_lectura: ['historico_cultural'],
  segunda_lectura: ['historico_cultural'],
  salmo:           ['teologico'],
  evangelio:       ['historico_cultural', 'teologico'],
}

export default function AppReading() {
  const [searchParams] = useSearchParams()
  const tipoLectura = searchParams.get('tipo') || 'evangelio'

  const { ordoData, isLoading, error } = useOrdo()

  const availableTabs = TABS_BY_TYPE[tipoLectura] || TABS_BY_TYPE.evangelio
  const [activeContextTab, setActiveContextTab] = useState(availableTabs[0])

  const [historicoCultural, setHistoricoCultural] = useState(null)
  const [teologico, setTeologico]               = useState(null)
  const [isHistoricoLoading, setIsHistoricoLoading] = useState(false)
  const [isTeologicoLoading, setIsTeologicoLoading] = useState(false)

  const getReadingData = () => {
    if (!ordoData) return null
    switch (tipoLectura) {
      case 'primera_lectura':
        return { title: 'Primera Lectura',    ref: ordoData.reading1_ref, text: ordoData.reading1_text, subtitle: ordoData.reading1_title }
      case 'segunda_lectura':
        return { title: 'Segunda Lectura',    ref: ordoData.reading2_ref, text: ordoData.reading2_text, subtitle: ordoData.reading2_title }
      case 'salmo':
        return { title: 'Salmo Responsorial', ref: ordoData.psalm_ref,    text: ordoData.psalm_text,    subtitle: ordoData.psalm_title }
      case 'evangelio':
      default:
        return { title: 'Evangelio',          ref: ordoData.gospel_ref,   text: ordoData.gospel_text,   subtitle: ordoData.gospel_title }
    }
  }

  const readingData = getReadingData()
  const verseText   = readingData?.text || ''
  const verseRef    = readingData?.ref  || ''

  // Sincronizar el tab activo cuando cambia el tipo de lectura
  useEffect(() => {
    setActiveContextTab(availableTabs[0])
    setHistoricoCultural(null)
    setTeologico(null)
  }, [tipoLectura])

  // ⚡ Carga SOLO los contextos que le corresponden al tipo de lectura
  useEffect(() => {
    if (!verseText) return
    let cancelled = false

    if (availableTabs.includes('historico_cultural')) {
      setIsHistoricoLoading(true)
      geminiService.getHistoricoCultural(verseText, verseRef)
        .then(result => {
          if (!cancelled) { setHistoricoCultural(result); setIsHistoricoLoading(false) }
        })
        .catch(() => {
          if (!cancelled) { setHistoricoCultural({ error: 'No disponible', historico: '', cultural: '' }); setIsHistoricoLoading(false) }
        })
    }

    if (availableTabs.includes('teologico')) {
      setIsTeologicoLoading(true)
      geminiService.getTeologico(verseText, verseRef)
        .then(result => {
          if (!cancelled) { setTeologico(result); setIsTeologicoLoading(false) }
        })
        .catch(() => {
          if (!cancelled) { setTeologico({ teologico: '', error: 'No disponible' }); setIsTeologicoLoading(false) }
        })
    }

    return () => { cancelled = true }
  }, [verseText])

  // ─── Render de párrafos ───────────────────────────────────────
  const renderGospelText = (text) => {
    if (!text) return null
    return text.split('\n').filter(p => p.trim().length > 0).map((p, idx) => (
      <p key={idx} className="mb-6 relative text-ink">{p}</p>
    ))
  }

  // ─── Estados de carga / error globales ───────────────────────
  if (isLoading) {
    return (
      <div className="bg-background-light min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
      </div>
    )
  }

  if (error || !ordoData || !readingData || !readingData.text) {
    return (
      <div className="bg-background-light min-h-screen flex items-center justify-center text-text-main p-6 text-center">
        <p>Lo sentimos, no pudimos cargar la lectura. Por favor, revisa tu conexión a internet.</p>
      </div>
    )
  }

  // ─── Etiquetas de tab ─────────────────────────────────────────
  const TAB_LABELS = {
    historico_cultural: 'Histórico · Cultural',
    teologico:          tipoLectura === 'salmo' ? 'Reflexión' : 'Teológico',
  }

  return (
    <div className="bg-background-light text-ink antialiased font-body min-h-screen relative selection:bg-primary/20">

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-background-light/95 backdrop-blur-sm border-b border-stone/20">
        <div className="max-w-md mx-auto relative">
          <div className="flex items-center justify-between px-4 h-16">
            <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone/10 text-ink transition-colors group">
              <span className="material-symbols-outlined text-[24px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            </Link>
            <div className="flex flex-col items-center justify-center">
              <span className="font-display text-primary text-xl font-bold leading-none truncate max-w-[200px]">{readingData.title}</span>
              <span className="font-ui text-stone text-[10px] tracking-widest uppercase mt-1">{ordoData.liturgicTitle}</span>
            </div>
            <div className="w-10" />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-stone/20">
            <div className="h-full bg-primary w-[35%] rounded-r-full" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 pb-4 pt-8 relative">
        {/* Referencia + título */}
        <div className="mb-10 text-center">
          <div className="inline-block px-3 py-1 bg-gold/10 rounded-full mb-3">
            <span className="font-ui text-gold text-sm font-bold tracking-wider">{readingData.ref}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">{readingData.subtitle}</h1>
        </div>

        {/* Texto de la lectura */}
        <article className="prose prose-lg prose-stone mx-auto text-ink">
          <div className="relative drop-cap text-[20px] leading-relaxed text-justify font-normal">
            {renderGospelText(readingData.text)}
          </div>
          <div className="mt-12 pt-6 border-t border-stone/20 text-center mb-12">
            <p className="text-stone text-sm font-ui uppercase tracking-widest">Palabra del Señor</p>
            <p className="font-display text-primary font-bold text-xl mt-1">Gloria a ti, Señor Jesús</p>
          </div>
        </article>

        {/* ── Sección de Contextos ── */}
        <section className="mt-8 mb-32 bg-surface rounded-2xl p-1 shadow-soft border border-stone/10 overflow-hidden">

          {/* Tabs — solo muestra los relevantes para este tipo */}
          {availableTabs.length > 1 && (
            <div className="flex bg-background-light p-1 rounded-t-xl overflow-x-auto no-scrollbar">
              {availableTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveContextTab(tab)}
                  className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
                    ${activeContextTab === tab
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-stone hover:text-ink hover:bg-white/50'}`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          )}

          {/* Contenido de tab único sin cabecera */}
          {availableTabs.length === 1 && (
            <div className="px-5 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gold text-[20px]">
                  {availableTabs[0] === 'historico_cultural' ? 'local_library' : 'lightbulb'}
                </span>
                <span className="font-ui text-xs font-bold uppercase tracking-widest text-stone">
                  {TAB_LABELS[availableTabs[0]]}
                </span>
              </div>
            </div>
          )}

          {/* Panel de contenido */}
          <div className="p-5 bg-white rounded-b-xl min-h-[250px]">

            {/* ── HISTÓRICO-CULTURAL ── */}
            {activeContextTab === 'historico_cultural' && availableTabs.includes('historico_cultural') && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-gold">local_library</span>
                  <h3 className="font-display text-xl font-bold text-ink">Contexto Histórico y Cultural</h3>
                </div>

                {isHistoricoLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-4">
                    <span className="material-symbols-outlined text-[40px] text-primary animate-pulse">psychiatry</span>
                    <p className="text-stone font-ui font-medium animate-pulse text-sm text-center">Analizando contexto histórico y cultural...</p>
                  </div>
                ) : historicoCultural?.error && !historicoCultural?.historico ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
                    <span className="material-symbols-outlined text-gold text-4xl">schedule</span>
                    <p className="text-ink font-bold text-base">Contexto en preparación</p>
                    <p className="text-stone text-sm leading-relaxed">
                      El contexto histórico-cultural estará disponible pronto.
                    </p>
                  </div>
                ) : historicoCultural ? (
                  <div className="space-y-4">
                    {historicoCultural.historico && (
                      <>
                        <h4 className="font-ui font-bold text-primary text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">history_edu</span> Histórico
                        </h4>
                        <p className="text-sm leading-relaxed text-ink/90 text-justify bg-surface-light p-3 rounded-xl border border-[#E5E0D8]">
                          {historicoCultural.historico}
                        </p>
                      </>
                    )}
                    {historicoCultural.cultural && (
                      <>
                        <h4 className="font-ui font-bold text-primary text-sm flex items-center gap-1 mt-6">
                          <span className="material-symbols-outlined text-[16px]">public</span> Cultural
                        </h4>
                        <p className="text-sm leading-relaxed text-ink/90 text-justify bg-surface-light p-3 rounded-xl border border-[#E5E0D8]">
                          {historicoCultural.cultural}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone italic text-center p-4 py-8">No se encontró contexto disponible.</p>
                )}
              </div>
            )}

            {/* ── TEOLÓGICO / REFLEXIÓN ── */}
            {activeContextTab === 'teologico' && availableTabs.includes('teologico') && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary">lightbulb</span>
                  <h3 className="font-display text-xl font-bold text-ink">
                    {tipoLectura === 'salmo' ? 'Reflexión del Salmo' : 'Reflexión Apostólica'}
                  </h3>
                </div>

                {isTeologicoLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-4">
                    <span className="material-symbols-outlined text-[40px] text-primary animate-pulse">psychiatry</span>
                    <p className="text-stone font-ui font-medium animate-pulse text-sm text-center">
                      {tipoLectura === 'salmo' ? 'Preparando la reflexión del salmo...' : 'Consultando el Estudio Bíblico...'}
                    </p>
                  </div>
                ) : teologico?.error && !teologico?.teologico ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
                    <span className="material-symbols-outlined text-gold text-4xl">schedule</span>
                    <p className="text-ink font-bold text-base">Reflexión en preparación</p>
                    <p className="text-stone text-sm leading-relaxed">La reflexión estará disponible pronto.</p>
                  </div>
                ) : teologico ? (
                  <div className="space-y-4">
                    {teologico.error && (
                      <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-200">{teologico.error}</div>
                    )}
                    {teologico.teologico && (
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <p className="text-sm leading-relaxed text-ink/90 text-justify">{teologico.teologico}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone italic text-center p-4 py-8">Comentario no disponible.</p>
                )}
              </div>
            )}

          </div>
        </section>
      </main>

      {/* FAB — Modo Niños */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          to="/kids"
          className="group flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-12 transition-transform">child_care</span>
          <span className="absolute right-full mr-3 bg-ink text-surface text-xs font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm">
            Modo Niños
          </span>
        </Link>
      </div>

    </div>
  )
}
