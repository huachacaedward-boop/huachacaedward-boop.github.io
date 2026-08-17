import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Sparkles,
  Image as ImageIcon,
  Scan,
  Crosshair,
  ExternalLink
} from 'lucide-react';
import { PortfolioMeta, PortfolioPage, ViewerSettings, BookBackgroundTheme, ExtractedImage } from '../types';
import { playPageFlipSound } from '../services/soundService';
import { extractImageAtPoint } from '../services/imageDetector';
import { DeviceInfo } from '../services/deviceDetector';

interface FlipBookViewerProps {
  portfolio: PortfolioMeta;
  initialPage?: number;
  isAdmin?: boolean;
  deviceInfo?: DeviceInfo;
  onBack: () => void;
  onUploadNew?: () => void;
}

export const FlipBookViewer: React.FC<FlipBookViewerProps> = ({
  portfolio,
  initialPage = 1,
  isAdmin = true,
  deviceInfo,
  onBack,
  onUploadNew,
}) => {
  // Page index state (1-indexed)
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash);
      const p = parseInt(searchParams.get('page') || hashParams.get('page') || '', 10);
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
    backgroundTheme: 'abstract-arch',
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
  const [showImagePreviewModal, setShowImagePreviewModal] = useState<boolean>(false);
  const [selectedExtractedImage, setSelectedExtractedImage] = useState<ExtractedImage | null>(null);
  const [showImageHotspots, setShowImageHotspots] = useState<boolean>(true);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [showAllPhotosGallery, setShowAllPhotosGallery] = useState<boolean>(false);
  const [showFirstTimeHint, setShowFirstTimeHint] = useState<boolean>(true);
  const [previewZoomLevel, setPreviewZoomLevel] = useState<number>(1);
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
  const stageRef = useRef<HTMLElement>(null);

  // Dynamic viewport stage dimensions
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? Math.max(400, window.innerHeight - 130) : 700,
  });

  // Track stage container size with ResizeObserver
  useEffect(() => {
    const updateDimensions = () => {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setStageSize({ width: rect.width, height: rect.height });
        }
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (stageRef.current) {
      ro.observe(stageRef.current);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

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

  // Determine effective view mode (Default is 1 page at a time as requested)
  const isSinglePageMode = settings.viewMode !== 'double';

  // Calculate the precise native aspect ratio of the active PDF page(s)
  const pageAspect = useMemo(() => {
    const activePageData = portfolio.pages[currentPage - 1] || portfolio.pages[0];
    if (activePageData?.aspectRatio && !isNaN(activePageData.aspectRatio) && activePageData.aspectRatio > 0) {
      return activePageData.aspectRatio;
    }
    if (activePageData?.width && activePageData?.height && activePageData.height > 0) {
      return activePageData.width / activePageData.height;
    }
    return 1 / 1.414; // Default A4 portrait
  }, [portfolio.pages, currentPage]);

  // Compute adaptive responsive dimensions so the book fits any PDF shape (Landscape, Portrait, Square, Custom)
  const bookDimensions = useMemo(() => {
    const isSmallScreen = stageSize.width < 640;
    // Leave safe margins for floating left/right navigation arrows, header, and footer toolbar
    const paddingX = isSmallScreen ? 20 : (stageSize.width < 1024 ? 60 : 96);
    const paddingY = isSmallScreen ? 20 : 36;

    const maxAvailW = Math.max(260, stageSize.width - paddingX);
    const maxAvailH = Math.max(260, stageSize.height - paddingY);

    let computedWidth: number;
    let computedHeight: number;

    if (maxAvailW / maxAvailH > pageAspect) {
      // Height is the limiting constraint
      computedHeight = maxAvailH;
      computedWidth = maxAvailH * pageAspect;
    } else {
      // Width is the limiting constraint
      computedWidth = maxAvailW;
      computedHeight = maxAvailW / pageAspect;
    }

    return {
      width: Math.round(computedWidth),
      height: Math.round(computedHeight),
      singleWidth: Math.round(computedWidth),
    };
  }, [stageSize.width, stageSize.height, pageAspect]);

  const getVisiblePages = useCallback(() => {
    return {
      leftPage: null,
      rightPage: portfolio.pages[currentPage - 1] || null,
      isCover: currentPage === 1,
      isBackCover: currentPage === totalPages,
    };
  }, [currentPage, portfolio.pages, totalPages]);

  // All extracted images across the entire portfolio for global photo gallery browsing
  const allPortfolioImages = useMemo(() => {
    const list: ExtractedImage[] = [];
    portfolio.pages.forEach((page) => {
      if (page.extractedImages && page.extractedImages.length > 0) {
        list.push(...page.extractedImages);
      }
    });
    return list;
  }, [portfolio.pages]);

  // Detected individual images on the current active page
  const currentPageExtractedImages = useMemo(() => {
    const p = portfolio.pages[currentPage - 1];
    return p?.extractedImages || [];
  }, [portfolio.pages, currentPage]);

  const openExtractedImage = useCallback((img: ExtractedImage) => {
    setSelectedExtractedImage(img);
    setPreviewZoomLevel(1);
    setShowImagePreviewModal(true);
  }, []);

  const nextExtractedImage = useCallback(() => {
    if (!selectedExtractedImage || allPortfolioImages.length === 0) return;
    const currIdx = allPortfolioImages.findIndex((i) => i.id === selectedExtractedImage.id);
    if (currIdx < allPortfolioImages.length - 1) {
      const nextImg = allPortfolioImages[currIdx + 1];
      setSelectedExtractedImage(nextImg);
      if (nextImg.pageNumber !== currentPage) {
        setCurrentPage(nextImg.pageNumber);
      }
      setPreviewZoomLevel(1);
    }
  }, [selectedExtractedImage, allPortfolioImages, currentPage]);

  const prevExtractedImage = useCallback(() => {
    if (!selectedExtractedImage || allPortfolioImages.length === 0) return;
    const currIdx = allPortfolioImages.findIndex((i) => i.id === selectedExtractedImage.id);
    if (currIdx > 0) {
      const prevImg = allPortfolioImages[currIdx - 1];
      setSelectedExtractedImage(prevImg);
      if (prevImg.pageNumber !== currentPage) {
        setCurrentPage(prevImg.pageNumber);
      }
      setPreviewZoomLevel(1);
    }
  }, [selectedExtractedImage, allPortfolioImages, currentPage]);

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
        if (showImagePreviewModal) {
          setShowImagePreviewModal(false);
          setSelectedExtractedImage(null);
        }
        if (showAllPhotosGallery) setShowAllPhotosGallery(false);
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
    const nextPage = Math.min(currentPage + 1, totalPages);
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
      }, 340);
    }, 260);
  }, [currentPage, isFlipping, totalPages, settings.soundEnabled]);

  // Turn to previous page with flip animation and sound
  const flipPrev = useCallback(() => {
    if (isFlipping) return;
    const prevPage = Math.max(currentPage - 1, 1);
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
      }, 340);
    }, 260);
  }, [currentPage, isFlipping, settings.soundEnabled]);

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

  // Copy share link (Generates direct client presentation mode link)
  const clientPresentationUrl = `${window.location.origin}${window.location.pathname}#portfolio=${portfolio.id}&page=${currentPage}&mode=client`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientPresentationUrl).then(() => {
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

  // Architectural Background Theme Styles
  const getThemeClasses = (theme: BookBackgroundTheme): string => {
    switch (theme) {
      case 'abstract-arch':
        return 'bg-[#090b0e] text-stone-100';
      case 'studio-dark':
        return 'bg-arch-studio-dark text-stone-100';
      case 'blueprint-cad':
        return 'bg-arch-blueprint text-sky-100';
      case 'concrete-arch':
        return 'bg-arch-concrete text-stone-100';
      case 'wood-desk':
        return 'bg-arch-wood text-amber-50';
      case 'paper-warm':
        return 'bg-arch-gallery text-stone-900';
      case 'minimal-light':
        return 'bg-arch-gallery text-stone-900';
      case 'midnight-navy':
        return 'bg-arch-blueprint text-sky-100';
      default:
        return 'bg-[#090b0e] text-stone-100';
    }
  };

  const visible = getVisiblePages();

  return (
    <div
      ref={containerRef}
      id="folioflip-viewer-root"
      className={`relative w-full h-screen overflow-hidden select-none flex flex-col justify-between transition-colors duration-500 font-sans ${getThemeClasses(
        settings.backgroundTheme
      )}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handlePanMouseDown}
      onMouseMove={handlePanMouseMove}
      onMouseUp={handlePanMouseUp}
    >
      {/* Abstract Architectural Background Image Backdrop */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <img
          src={
            settings.backgroundTheme === 'blueprint-cad'
              ? '/src/assets/images/arch_blueprint_bg_1786924052785.jpg'
              : '/src/assets/images/arch_abstract_bg_1786924042508.jpg'
          }
          alt="Atmósfera Arquitectónica Abstracta"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center transition-all duration-1000 ${
            settings.backgroundTheme === 'abstract-arch'
              ? 'opacity-35 scale-105 filter contrast-125 brightness-80'
              : settings.backgroundTheme === 'studio-dark'
              ? 'opacity-20 scale-100 filter contrast-110 brightness-70'
              : settings.backgroundTheme === 'blueprint-cad'
              ? 'opacity-30 scale-105 filter hue-rotate-15 contrast-125 brightness-90 mix-blend-screen'
              : settings.backgroundTheme === 'concrete-arch'
              ? 'opacity-15 scale-100 filter grayscale contrast-150'
              : settings.backgroundTheme === 'paper-warm' || settings.backgroundTheme === 'minimal-light'
              ? 'opacity-10 scale-100 filter invert brightness-95'
              : 'opacity-15 scale-100'
          }`}
        />
        {/* Subtle architectural vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70 pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/30 to-black/80 pointer-events-none" />
      </div>

      {/* Subtle Architectural Drafting Ambient Rulers & Crosshairs */}
      <div className="absolute inset-0 pointer-events-none z-5 select-none overflow-hidden opacity-35">
        <div className="absolute top-16 left-6 font-mono-tech text-[10px] text-amber-200/70 tracking-widest uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>ARCH/STUDIO 01 • PROJ: {portfolio.id.slice(0, 8)}</span>
        </div>
        <div className="absolute top-16 right-6 font-mono-tech text-[10px] text-white/60 tracking-widest uppercase">
          SCALE: 1:1 • ULTRA HD 3D
        </div>
        <div className="absolute bottom-20 left-6 font-mono-tech text-[10px] text-white/40 tracking-widest uppercase hidden md:block">
          GRID: 120mm CAD • PARAMETRIC ENGINE
        </div>
        <div className="absolute bottom-20 right-6 font-mono-tech text-[10px] text-white/40 tracking-widest uppercase hidden md:block">
          DOC: {portfolio.totalPages} PGS • {portfolio.category.toUpperCase()}
        </div>
      </div>

      {/* Top Floating Glass Navigation Header */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 backdrop-blur-md bg-black/35 border-b border-white/10 transition-all font-sans">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="viewer-back-btn"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all backdrop-blur active:scale-95 text-white font-arch tracking-wider uppercase"
            title="Volver a la galería"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate tracking-tight text-white flex items-center gap-2 font-arch">
              <span>{portfolio.title}</span>
              {portfolio.isSample && (
                <span className="text-[9px] font-mono-tech tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Muestra HD
                </span>
              )}
            </h1>
            <p className="text-[11px] text-white/60 truncate font-mono-tech">
              {portfolio.author} • {portfolio.totalPages} págs • {portfolio.fileSizeFormatted}
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
        ref={stageRef}
        className={`relative flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none ${
          isZoomMode ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={{
          perspective: '2500px',
        }}
      >
        {/* Onboarding Interactive Tip Notification (Dismissible) */}
        <AnimatePresence>
          {showFirstTimeHint && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-amber-400/40 text-white shadow-2xl shadow-black/80 max-w-[92vw] sm:max-w-md"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Maximize2 className="w-4 h-4 animate-bounce" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-300">¡Portafolio Interactivo!</div>
                <div className="text-[11px] text-stone-300">
                  Haz clic directamente sobre cualquier <strong>fotografía, plano o render</strong> para verla aislada en pantalla completa con zoom HD.
                </div>
              </div>
              <button
                onClick={() => setShowFirstTimeHint(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 shrink-0 transition"
                title="Entendido"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Previous / Next Side Floating Nav Buttons */}
        {!isZoomMode && (
          <>
            <button
              id="flip-prev-button"
              onClick={flipPrev}
              disabled={currentPage <= 1 || isFlipping}
              className={`absolute left-2 sm:left-6 z-20 p-3 sm:p-4 rounded-full backdrop-blur-xl border border-white/15 bg-black/40 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer ${
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
              className={`absolute right-2 sm:right-6 z-20 p-3 sm:p-4 rounded-full backdrop-blur-xl border border-white/15 bg-black/40 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer ${
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
            className="absolute -bottom-6 sm:-bottom-8 w-[92%] h-10 rounded-full blur-xl pointer-events-none transition-opacity duration-500"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 75%)',
              opacity: settings.pageShadowIntensity,
            }}
          />

          {/* Book Sheet Assembly - Single Sheet View with Real 3D Book Page-Turning Curl */}
          <div
            className="relative flex items-center justify-center rounded-lg transition-all duration-300"
            style={{
              width: `${bookDimensions.width}px`,
              height: `${bookDimensions.height}px`,
              perspective: '1400px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Floating Page Photos Detector & Interactive Hint Banner */}
            {currentPageExtractedImages.length > 0 && !isZoomMode && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-950/95 backdrop-blur-md border border-amber-400/50 text-white text-xs shadow-2xl shadow-black/60 pointer-events-auto">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentPageExtractedImages.length} {currentPageExtractedImages.length === 1 ? 'foto interactiva' : 'fotos interactivas'}</span>
                </span>
                <span className="text-white/30">•</span>
                <span className="text-stone-300 font-medium text-[11px] hidden sm:inline">
                  Toca o haz clic en cualquier imagen para verla en pantalla completa
                </span>
                <button
                  id="toggle-photos-drawer-btn"
                  onClick={() => setShowAllPhotosGallery(true)}
                  className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Ver todas</span>
                </button>
              </div>
            )}

            <div
              className="relative w-full h-full rounded-lg overflow-hidden bg-white shadow-2xl border border-black/10 flex items-center justify-center transition-all duration-300"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Active Current Page Image with Multi-Photo Scanner Hotspots */}
              {portfolio.pages[currentPage - 1] ? (
                <div
                  className="relative w-full h-full group/page flex items-center justify-center overflow-hidden bg-white cursor-pointer select-none"
                  onClick={(e) => {
                    if (isFlipping || isZoomMode) return;

                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

                    // 1. Check if click is inside any pre-detected image hotspot
                    const matchingHotspot = currentPageExtractedImages.find(
                      (img) =>
                        clickX >= img.xPercent &&
                        clickX <= img.xPercent + img.widthPercent &&
                        clickY >= img.yPercent &&
                        clickY <= img.yPercent + img.heightPercent
                    );

                    if (matchingHotspot) {
                      openExtractedImage(matchingHotspot);
                      return;
                    }

                    // 2. Perform instant dynamic point extraction from the rendered image
                    const imgEl = e.currentTarget.querySelector('img');
                    if (imgEl) {
                      const extracted = extractImageAtPoint(imgEl, clickX, clickY, currentPage);
                      if (extracted) {
                        openExtractedImage(extracted);
                        return;
                      }
                    }

                    // If clicked on empty/white space or margins, do NOT open the full page (only individual images are enlarged)
                  }}
                  title="Haz clic en cualquier fotografía o render para verla sola en pantalla completa"
                >
                  <img
                    src={portfolio.pages[currentPage - 1].dataUrl}
                    alt={`Página ${currentPage}`}
                    className="w-full h-full object-fill bg-white block transition-transform duration-300"
                    draggable={false}
                  />

                  {/* SMART PHOTO SCANNER HOTSPOTS (Clickable Individual Photos inside the PDF sheet) */}
                  {showImageHotspots && currentPageExtractedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      style={{
                        left: `${img.xPercent}%`,
                        top: `${img.yPercent}%`,
                        width: `${img.widthPercent}%`,
                        height: `${img.heightPercent}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openExtractedImage(img);
                      }}
                      onMouseEnter={() => setHoveredHotspotId(img.id)}
                      onMouseLeave={() => setHoveredHotspotId(null)}
                      className={`group/hotspot absolute z-15 rounded-md cursor-pointer transition-all duration-300 ${
                        hoveredHotspotId === img.id
                          ? 'ring-2 ring-amber-400 bg-amber-500/20 shadow-2xl shadow-amber-500/40'
                          : 'hover:ring-2 hover:ring-amber-400/90 hover:bg-amber-400/10'
                      }`}
                      title={`Clic para ver "${img.title || `Foto ${idx + 1}`}" sola en pantalla completa`}
                    >
                      {/* Interactive Visual Lens & CTA in Center on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hotspot:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950/95 backdrop-blur-md text-amber-300 text-xs font-bold shadow-2xl border border-amber-400/50 transform scale-95 group-hover/hotspot:scale-100 transition-transform">
                          <Maximize2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span>Clic para ampliar foto</span>
                        </div>
                      </div>

                      {/* Always Visible Discrete Corner Enlarge Badge (Signals interactivity to the visitor) */}
                      <div className="absolute top-2 right-2 p-1 rounded-md bg-neutral-950/75 backdrop-blur-sm text-amber-300 border border-white/20 shadow-md opacity-70 group-hover/hotspot:opacity-100 group-hover/hotspot:scale-110 transition-all pointer-events-none">
                        <Maximize2 className="w-3 h-3" />
                      </div>

                      {/* Bottom-Left Photo Label Pill on Hover */}
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover/hotspot:opacity-100 transition-opacity duration-200 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white/90 border border-white/10 pointer-events-none flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>{img.title || `Foto ${idx + 1}`}</span>
                      </div>
                    </div>
                  ))}

                  {/* Subtle Hover Page Hint if no hotspot hovered */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover/page:opacity-100 transition-all duration-200 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow-lg border border-white/20 pointer-events-none">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Clic en una foto para aislarla</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                  Página no disponible
                </div>
              )}

              {/* Book Spine / Binding Left Shadow Effect */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/25 via-black/8 to-transparent pointer-events-none" />

              {/* Subtle Right Edge Page Stack Lines Effect */}
              <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-black/15 via-black/5 to-transparent pointer-events-none" />

              {/* Page number badge */}
              {settings.showPageNumbers && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white pointer-events-none z-10">
                  {currentPage === 1 ? 'Portada (1)' : `${currentPage} / ${totalPages}`}
                </div>
              )}

              {/* Interactive Corner Curl Hover Trigger (Next) */}
              {currentPage < totalPages && !isZoomMode && (
                <div
                  onClick={flipNext}
                  className="group absolute bottom-0 right-0 w-16 h-16 cursor-pointer z-20 overflow-hidden"
                  title="Clic para pasar a la siguiente página"
                >
                  <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-b-[24px] border-l-[24px] border-b-amber-500/80 border-l-transparent group-hover:border-b-[36px] group-hover:border-l-[36px] transition-all shadow-md" />
                </div>
              )}

              {/* Interactive Corner Curl Hover Trigger (Prev) */}
              {currentPage > 1 && !isZoomMode && (
                <div
                  onClick={flipPrev}
                  className="group absolute bottom-0 left-0 w-16 h-16 cursor-pointer z-20 overflow-hidden"
                  title="Clic para retroceder página"
                >
                  <div className="absolute bottom-0 left-0 w-0 h-0 border-solid border-b-[24px] border-r-[24px] border-b-amber-500/80 border-r-transparent group-hover:border-b-[36px] group-hover:border-r-[36px] transition-all shadow-md" />
                </div>
              )}

              {/* 3D Realistic Turning Sheet Layer with Curl / Bend Effect */}
              <AnimatePresence>
                {isFlipping && (
                  <motion.div
                    key={`flip-anim-${animatingPageNumber}-${flipDirection}`}
                    initial={{
                      rotateY: flipDirection === 'next' ? 0 : -90,
                      transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                      boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                    }}
                    animate={{
                      rotateY: flipDirection === 'next' ? -90 : 0,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.33, 1, 0.68, 1] }}
                    className="absolute inset-0 z-30 overflow-hidden bg-white pointer-events-none"
                    style={{
                      transformStyle: 'preserve-3d',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {animatingPageNumber && portfolio.pages[animatingPageNumber - 1] && (
                      <img
                        src={portfolio.pages[animatingPageNumber - 1].dataUrl}
                        alt="Volteando página"
                        className="w-full h-full object-fill block bg-white"
                      />
                    )}
                    {/* Realistic dynamic light sheen & fold shadow across bending sheet */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-white/20 pointer-events-none" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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

            {/* Photos Explorer Gallery Button */}
            {allPortfolioImages.length > 0 && (
              <button
                id="toolbar-open-photos-btn"
                onClick={() => setShowAllPhotosGallery(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
                title="Ver todas las fotos individuales del PDF"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Fotos ({allPortfolioImages.length})</span>
              </button>
            )}

            {/* Toggle Smart Scanner Hotspots Highlights */}
            <button
              id="toolbar-toggle-hotspots-btn"
              onClick={() => setShowImageHotspots((v) => !v)}
              className={`p-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                showImageHotspots
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title={showImageHotspots ? 'Ocultar detección de fotos en página' : 'Mostrar detección de fotos en página'}
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
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
                    style={{ aspectRatio: `${page.aspectRatio || pageAspect || 0.75}` }}
                    className={`group relative rounded-md overflow-hidden border-2 transition-all duration-200 bg-stone-900 ${
                      currentPage === page.pageNumber
                        ? 'border-amber-400 scale-105 shadow-lg shadow-amber-500/20'
                        : 'border-transparent hover:border-white/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={page.thumbnailUrl || page.dataUrl}
                      alt={`Página ${page.pageNumber}`}
                      className="w-full h-full object-contain bg-white"
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
                  <label className="block text-xs font-mono-tech uppercase tracking-wider text-white/70 mb-2">
                    Mesa de Trabajo / Entorno Arquitectónico
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'abstract-arch', name: 'Arquitectura Abstracta', color: '#10141d', badge: '3D Photo' },
                      { id: 'studio-dark', name: 'Atelier Grafito CAD', color: '#0b0d11', badge: '120mm' },
                      { id: 'blueprint-cad', name: 'Plano Blueprint CAD', color: '#081a2f', badge: 'Cian' },
                      { id: 'concrete-arch', name: 'Hormigón & Concreto', color: '#17191d', badge: 'Mate' },
                      { id: 'wood-desk', name: 'Mesa Roble Taller', color: '#1a120c', badge: 'Madera' },
                      { id: 'paper-warm', name: 'Travertino Galería', color: '#ede8df', badge: 'Luz' },
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
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition text-left cursor-pointer ${
                          settings.backgroundTheme === theme.id
                            ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10 font-bold'
                            : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: theme.color }}
                          />
                          <span className="truncate">{theme.name}</span>
                        </div>
                        <span className="text-[9px] font-mono-tech text-white/40 uppercase">{theme.badge}</span>
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

      {/* IMAGE PREVIEW / ENLARGE MINI-WINDOW LIGHTBOX MODAL */}
      <AnimatePresence>
        {showImagePreviewModal && selectedExtractedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/90 backdrop-blur-md"
            onClick={() => {
              setShowImagePreviewModal(false);
              setSelectedExtractedImage(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full max-h-[94vh] flex flex-col bg-neutral-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-900/95 backdrop-blur-sm z-20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedExtractedImage.title || `Foto de Pág. ${selectedExtractedImage.pageNumber}`}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                        Pág. {selectedExtractedImage.pageNumber}
                      </span>
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Fotografía aislada en máxima resolución. Usa zoom o navega entre fotos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center bg-black/50 border border-white/15 rounded-xl p-0.5">
                    <button
                      id="lightbox-zoom-out-btn"
                      onClick={() => setPreviewZoomLevel((z) => Math.max(0.75, z - 0.25))}
                      className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
                      title="Reducir"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono px-2 text-white/80 min-w-[3.5rem] text-center">
                      {Math.round(previewZoomLevel * 100)}%
                    </span>
                    <button
                      id="lightbox-zoom-in-btn"
                      onClick={() => setPreviewZoomLevel((z) => Math.min(3.5, z + 0.25))}
                      className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
                      title="Ampliar"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      id="lightbox-zoom-reset-btn"
                      onClick={() => setPreviewZoomLevel(1)}
                      className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer text-[11px] font-semibold px-2"
                      title="Restablecer a 100%"
                    >
                      100%
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    id="close-preview-modal-btn"
                    onClick={() => {
                      setShowImagePreviewModal(false);
                      setSelectedExtractedImage(null);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-red-300 transition cursor-pointer"
                    title="Cerrar ventana (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable / Zoomable High-Res Viewer Body */}
              <div className="relative flex-1 w-full min-h-[50vh] max-h-[74vh] overflow-auto flex items-center justify-center p-4 sm:p-8 bg-black/95 select-none">
                {/* Floating Left/Right Photo Flip Buttons on Canvas */}
                {allPortfolioImages.length > 1 && (
                  <>
                    <button
                      id="lightbox-quick-prev-btn"
                      onClick={prevExtractedImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/70 hover:bg-amber-500 hover:text-black text-white/80 transition-all shadow-2xl border border-white/20 hover:scale-110 cursor-pointer"
                      title="Foto anterior"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      id="lightbox-quick-next-btn"
                      onClick={nextExtractedImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/70 hover:bg-amber-500 hover:text-black text-white/80 transition-all shadow-2xl border border-white/20 hover:scale-110 cursor-pointer"
                      title="Siguiente foto"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                <div
                  className="transition-transform duration-200 ease-out origin-center flex items-center justify-center shadow-2xl rounded-lg overflow-hidden bg-white/5 border border-white/10"
                  style={{
                    transform: `scale(${previewZoomLevel})`,
                  }}
                >
                  <img
                    src={selectedExtractedImage.dataUrl}
                    alt={selectedExtractedImage.title || `Foto de Pág. ${selectedExtractedImage.pageNumber}`}
                    className="max-w-full max-h-[68vh] object-contain block bg-white"
                    draggable={false}
                  />
                </div>
              </div>

              {/* Modal Bottom Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-white/10 bg-neutral-900/95 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <button
                    id="lightbox-prev-photo-btn"
                    onClick={prevExtractedImage}
                    disabled={
                      !selectedExtractedImage ||
                      allPortfolioImages.findIndex((i) => i.id === selectedExtractedImage.id) <= 0
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white transition cursor-pointer font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Foto Anterior</span>
                  </button>

                  <span className="text-[11px] font-mono text-white/60 px-2">
                    {allPortfolioImages.length > 0
                      ? `${allPortfolioImages.findIndex((i) => i.id === selectedExtractedImage.id) + 1} de ${allPortfolioImages.length} fotos`
                      : `Página ${selectedExtractedImage.pageNumber}`}
                  </span>

                  <button
                    id="lightbox-next-photo-btn"
                    onClick={nextExtractedImage}
                    disabled={
                      !selectedExtractedImage ||
                      allPortfolioImages.findIndex((i) => i.id === selectedExtractedImage.id) >=
                        allPortfolioImages.length - 1
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white transition cursor-pointer font-medium"
                  >
                    <span>Siguiente Foto</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    id="lightbox-download-single-btn"
                    href={selectedExtractedImage.dataUrl}
                    download={`${portfolio.title}-${selectedExtractedImage.title ? selectedExtractedImage.title.replace(/\s+/g, '_') : `foto_pag_${selectedExtractedImage.pageNumber}`}.jpg`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar esta imagen</span>
                  </a>
                  <button
                    id="lightbox-close-bottom-btn"
                    onClick={() => {
                      setShowImagePreviewModal(false);
                      setSelectedExtractedImage(null);
                    }}
                    className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded-lg transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ALL PHOTOS & ARTWORK GALLERY DRAWER (Explorar todas las imágenes detectadas) */}
      <AnimatePresence>
        {showAllPhotosGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAllPhotosGallery(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-w-4xl w-full max-h-[88vh] flex flex-col bg-neutral-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-950/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Galería de Imágenes del Portafolio</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                        {allPortfolioImages.length} fotos detectadas
                      </span>
                    </h3>
                    <p className="text-xs text-white/50">
                      Haz clic en cualquier imagen para abrirla en pantalla completa
                    </p>
                  </div>
                </div>

                <button
                  id="close-all-photos-gallery-btn"
                  onClick={() => setShowAllPhotosGallery(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of All Detected Individual Photos */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 bg-black/40">
                {allPortfolioImages.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    onClick={() => {
                      setShowAllPhotosGallery(false);
                      openExtractedImage(img);
                    }}
                    className="group relative flex flex-col bg-neutral-800/80 border border-white/10 hover:border-amber-400/80 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10"
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
                      <img
                        src={img.dataUrl}
                        alt={img.title || `Foto ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 rounded-full bg-amber-500 text-black shadow-lg">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white">
                        Pág. {img.pageNumber}
                      </div>
                    </div>
                    <div className="p-2.5 bg-neutral-900/90 flex items-center justify-between">
                      <span className="text-xs font-medium text-white/90 truncate">
                        {img.title || `Imagen ${idx + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
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
                  Compartir Presentación con Clientes
                </h3>
                <button
                  id="close-share-modal-btn"
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                  <span className="text-amber-400 text-sm font-bold">🔒</span>
                  <div>
                    <strong className="text-white block font-arch">Modo Presentación Seguro</strong>
                    El enlace generado se abre directamente en el libro 3D en la <strong className="text-amber-300">Pág. {currentPage}</strong> sin permisos de administración, edición ni eliminación.
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/15">
                  <input
                    id="share-link-input"
                    type="text"
                    readOnly
                    value={clientPresentationUrl}
                    className="w-full bg-transparent text-xs text-white/90 focus:outline-none truncate font-mono-tech"
                  />
                  <button
                    id="copy-share-link-btn"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg shrink-0 transition cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <span>Copiar Enlace</span>
                    )}
                  </button>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-2 font-semibold">
                    Enviar a Cliente
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      id="share-whatsapp-btn"
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Hola, te comparto la presentación interactiva de mi portafolio "${portfolio.title}" en formato libro 3D: ${clientPresentationUrl}`
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
                        `Presentación Portafolio: ${portfolio.title}`
                      )}&body=${encodeURIComponent(
                        `Hola,\n\nTe invito a ver la presentación interactiva de mi portafolio en formato libro:\n${clientPresentationUrl}\n\nSaludos.`
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
