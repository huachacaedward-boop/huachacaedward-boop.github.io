import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Sparkles,
  UploadCloud,
  Layers,
  HardDrive,
  Eye,
  Trash2,
  Share2,
  Check,
  Smartphone,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  Maximize,
  Volume2,
  ShieldCheck,
  Lock,
  UserCheck
} from 'lucide-react';
import { PortfolioMeta } from '../types';
import { DeviceInfo } from '../services/deviceDetector';

interface PortfolioLibraryProps {
  portfolios: PortfolioMeta[];
  isAdmin?: boolean;
  deviceInfo?: DeviceInfo;
  onSelectPortfolio: (portfolio: PortfolioMeta) => void;
  onOpenUpload: () => void;
  onDeletePortfolio: (id: string) => void;
  onToggleAdminMode?: () => void;
}

export const PortfolioLibrary: React.FC<PortfolioLibraryProps> = ({
  portfolios,
  isAdmin = true,
  deviceInfo,
  onSelectPortfolio,
  onOpenUpload,
  onDeletePortfolio,
  onToggleAdminMode,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareCard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Generates universal client-presentation URL (works on any mobile, tablet or desktop)
    const url = `${window.location.origin}${window.location.pathname}?portfolio=${encodeURIComponent(id)}&page=1&mode=client`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categories = [
    { id: 'todos', name: 'Todos los Proyectos' },
    ...(isAdmin ? [{ id: 'mis-portafolios', name: 'Mis Portafolios' }] : []),
    { id: 'arquitectura', name: 'Arquitectura' },
    { id: 'diseno', name: 'Diseño & Láminas' },
    { id: 'fotografia', name: 'Fotografía & Renders' },
  ];

  const filteredPortfolios = portfolios.filter((p) => {
    // Category filter
    if (activeCategory === 'mis-portafolios' && p.isSample) return false;
    if (activeCategory !== 'todos' && activeCategory !== 'mis-portafolios' && p.category !== activeCategory) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="relative min-h-screen bg-[#0b0d11] text-stone-100 flex flex-col selection:bg-amber-500 selection:text-black font-sans overflow-x-hidden">
      {/* Abstract Architectural Atmospheric Background Image */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <img
          src="/src/assets/images/arch_abstract_bg_1786924042508.jpg"
          alt="Fondo Arquitectónico Abstracto"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 filter contrast-125 brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/85 via-neutral-950/70 to-neutral-950/95" />
        <div className="absolute inset-0 bg-arch-studio-dark opacity-40 mix-blend-overlay" />
      </div>

      {/* Top Main Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/85 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-arch font-bold tracking-tight text-lg sm:text-xl text-white">
                Folio<span className="text-amber-400">Flip</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono-tech font-semibold px-2 py-0.5 rounded bg-white/10 text-amber-200 border border-white/10 uppercase tracking-wider">
                {isAdmin ? 'Panel de Autor / Admin' : 'Presentación 3D'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin / Client Mode Switcher */}
            {onToggleAdminMode && (
              <button
                id="toggle-role-mode-btn"
                onClick={onToggleAdminMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono-tech transition cursor-pointer uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-white/10 border-white/15 text-stone-300 hover:bg-white/15'
                }`}
                title={isAdmin ? 'Haz clic para previsualizar como cliente (sin opciones de eliminar)' : 'Volver a modo Administrador'}
              >
                {isAdmin ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Admin</span>
                    <span className="text-[9px] text-amber-400/80 underline ml-1">Vista cliente</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Modo Presentación</span>
                  </>
                )}
              </button>
            )}

            {/* Upload Button: ONLY shown if user is Admin */}
            {isAdmin && (
              <button
                id="header-upload-btn"
                onClick={onOpenUpload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-arch font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Publicar PDF</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Architectural CAD Matrix */}
      <section className="relative overflow-hidden px-4 sm:px-8 py-10 sm:py-16 border-b border-white/10 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono-tech uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'Plataforma de Publicación Arquitectónica HD' : 'Galería de Proyectos y Memorias 3D'}</span>
              </div>
              {deviceInfo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-stone-300 text-[11px] font-mono-tech">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{deviceInfo.deviceLabel} ({deviceInfo.osName})</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-arch font-bold tracking-tight text-white leading-tight">
              Portafolios y Láminas en PDF que se leen{' '}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                en libro 3D interactivo
              </span>
            </h1>

            <p className="text-sm sm:text-base text-stone-300 mt-4 max-w-2xl leading-relaxed">
              {isAdmin
                ? 'Visualiza tus proyectos de arquitectura, renders y planos en un visor de alta fidelidad con paso de página físico. Al compartir tu enlace, tus clientes verán el portafolio en modo presentación limpia sin permisos para eliminar ni editar.'
                : 'Explora y hojea las memorias de proyectos arquitectónicos, planos y renders en formato libro físico interactivo de alta definición.'}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/30 transition backdrop-blur-sm">
                <div className="text-amber-400 mb-1">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-xs font-arch font-bold text-white uppercase tracking-wide">Efecto Libro 3D</div>
                <div className="text-[11px] font-mono-tech text-stone-400">Doble spread y física real</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/30 transition backdrop-blur-sm">
                <div className="text-amber-400 mb-1">
                  <Maximize className="w-5 h-5" />
                </div>
                <div className="text-xs font-arch font-bold text-white uppercase tracking-wide">Fotos & Renders HD</div>
                <div className="text-[11px] font-mono-tech text-stone-400">Clic para aislar a full screen</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/30 transition backdrop-blur-sm">
                <div className="text-sky-400 mb-1">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-xs font-arch font-bold text-white uppercase tracking-wide">100% Responsivo</div>
                <div className="text-[11px] font-mono-tech text-stone-400">Móvil, tablet y escritorio</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/30 transition backdrop-blur-sm">
                <div className="text-emerald-400 mb-1">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="text-xs font-arch font-bold text-white uppercase tracking-wide">Hasta 500 MB</div>
                <div className="text-[11px] font-mono-tech text-stone-400">Máxima resolución vectorial</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Portfolios Showcase / Filter Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8">
        {/* Controls Bar: Category tabs & Search input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-arch font-semibold whitespace-nowrap transition-all cursor-pointer tracking-wider uppercase ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/5'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              id="search-portfolios-input"
              type="text"
              placeholder="Buscar por proyecto o autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-400 transition font-mono-tech"
            />
          </div>
        </div>

        {/* Portfolios Cards Grid */}
        {filteredPortfolios.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white/5 border border-white/10">
            <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No se encontraron portafolios</h3>
            <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
              Prueba con otro término de búsqueda o sube tu primer archivo PDF para comenzar a leerlo en formato libro.
            </p>
            <button
              onClick={onOpenUpload}
              className="mt-5 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publicar PDF Ahora</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.map((portfolio) => (
              <motion.div
                key={portfolio.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-2xl overflow-hidden bg-neutral-900/90 border border-white/10 hover:border-amber-400/60 shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1 backdrop-blur-md"
              >
                {/* Book Cover Preview Stage */}
                <div
                  onClick={() => onSelectPortfolio(portfolio)}
                  className="relative aspect-[4/3] bg-neutral-950 overflow-hidden cursor-pointer flex items-center justify-center p-4"
                >
                  {/* Adaptive 3D angled book mockup effect */}
                  <div
                    className="relative max-w-[85%] max-h-56 rounded-sm shadow-2xl overflow-hidden border border-white/20 transform group-hover:scale-105 group-hover:-rotate-1 transition-transform duration-500 bg-white"
                    style={{
                      aspectRatio: `${portfolio.pages[0]?.aspectRatio || 0.75}`,
                      height: '210px',
                    }}
                  >
                    <img
                      src={portfolio.coverImage}
                      alt={portfolio.title}
                      className="w-full h-full object-fill bg-white block"
                      loading="lazy"
                    />
                    {/* Spine Shadow on Card preview */}
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {portfolio.isSample ? (
                      <span className="text-[9px] font-mono-tech uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                        Muestra Editorial
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono-tech uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                        Subido por ti
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono-tech text-white/90 border border-white/10">
                    {portfolio.totalPages} PÁGS • {portfolio.fileSizeFormatted}
                  </div>

                  {/* Hover Prompt Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <span className="px-4 py-2 rounded-lg bg-amber-500 text-black font-arch font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl">
                      <BookOpen className="w-4 h-4" />
                      <span>Abrir Libro 3D</span>
                    </span>
                  </div>
                </div>

                {/* Card Meta & Actions */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono-tech text-amber-400/80 uppercase tracking-widest mb-1">
                      {portfolio.category.toUpperCase()} // PROYECTO
                    </div>
                    <h3
                      onClick={() => onSelectPortfolio(portfolio)}
                      className="text-base font-arch font-bold text-white hover:text-amber-400 cursor-pointer transition line-clamp-1"
                    >
                      {portfolio.title}
                    </h3>
                    <p className="text-xs font-mono-tech text-stone-400 mt-0.5">{portfolio.author}</p>
                    <p className="text-xs text-stone-300 mt-2 line-clamp-2 leading-relaxed">
                      {portfolio.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-arch">
                    <button
                      id={`open-book-btn-${portfolio.id}`}
                      onClick={() => onSelectPortfolio(portfolio)}
                      className="flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 cursor-pointer tracking-wider uppercase"
                    >
                      <span>Hojeear portafolio</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        id={`share-btn-${portfolio.id}`}
                        onClick={(e) => handleShareCard(e, portfolio.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer text-xs font-semibold ${
                          copiedId === portfolio.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white'
                        }`}
                        title="Copiar enlace de presentación limpia para cliente (solo lectura)"
                      >
                        {copiedId === portfolio.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px]">Enlace Cliente Copiado</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">Compartir</span>
                          </>
                        )}
                      </button>

                      {/* Delete button: ONLY visible if user is the Admin */}
                      {isAdmin && !portfolio.isSample && (
                        <button
                          id={`delete-btn-${portfolio.id}`}
                          onClick={() => onDeletePortfolio(portfolio.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-stone-400 hover:text-red-400 transition cursor-pointer"
                          title="Eliminar de mi biblioteca de administrador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="border-t border-white/10 bg-neutral-950 px-4 sm:px-8 py-6 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>FolioFlip • Visor de Portafolios en Libro 3D</span>
            <span className="text-stone-600">|</span>
            <span className="text-[11px] font-mono-tech text-stone-400">
              {isAdmin ? 'Modo: Administrador de Portafolio' : 'Modo: Vista de Presentación / Cliente'}
            </span>
          </div>
          {onToggleAdminMode && (
            <button
              onClick={onToggleAdminMode}
              className="text-[11px] font-mono-tech text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
            >
              {isAdmin ? 'Ver cómo lo ven mis clientes' : 'Acceso Administrador'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
