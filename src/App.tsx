/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioMeta } from './types';
import { generateSamplePortfolios } from './data/samplePortfolios';
import { getAllStoredPortfolios, getPortfolioFromStorage, deletePortfolioFromStorage } from './services/storageService';
import { PortfolioLibrary } from './components/PortfolioLibrary';
import { FlipBookViewer } from './components/FlipBookViewer';
import { UploadModal } from './components/UploadModal';
import { detectDevice, DeviceInfo } from './services/deviceDetector';
import { Smartphone, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [portfolios, setPortfolios] = useState<PortfolioMeta[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<PortfolioMeta | null>(null);
  const [initialPageFromUrl, setInitialPageFromUrl] = useState<number>(1);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Cargando portafolios...');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(detectDevice());

  // Determine admin mode from localStorage or URL params
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('mode=client') ||
        hash.includes('view=present') ||
        hash.includes('role=viewer') ||
        search.includes('mode=client') ||
        search.includes('view=present') ||
        search.includes('role=viewer')
      ) {
        return false;
      }
      const saved = localStorage.getItem('folioflip_is_admin');
      if (saved === 'false') return false;
    }
    return true;
  });

  const handleToggleAdminMode = () => {
    setIsAdmin((prev) => {
      const next = !prev;
      localStorage.setItem('folioflip_is_admin', String(next));
      return next;
    });
  };

  // Helper to extract portfolio ID and page from both URL Query (?portfolio=) and Hash (#portfolio=)
  const getUrlParams = useCallback(() => {
    if (typeof window === 'undefined') return { portfolioId: null, page: 1, mode: null };
    
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const search = window.location.search.startsWith('?') ? window.location.search.substring(1) : window.location.search;
    
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(search);

    const portfolioId = searchParams.get('portfolio') || hashParams.get('portfolio');
    const pageStr = searchParams.get('page') || hashParams.get('page');
    const mode = searchParams.get('mode') || hashParams.get('mode');
    const page = pageStr ? parseInt(pageStr, 10) : 1;

    return {
      portfolioId: portfolioId ? decodeURIComponent(portfolioId) : null,
      page: isNaN(page) || page < 1 ? 1 : page,
      mode,
    };
  }, []);

  // Update device info on resize / orientation change
  useEffect(() => {
    const handleDeviceChange = () => {
      setDeviceInfo(detectDevice());
    };
    handleDeviceChange();
    window.addEventListener('resize', handleDeviceChange);
    window.addEventListener('orientationchange', handleDeviceChange);
    return () => {
      window.removeEventListener('resize', handleDeviceChange);
      window.removeEventListener('orientationchange', handleDeviceChange);
    };
  }, []);

  // Initialize and load portfolios (samples + backend server + local IndexedDB)
  const loadAllPortfolios = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Inicializando catálogo y optimizando para tu dispositivo...');
    setLoadError(null);

    try {
      const { portfolioId, page, mode } = getUrlParams();
      if (mode === 'client' || mode === 'viewer') {
        setIsAdmin(false);
      }
      if (page > 1) {
        setInitialPageFromUrl(page);
      }

      // 1. If URL has a specific portfolio ID requested, try loading it immediately
      let directPortfolio: PortfolioMeta | null = null;
      if (portfolioId) {
        setLoadingMessage('Cargando presentación del portafolio en libro 3D...');
        // Check if sample ID
        const samples = generateSamplePortfolios();
        const sampleMatch = samples.find((p) => p.id === portfolioId);
        if (sampleMatch) {
          directPortfolio = sampleMatch;
        } else {
          // Check storage / backend server
          const stored = await getPortfolioFromStorage(portfolioId);
          if (stored) {
            directPortfolio = stored;
          }
        }
      }

      // 2. Load all available portfolios for library
      const samples = generateSamplePortfolios();
      const userPortfolios = await getAllStoredPortfolios();
      
      // Combine avoiding duplicate IDs
      const map = new Map<string, PortfolioMeta>();
      userPortfolios.forEach((p) => map.set(p.id, p));
      samples.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });
      if (directPortfolio && !map.has(directPortfolio.id)) {
        map.set(directPortfolio.id, directPortfolio);
      }

      const combined = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPortfolios(combined);

      if (directPortfolio) {
        setActivePortfolio(directPortfolio);
      } else if (portfolioId) {
        setLoadError(`El portafolio compartido ("${portfolioId}") no se encontró o ha expirado. Mostrando catálogo.`);
      }
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setLoadError('Hubo un problema al cargar los portafolios. Mostrando biblioteca predeterminada.');
      const fallback = generateSamplePortfolios();
      setPortfolios(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [getUrlParams]);

  // Load once on mount
  useEffect(() => {
    loadAllPortfolios();
  }, [loadAllPortfolios]);

  // Listen to popstate and hashchange events for responsive direct link navigation on mobile
  useEffect(() => {
    const handleUrlChange = async () => {
      const { portfolioId, page, mode } = getUrlParams();
      if (mode === 'client' || mode === 'viewer') {
        setIsAdmin(false);
      }
      if (page) {
        setInitialPageFromUrl(page);
      }

      if (portfolioId) {
        // If already active, just return
        if (activePortfolio && activePortfolio.id === portfolioId) return;

        // Try to find in loaded list
        const match = portfolios.find((p) => p.id === portfolioId);
        if (match) {
          setActivePortfolio(match);
        } else {
          // Fetch from server / IndexedDB
          const fetched = await getPortfolioFromStorage(portfolioId);
          if (fetched) {
            setPortfolios((prev) => [fetched, ...prev.filter((p) => p.id !== fetched.id)]);
            setActivePortfolio(fetched);
          }
        }
      } else {
        setActivePortfolio(null);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [activePortfolio, getUrlParams, portfolios]);

  // Handle uploaded portfolio
  const handleUploadSuccess = (newPortfolio: PortfolioMeta) => {
    setPortfolios((prev) => [newPortfolio, ...prev.filter((p) => p.id !== newPortfolio.id)]);
    setActivePortfolio(newPortfolio);
  };

  // Handle delete
  const handleDeletePortfolio = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('¿Deseas eliminar este portafolio de la biblioteca?')) {
      await deletePortfolioFromStorage(id);
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
      if (activePortfolio?.id === id) {
        setActivePortfolio(null);
      }
    }
  };

  const handleBackToLibrary = () => {
    setActivePortfolio(null);
    if (typeof window !== 'undefined') {
      // Clear URL params cleanly
      const url = new URL(window.location.href);
      url.searchParams.delete('portfolio');
      url.searchParams.delete('page');
      url.hash = '';
      window.history.pushState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#0d0f12] text-white flex flex-col justify-between">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090b0e] p-6 text-center">
          <div className="relative w-16 h-16 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 animate-spin opacity-40 blur-sm"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-arch font-bold text-white mb-2">FolioFlip 3D</h2>
          <p className="text-sm text-stone-300 max-w-sm mb-4">{loadingMessage}</p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-stone-400 text-xs font-mono-tech">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Dispositivo: {deviceInfo.osName} ({deviceInfo.deviceLabel})</span>
          </div>
        </div>
      )}

      {/* Direct link load error toast */}
      {loadError && !isLoading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md p-4 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-100 shadow-2xl backdrop-blur-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <strong className="block font-bold mb-0.5">Aviso de Portafolio</strong>
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => setLoadError(null)}
            className="text-stone-400 hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {activePortfolio ? (
        <FlipBookViewer
          portfolio={activePortfolio}
          initialPage={initialPageFromUrl}
          isAdmin={isAdmin}
          deviceInfo={deviceInfo}
          onBack={handleBackToLibrary}
          onUploadNew={isAdmin ? () => setIsUploadOpen(true) : undefined}
        />
      ) : (
        <PortfolioLibrary
          portfolios={portfolios}
          isAdmin={isAdmin}
          deviceInfo={deviceInfo}
          onSelectPortfolio={(portfolio) => {
            setActivePortfolio(portfolio);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('portfolio', portfolio.id);
              url.searchParams.set('page', '1');
              if (!isAdmin) url.searchParams.set('mode', 'client');
              window.history.pushState({}, '', url.toString());
            }
          }}
          onOpenUpload={() => setIsUploadOpen(true)}
          onDeletePortfolio={handleDeletePortfolio}
          onToggleAdminMode={handleToggleAdminMode}
        />
      )}

      {/* Upload Modal (Only allowed for admin) */}
      {isAdmin && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
