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
  Volume2
} from 'lucide-react';
import { PortfolioMeta } from '../types';

interface PortfolioLibraryProps {
  portfolios: PortfolioMeta[];
  onSelectPortfolio: (portfolio: PortfolioMeta) => void;
  onOpenUpload: () => void;
  onDeletePortfolio: (id: string) => void;
}

export const PortfolioLibrary: React.FC<PortfolioLibraryProps> = ({
  portfolios,
  onSelectPortfolio,
  onOpenUpload,
  onDeletePortfolio,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareCard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#portfolio=${id}&page=1`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categories = [
    { id: 'todos', name: 'Todos' },
    { id: 'mis-portafolios', name: 'Mis Portafolios Subidos' },
    { id: 'arquitectura', name: 'Arquitectura' },
    { id: 'diseno', name: 'Diseño UI/UX' },
    { id: 'fotografia', name: 'Fotografía & Arte' },
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
    <div className="min-h-screen bg-[#0d0f12] text-white flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Main Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg sm:text-xl text-white">
                Folio<span className="text-amber-400">Flip</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                Libros Interactivos HD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="header-upload-btn"
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publicar PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Quick Specs */}
      <section className="relative overflow-hidden px-4 sm:px-8 py-10 sm:py-16 border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,#2a2216_0%,transparent_60%)]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Experiencia Editorial 3D • Calidad Ultra HD</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Tus Portafolios en PDF que se leen y hojean{' '}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                como un auténtico libro
              </span>
            </h1>

            <p className="text-sm sm:text-base text-white/70 mt-4 max-w-2xl leading-relaxed">
              Publica y comparte tus memorias de proyectos, catálogos y obras visuales en un visor de alta fidelidad
              con paso de página físico, compatible con archivos de hasta <strong>500 MB</strong> y{' '}
              <strong>100 páginas</strong> sin ninguna pérdida de calidad.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-amber-400 mb-1">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white">Efecto Libro 3D</div>
                <div className="text-[11px] text-white/50">Doble spread y sonido real</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-emerald-400 mb-1">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white">Hasta 500 MB</div>
                <div className="text-[11px] text-white/50">Y hasta 100 hojas por PDF</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-sky-400 mb-1">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white">100% Móvil & Táctil</div>
                <div className="text-[11px] text-white/50">Gestos swipe y pinch zoom</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-purple-400 mb-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white">Ultra HD Nítido</div>
                <div className="text-[11px] text-white/50">Sin pixelado ni compresión</div>
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
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              id="search-portfolios-input"
              type="text"
              placeholder="Buscar por título o autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition"
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
                className="group relative rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 hover:border-amber-500/50 shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1"
              >
                {/* Book Cover Preview Stage */}
                <div
                  onClick={() => onSelectPortfolio(portfolio)}
                  className="relative aspect-[4/3] bg-neutral-950 overflow-hidden cursor-pointer flex items-center justify-center p-4"
                >
                  {/* Subtle 3D angled book mockup effect */}
                  <div className="relative w-44 h-56 rounded-md shadow-2xl overflow-hidden border border-white/15 transform group-hover:scale-105 group-hover:-rotate-1 transition-transform duration-500 bg-white">
                    <img
                      src={portfolio.coverImage}
                      alt={portfolio.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Spine Shadow on Card preview */}
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {portfolio.isSample ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Muestra Editorial
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Subido por ti
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white/90">
                    {portfolio.totalPages} págs • {portfolio.fileSizeFormatted}
                  </div>

                  {/* Hover Prompt Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <span className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Abrir en Libro 3D</span>
                    </span>
                  </div>
                </div>

                {/* Card Meta & Actions */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => onSelectPortfolio(portfolio)}
                      className="text-base font-bold text-white hover:text-amber-400 cursor-pointer transition line-clamp-1"
                    >
                      {portfolio.title}
                    </h3>
                    <p className="text-xs font-medium text-white/50 mt-0.5">{portfolio.author}</p>
                    <p className="text-xs text-white/70 mt-2 line-clamp-2 leading-relaxed">
                      {portfolio.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <button
                      id={`open-book-btn-${portfolio.id}`}
                      onClick={() => onSelectPortfolio(portfolio)}
                      className="flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      <span>Hojeear portafolio</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        id={`share-btn-${portfolio.id}`}
                        onClick={(e) => handleShareCard(e, portfolio.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer text-xs font-semibold ${
                          copiedId === portfolio.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white'
                        }`}
                        title="Copiar enlace directo al libro interactivo"
                      >
                        {copiedId === portfolio.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">Enlace</span>
                          </>
                        )}
                      </button>

                      {!portfolio.isSample && (
                        <button
                          id={`delete-btn-${portfolio.id}`}
                          onClick={() => onDeletePortfolio(portfolio.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition cursor-pointer"
                          title="Eliminar de mi biblioteca"
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
      <footer className="border-t border-white/10 bg-neutral-950 px-4 sm:px-8 py-6 text-center text-xs text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>FolioFlip • Visor y Publicador de Portafolios en Libro Interactivo 3D</span>
          <span>Soporta archivos PDF de hasta 500 MB y 100 páginas en calidad Ultra HD</span>
        </div>
      </footer>
    </div>
  );
};
