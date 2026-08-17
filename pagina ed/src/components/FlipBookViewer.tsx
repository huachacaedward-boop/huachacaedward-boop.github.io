import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Grid,
  ZoomIn,
  ZoomOut,
  Share2,
  Download,
  BookOpen,
  Eye,
  Sliders,
  X,
  Check,
  Smartphone,
  Layers,
  ArrowLeft,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PortfolioMeta, PortfolioPage, ViewerSettings, BookBackgroundTheme } from '../types';
import { playPageFlipSound } from '../services/soundService';

interface FlipBookViewerProps {
  portfolio: PortfolioMeta;
  initialPage?: number;
  onBack: () => void;
  onUploadNew?: () => void;
}

export const FlipBookViewer: React.FC<FlipBookViewerProps> = ({
  portfolio,
  initialPage = 1,
  onBack,
  onUploadNew,
}) => {
  // Page index state (1-indexed)
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const p = parseInt(params.get('page') || '', 10);
      if (p >= 1 && p <= portfolio.pages.length) return p;
    }
    return Math.max(1, Math.min(initialPage, portfolio.pages.length || 1));
  });
  const [targetPageInput, setTargetPageInput] = useState<string>(() => currentPage.toString());

  // Animation & flipping state
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [animatingPageNumber, setAnimatingPageNumber] = useState<number | null>(null);

  // Layout & viewport responsive detection
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Viewer settings
  const [settings, setSettings] = useState<ViewerSettings>({
    soundEnabled: true,
    viewMode: 'auto',
    backgroundTheme: 'studio-dark',
    pageShadowIntensity: 0.7,
    autoFlipInterval: 4,
    zoomScale: 1.0,
    showPageNumbers: true,
    hardcoverEffect: true,
  });

  // UI Drawer / Modal toggles
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);

  // Zoom & Pan state
  const [isZoomMode, setIsZoomMode] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.8);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch gesture tracking for mobile swipe
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Total pages
  const totalPages = portfolio.pages.length;

  // Responsive check
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine effective view mode (single page or double spread)
  const isSinglePageMode = settings.viewMode === 'single' || (settings.viewMode === 'auto' && isMobile);

  // Current pages in view
  // In single page mode: currentPage
  // In double page spread:
  // - If currentPage === 1 (Cover): 1 single page centered (Portada frontal de 1 hoja)
  // - If currentPage > 1: 2 open pages (Left even page, Right odd page)
  // - If last page and odd: 1 single page (Contraportada)
  const isDualSpreadActive = !isSinglePageMode && currentPage > 1 && !(currentPage === totalPages && totalPages % 2 === 1);

  const getVisiblePages = useCallback(() => {
    if (isSinglePageMode || currentPage === 1) {
      return {
        leftPage: null,
        rightPage: portfolio.pages[currentPage - 1] || null,
        isCover: currentPage === 1,
        isBackCover: currentPage === totalPages,
      };
    }

    // Last page alone if totalPages is odd and we reach the final page
    if (currentPage >= totalPages && totalPages % 2 === 1) {
      return {
        leftPage: portfolio.pages[totalPages - 1] || null,
        rightPage: null,
        isCover: false,
        isBackCover: true,
      };
    }

    // Standard 2-page open spread: Left is even (e.g. 2), Right is odd (e.g. 3)
    const leftIndex = currentPage % 2 === 0 ? currentPage - 1 : currentPage - 2;
    const rightIndex = leftIndex + 1;

    return {
      leftPage: portfolio.pages[leftIndex] || null,
      rightPage: portfolio.pages[rightIndex] || null,
      isCover: false,
      isBackCover: rightIndex >= totalPages,
    };
  }, [currentPage, isSinglePageMode, portfolio.pages, totalPages]);

  // Sync page input and update URL hash for easy direct bookmarking & sharing
  useEffect(() => {
    setTargetPageInput(currentPage.toString());
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}#portfolio=${portfolio.id}&page=${currentPage}`
      );
    }
  }, [currentPage, portfolio.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (isZoomMode) setIsZoomMode(false);
        if (showThumbnails) setShowThumbnails(false);
        if (showSettingsMenu) setShowSettingsMenu(false);
        if (showShareModal) setShowShareModal(false);
        if (isPresenting) setIsPresenting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isSinglePageMode, totalPages, isZoomMode, showThumbnails, showSettingsMenu, isPresenting]);

  // Auto-flip slideshow presentation timer
  useEffect(() => {
    if (!isPresenting) return;

    const interval = setInterval(() => {
      if (currentPage >= totalPages) {
        setIsPresenting(false);
      } else {
        flipNext();
      }
    }, settings.autoFlipInterval * 1000);

    return () => clearInterval(interval);
  }, [isPresenting, currentPage, totalPages, settings.autoFlipInterval]);

  // Turn to next page with flip animation and sound
  const flipNext = useCallback(() => {
    if (isFlipping) return;
    // In dual spread: from page 1 (cover), go to page 2 (which shows 2 & 3 open). From page 2+, step by 2
    let nextPage: number;
    if (isSinglePageMode) {
      nextPage = Math.min(currentPage + 1, totalPages);
    } else if (currentPage === 1) {
      nextPage = Math.min(2, totalPages);
    } else {
      nextPage = Math.min(currentPage + 2, totalPages);
    }

    if (nextPage === currentPage) return;

    if (settings.soundEnabled) {
      playPageFlipSound(1.1);
    }

    setIsFlipping(true);
    setFlipDirection('next');
    setAnimatingPageNumber(currentPage);

    setTimeout(() => {
      setCurrentPage(nextPage);
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection(null);
        setAnimatingPageNumber(null);
      }, 320);
    }, 280);
  }, [currentPage, isFlipping, isSinglePageMode, totalPages, settings.soundEnabled]);

  // Turn to previous page with flip animation and sound
  const flipPrev = useCallback(() => {
    if (isFlipping) return;
    // In dual spread: from page 2 or 3, step back to page 1 (cover). From page 4+, step back by 2
    let prevPage: number;
    if (isSinglePageMode) {
      prevPage = Math.max(currentPage - 1, 1);
    } else if (currentPage <= 3) {
      prevPage = 1;
    } else {
      prevPage = Math.max(currentPage - 2, 1);
    }

    if (prevPage === currentPage) return;

    if (settings.soundEnabled) {
      playPageFlipSound(1.0);
    }

    setIsFlipping(true);
    setFlipDirection('prev');
    setAnimatingPageNumber(currentPage);

    setTimeout(() => {
      setCurrentPage(prevPage);
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection(null);
        setAnimatingPageNumber(null);
      }, 320);
    }, 280);
  }, [currentPage, isFlipping, isSinglePageMode, settings.soundEnabled]);

  // Direct page navigation
  const goToPage = useCallback((pageNum: number) => {
    const validPage = Math.max(1, Math.min(pageNum, totalPages));
    if (validPage === currentPage) return;

    if (settings.soundEnabled) {
      playPageFlipSound(1.3);
    }

    setIsFlipping(true);
    setFlipDirection(validPage > currentPage ? 'next' : 'prev');
    
    setTimeout(() => {
      setCurrentPage(validPage);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 300);
  }, [currentPage, totalPages, settings.soundEnabled]);

  // Touch Swipe for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomMode) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isZoomMode) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const timeElapsed = Date.now() - touchStartRef.current.time;

    // Detect horizontal swipe (at least 45px, more horizontal than vertical, under 500ms)
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && timeElapsed < 500) {
      if (diffX < 0) {
        flipNext(); // Swiped left -> next page
      } else {
        flipPrev(); // Swiped right -> prev page
      }
    }
    touchStartRef.current = null;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Zoom / Pan handlers
  const handleZoomToggle = () => {
    setIsZoomMode((prev) => {
      const nextState = !prev;
      if (!nextState) {
        setPanOffset({ x: 0, y: 0 });
      }
      return nextState;
    });
  };

  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (!isZoomMode) return;
    setIsDraggingPan(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan || !isZoomMode) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePanMouseUp = () => {
    setIsDraggingPan(false);
  };

  // Copy share link
  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.hash = `portfolio=${portfolio.id}&page=${currentPage}`;
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Download page as HD image
  const handleDownloadCurrentPage = () => {
    const activePage = portfolio.pages[currentPage - 1];
    if (!activePage) return;
    const a = document.createElement('a');
    a.href = activePage.dataUrl;
    a.download = `${portfolio.title.replace(/\s+/g, '_')}_Pagina_${currentPage}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Background Theme Styles
  const getThemeClasses = (theme: BookBackgroundTheme): string => {
    switch (theme) {
      case 'studio-dark':
        return 'bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950 text-white';
      case 'minimal-light':
        return 'bg-gradient-to-br from-stone-100 via-zinc-100 to-slate-200 text-zinc-900';
      case 'wood-desk':
        return 'bg-[#211713] bg-[radial-gradient(#3a261c_1px,transparent_1px)] [background-size:16px_16px] text-amber-50';
      case 'midnight-navy':
        return 'bg-gradient-to-br from-slate-950 via-sky-950 to-neutral-950 text-slate-100';
      case 'paper-warm':
        return 'bg-[#f4efe6] text-stone-900';
      default:
        return 'bg-neutral-950 text-white';
    }
  };

  const visible = getVisiblePages();

  return (
    <div
      ref={containerRef}
      id="folioflip-viewer-root"
      className={`relative w-full h-screen overflow-hidden select-none flex flex-col justify-between transition-colors duration-500 ${getThemeClasses(
        settings.backgroundTheme
      )}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handlePanMouseDown}
      onMouseMove={handlePanMouseMove}
      onMouseUp={handlePanMouseUp}
    >
      {/* Top Floating Glass Navigation Header */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 backdrop-blur-md bg-black/25 border-b border-white/10 transition-all">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="viewer-back-btn"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all backdrop-blur active:scale-95 text-white"
            title="Volver a la galería"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate tracking-tight text-white flex items-center gap-2">
              <span>{portfolio.title}</span>
              {portfolio.isSample && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Muestra HD
                </span>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-white/60 truncate">
              {portfolio.author} • {portfolio.totalPages} páginas • {portfolio.fileSizeFormatted}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            id="viewer-sound-toggle"
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className={`p-2 rounded-lg transition-all ${
              settings.soundEnabled
                ? 'bg-white/15 text-emerald-300 hover:bg-white/25'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
            title={settings.soundEnabled ? 'Sonido de página activado' : 'Sonido desactivado'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Presentation Mode */}
          <button
            id="viewer-present-btn"
            onClick={() => setIsPresenting(!isPresenting)}
            className={`p-2 rounded-lg transition-all ${
              isPresenting
                ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20 animate-pulse'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isPresenting ? 'Pausar auto-lectura' : 'Modo Presentación automática'}
          >
            {isPresenting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Zoom Toggle */}
          <button
            id="viewer-zoom-btn"
            onClick={handleZoomToggle}
            className={`p-2 rounded-lg transition-all ${
              isZoomMode
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isZoomMode ? 'Salir del modo lupa HD' : 'Inspeccionar en Ultra Zoom'}
          >
            {isZoomMode ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {/* Thumbnails Drawer Toggle */}
          <button
            id="viewer-thumbnails-btn"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-2 rounded-lg transition-all ${
              showThumbnails
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Ver cuadrícula de páginas"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Settings / Environment */}
          <button
            id="viewer-settings-btn"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Personalizar ambiente y visualización"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Share */}
          <button
            id="viewer-share-btn"
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Compartir portafolio interactivo"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            id="viewer-fullscreen-btn"
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main 3D FlipBook Stage Area */}
      <main
        className={`relative flex-1 w-full flex items-center justify-center p-2 sm:p-6 lg:p-10 overflow-hidden ${
          isZoomMode ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={{
          perspective: '2500px',
        }}
      >
        {/* Previous / Next Side Floating Nav Buttons */}
        {!isZoomMode && (
          <>
            <button
              id="flip-prev-button"
              onClick={flipPrev}
              disabled={currentPage <= 1 || isFlipping}
              className={`absolute left-2 sm:left-6 z-20 p-3 sm:p-4 rounded-full backdrop-blur-xl border border-white/15 bg-black/40 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none ${
                currentPage <= 1 ? 'opacity-0' : 'opacity-80 hover:opacity-100'
              }`}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
            </button>

            <button
              id="flip-next-button"
              onClick={flipNext}
              disabled={currentPage >= totalPages || isFlipping}
              className={`absolute right-2 sm:right-6 z-20 p-3 sm:p-4 rounded-full backdrop-blur-xl border border-white/15 bg-black/40 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none ${
                currentPage >= totalPages ? 'opacity-0' : 'opacity-80 hover:opacity-100'
              }`}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
            </button>
          </>
        )}

        {/* 3D Realistic Book Container */}
        <div
          id="flipbook-book-assembly"
          className="relative max-w-full max-h-full transition-transform duration-300 flex items-center justify-center"
          style={{
            transform: isZoomMode
              ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
              : 'scale(1)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Ambient Ground Soft Shadow underneath the book */}
          <div
            className="absolute -bottom-8 sm:-bottom-12 w-[90%] h-12 rounded-full blur-2xl pointer-events-none transition-opacity duration-500"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 75%)',
              opacity: settings.pageShadowIntensity,
            }}
          />

          {/* Book Spreads Assembly */}
          <div
            className={`relative flex items-center justify-center rounded-lg transition-all duration-500 ${
              !isDualSpreadActive
                ? 'w-[min(90vw,540px)] h-[min(76vh,780px)]'
                : 'w-[min(96vw,1100px)] h-[min(76vh,780px)]'
            }`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* SINGLE PAGE VIEW (Mobile / Cover / Back Cover / Single Page Mode) */}
            {!isDualSpreadActive ? (
              <div
                className="relative w-full h-full rounded-lg overflow-hidden bg-white shadow-2xl border border-black/10 flex items-center justify-center transition-all duration-500"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Page Content */}
                {visible.rightPage ? (
                  <img
                    src={visible.rightPage.dataUrl}
                    alt={`Página ${visible.rightPage.pageNumber}`}
                    className="w-full h-full object-contain bg-white"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                    Página no disponible
                  </div>
                )}

                {/* Subtle Right Edge Page Stack Lines Effect */}
                <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-black/15 via-black/5 to-transparent pointer-events-none" />
                {currentPage === 1 && (
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 via-black/5 to-transparent pointer-events-none" />
                )}

                {/* Page number badge */}
                {settings.showPageNumbers && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white pointer-events-none">
                    {currentPage === 1 ? 'Portada (1)' : `${currentPage} / ${totalPages}`}
                  </div>
                )}

                {/* Interactive Corner Curl Hover Trigger */}
                {currentPage < totalPages && !isZoomMode && (
                  <div
                    onClick={flipNext}
                    className="group absolute bottom-0 right-0 w-16 h-16 cursor-pointer z-10 overflow-hidden"
                    title="Clic para abrir el libro"
                  >
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-b-[24px] border-l-[24px] border-b-amber-500/80 border-l-transparent group-hover:border-b-[36px] group-hover:border-l-[36px] transition-all shadow-md" />
                  </div>
                )}
                {currentPage > 1 && !isZoomMode && (
                  <div
                    onClick={flipPrev}
                    className="group absolute bottom-0 left-0 w-16 h-16 cursor-pointer z-10 overflow-hidden"
                    title="Clic para volver a la portada"
                  >
                    <div className="absolute bottom-0 left-0 w-0 h-0 border-solid border-b-[24px] border-r-[24px] border-b-amber-500/80 border-r-transparent group-hover:border-b-[36px] group-hover:border-r-[36px] transition-all shadow-md" />
                  </div>
                )}
              </div>
            ) : (
              /* DUAL SPREAD VIEW (2 Hojas Abiertas con Línea Tenue al Medio) */
              <div
                className="relative w-full h-full flex rounded-lg overflow-hidden bg-white border border-black/15 shadow-2xl transition-all duration-500"
                style={{
                  boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* LEFT PAGE CONTAINER */}
                <div
                  className="relative w-1/2 h-full bg-white overflow-hidden flex items-center justify-center origin-right"
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {visible.leftPage ? (
                    <>
                      <img
                        src={visible.leftPage.dataUrl}
                        alt={`Página ${visible.leftPage.pageNumber}`}
                        className="w-full h-full object-contain bg-white"
                        draggable={false}
                      />
                      {/* Left Page Spine Soft Shading */}
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/10 via-black/3 to-transparent pointer-events-none" />
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />

                      {settings.showPageNumbers && (
                        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[10px] font-medium text-white/90 pointer-events-none">
                          {visible.leftPage.pageNumber}
                        </div>
                      )}

                      {/* Left corner curl */}
                      <div
                        onClick={flipPrev}
                        className="group absolute bottom-0 left-0 w-14 h-14 cursor-pointer z-10 overflow-hidden"
                        title="Retroceder página"
                      >
                        <div className="absolute bottom-0 left-0 w-0 h-0 border-solid border-b-[20px] border-r-[20px] border-b-amber-600/70 border-r-transparent group-hover:border-b-[30px] group-hover:border-r-[30px] transition-all" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 p-8 text-center">
                      <BookOpen className="w-10 h-10 mb-2 text-stone-300" />
                      <span className="text-xs text-stone-400 font-medium">
                        {portfolio.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* CENTER BOOK SPINE: Línea tenue central en la mitad del libro */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 z-20 pointer-events-none bg-black/15 shadow-[0_0_8px_rgba(0,0,0,0.12)]">
                  {/* Subtle soft gradient fade around the spine line */}
                  <div className="absolute -left-3 -right-3 top-0 bottom-0 pointer-events-none bg-gradient-to-r from-transparent via-black/8 to-transparent" />
                </div>

                {/* RIGHT PAGE CONTAINER */}
                <div
                  className="relative w-1/2 h-full bg-white overflow-hidden flex items-center justify-center origin-left"
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {visible.rightPage ? (
                    <>
                      <img
                        src={visible.rightPage.dataUrl}
                        alt={`Página ${visible.rightPage.pageNumber}`}
                        className="w-full h-full object-contain bg-white"
                        draggable={false}
                      />
                      {/* Right Page Spine Soft Shading */}
                      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/10 via-black/3 to-transparent pointer-events-none" />
                      <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />

                      {settings.showPageNumbers && (
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[10px] font-medium text-white/90 pointer-events-none">
                          {visible.rightPage.pageNumber}
                        </div>
                      )}

                      {/* Right corner curl */}
                      {currentPage < totalPages && (
                        <div
                          onClick={flipNext}
                          className="group absolute bottom-0 right-0 w-14 h-14 cursor-pointer z-10 overflow-hidden"
                          title="Avanzar página"
                        >
                          <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-b-[20px] border-l-[20px] border-b-amber-600/70 border-l-transparent group-hover:border-b-[30px] group-hover:border-l-[30px] transition-all" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 p-8 text-center">
                      <Sparkles className="w-10 h-10 mb-2 text-stone-300" />
                      <span className="text-xs text-stone-400 font-medium">Fin del Portafolio</span>
                    </div>
                  )}
                </div>

                {/* 3D Dynamic Turning Page Sheet during Flip Animation */}
                <AnimatePresence>
                  {isFlipping && (
                    <motion.div
                      key={`flip-anim-${animatingPageNumber}-${flipDirection}`}
                      initial={{
                        rotateY: flipDirection === 'next' ? 0 : -180,
                        transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                      }}
                      animate={{
                        rotateY: flipDirection === 'next' ? -180 : 0,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
                      className={`absolute top-0 bottom-0 w-1/2 z-30 overflow-hidden bg-white shadow-2xl pointer-events-none ${
                        flipDirection === 'next' ? 'left-1/2' : 'left-0'
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      {/* Active animating page preview */}
                      {portfolio.pages[currentPage - 1] && (
                        <img
                          src={portfolio.pages[currentPage - 1].dataUrl}
                          alt="Volteando"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {/* Realistic dynamic light sheen / bend shadow across bending sheet */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/20 pointer-events-none" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Floating Control Bar */}
      <footer className="relative z-30 px-3 sm:px-6 py-3 backdrop-blur-md bg-black/30 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick Page Jump & Fast Progress Slider */}
          <div className="w-full sm:w-auto flex items-center gap-3 justify-between sm:justify-start">
            {/* First Page */}
            <button
              id="jump-first-page-btn"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
              title="Ir a la primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Slider */}
            <div className="flex items-center gap-2 flex-1 sm:w-56">
              <input
                id="page-scrub-slider"
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Last Page */}
            <button
              id="jump-last-page-btn"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
              title="Ir a la última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            {/* Direct Page Input Number */}
            <div className="flex items-center gap-1 text-xs text-white/80 bg-white/10 px-2 py-1 rounded-md border border-white/10">
              <span className="text-[11px] text-white/50">Pág.</span>
              <input
                id="direct-page-input"
                type="number"
                min={1}
                max={totalPages}
                value={targetPageInput}
                onChange={(e) => setTargetPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    goToPage(parseInt(targetPageInput, 10) || 1);
                  }
                }}
                onBlur={() => goToPage(parseInt(targetPageInput, 10) || currentPage)}
                className="w-10 bg-transparent text-center font-bold text-amber-300 focus:outline-none"
              />
              <span className="text-white/50">/ {totalPages}</span>
            </div>
          </div>

          {/* Center Mode / Features */}
          <div className="flex items-center gap-2 text-xs">
            {/* View Mode Toggle (Single vs Double Spread) */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10">
              <button
                id="mode-auto-btn"
                onClick={() => setSettings((s) => ({ ...s, viewMode: 'auto' }))}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium ${
                  settings.viewMode === 'auto'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-white/70 hover:text-white'
                }`}
                title="Modo Adaptable automático"
              >
                Auto
              </button>
              <button
                id="mode-double-btn"
                onClick={() => setSettings((s) => ({ ...s, viewMode: 'double' }))}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium ${
                  settings.viewMode === 'double'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-white/70 hover:text-white'
                }`}
                title="Doble Página (Libro abierto)"
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                Doble
              </button>
              <button
                id="mode-single-btn"
                onClick={() => setSettings((s) => ({ ...s, viewMode: 'single' }))}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium ${
                  settings.viewMode === 'single'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-white/70 hover:text-white'
                }`}
                title="Página Simple"
              >
                <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                Simple
              </button>
            </div>
          </div>

          {/* Right Export / Save options */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              id="export-page-image-btn"
              onClick={handleDownloadCurrentPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition active:scale-95"
              title="Guardar página actual como imagen HD"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Pág.</span>
            </button>
            {onUploadNew && (
              <button
                id="viewer-upload-new-btn"
                onClick={onUploadNew}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Subir Portafolio</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* THUMBNAILS GRID DRAWER */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-x-0 bottom-16 z-40 max-h-72 bg-neutral-950/95 backdrop-blur-2xl border-t border-white/15 p-4 shadow-2xl overflow-y-auto"
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-amber-400" />
                  Miniaturas del Portafolio ({totalPages} páginas)
                </span>
                <button
                  id="close-thumbnails-btn"
                  onClick={() => setShowThumbnails(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 pb-2">
                {portfolio.pages.map((page) => (
                  <button
                    key={`thumb-${page.pageNumber}`}
                    id={`thumb-btn-${page.pageNumber}`}
                    onClick={() => {
                      goToPage(page.pageNumber);
                      setShowThumbnails(false);
                    }}
                    className={`group relative rounded-md overflow-hidden aspect-[3/4] border-2 transition-all duration-200 bg-stone-900 ${
                      currentPage === page.pageNumber
                        ? 'border-amber-400 scale-105 shadow-lg shadow-amber-500/20'
                        : 'border-transparent hover:border-white/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={page.thumbnailUrl || page.dataUrl}
                      alt={`Página ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-xs py-0.5 text-center text-[10px] font-bold text-white group-hover:bg-amber-600">
                      {page.pageNumber}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS / THEME ENVIRONMENT MODAL */}
      <AnimatePresence>
        {showSettingsMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-2xl p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Ajustes de Lectura & Ambiente
                </h3>
                <button
                  id="close-settings-modal-btn"
                  onClick={() => setShowSettingsMenu(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 pt-4">
                {/* Background Environment Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                    Mesa de Lectura / Entorno
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'studio-dark', name: 'Estudio Grafito', color: '#18181b' },
                      { id: 'minimal-light', name: 'Minimalista Claro', color: '#f4f4f5' },
                      { id: 'wood-desk', name: 'Madera Roble', color: '#291b12' },
                      { id: 'midnight-navy', name: 'Azul Medianoche', color: '#082f49' },
                      { id: 'paper-warm', name: 'Papel Cálido', color: '#f4efe6' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        id={`theme-btn-${theme.id}`}
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            backgroundTheme: theme.id as BookBackgroundTheme,
                          }))
                        }
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                          settings.backgroundTheme === theme.id
                            ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                            : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span className="truncate">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto flip speed slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                    <span>Velocidad Auto-Presentación</span>
                    <span className="text-amber-400">{settings.autoFlipInterval} segundos</span>
                  </div>
                  <input
                    id="setting-autoflip-speed"
                    type="range"
                    min={2}
                    max={15}
                    value={settings.autoFlipInterval}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        autoFlipInterval: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-medium text-white/90">Efecto de sonido de papel realista</span>
                    <input
                      id="setting-sound-toggle-checkbox"
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => setSettings((s) => ({ ...s, soundEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-medium text-white/90">Mostrar números de página flotantes</span>
                    <input
                      id="setting-page-numbers-checkbox"
                      type="checkbox"
                      checked={settings.showPageNumbers}
                      onChange={(e) => setSettings((s) => ({ ...s, showPageNumbers: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <button
                  id="confirm-settings-btn"
                  onClick={() => setShowSettingsMenu(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-2xl p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-400" />
                  Compartir Portafolio
                </h3>
                <button
                  id="close-share-modal-btn"
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-xs text-white/70">
                  Comparte este enlace para que cualquier persona pueda abrir este portafolio en modo libro
                  interactivo 3D iniciando en la <strong className="text-amber-300">Página {currentPage}</strong>.
                </p>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/15">
                  <input
                    id="share-link-input"
                    type="text"
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}#portfolio=${portfolio.id}&page=${currentPage}`}
                    className="w-full bg-transparent text-xs text-white/90 focus:outline-none truncate"
                  />
                  <button
                    id="copy-share-link-btn"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg shrink-0 transition"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <span>Copiar</span>
                    )}
                  </button>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-2 font-semibold">
                    Acceso Rápido
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      id="share-whatsapp-btn"
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Mira mi portafolio interactivo "${portfolio.title}" en formato libro 3D: ${window.location.href}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                    >
                      <span>WhatsApp</span>
                    </a>
                    <a
                      id="share-email-btn"
                      href={`mailto:?subject=${encodeURIComponent(
                        `Portafolio Interactivo: ${portfolio.title}`
                      )}&body=${encodeURIComponent(
                        `Hola,\n\nTe invito a explorar mi portafolio interactivo en formato libro:\n${window.location.href}\n\nSaludos.`
                      )}`}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition"
                    >
                      <span>Correo Electrónico</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
