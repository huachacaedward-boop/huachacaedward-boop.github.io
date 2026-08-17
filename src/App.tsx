/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioMeta } from './types';
import { generateSamplePortfolios } from './data/samplePortfolios';
import { getAllStoredPortfolios, deletePortfolioFromStorage } from './services/storageService';
import { PortfolioLibrary } from './components/PortfolioLibrary';
import { FlipBookViewer } from './components/FlipBookViewer';
import { UploadModal } from './components/UploadModal';

export default function App() {
  const [portfolios, setPortfolios] = useState<PortfolioMeta[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<PortfolioMeta | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      // If link contains client/viewer/presentation flags, start in client mode (no delete/admin options)
      if (
        hash.includes('mode=client') ||
        hash.includes('view=present') ||
        hash.includes('role=viewer') ||
        search.includes('mode=client') ||
        search.includes('view=present')
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

  // Initialize and load portfolios (samples + user IndexedDB saved portfolios)
  const loadAllPortfolios = useCallback(async () => {
    setIsLoading(true);
    try {
      const samples = generateSamplePortfolios();
      const userPortfolios = await getAllStoredPortfolios();
      
      const combined = [...userPortfolios, ...samples];
      setPortfolios(combined);

      // Check URL hash for direct portfolio link & page
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const portfolioId = params.get('portfolio');
        const mode = params.get('mode');
        
        if (mode === 'client' || mode === 'viewer') {
          setIsAdmin(false);
        }

        if (portfolioId) {
          const match = combined.find((p) => p.id === portfolioId);
          if (match) {
            setActivePortfolio(match);
          }
        }
      }
    } catch (err) {
      console.error('Error loading portfolios:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllPortfolios();
  }, [loadAllPortfolios]);

  // Handle uploaded portfolio
  const handleUploadSuccess = (newPortfolio: PortfolioMeta) => {
    setPortfolios((prev) => [newPortfolio, ...prev]);
    setActivePortfolio(newPortfolio);
  };

  // Handle delete
  const handleDeletePortfolio = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('¿Deseas eliminar este portafolio de tu biblioteca?')) {
      await deletePortfolioFromStorage(id);
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
      if (activePortfolio?.id === id) {
        setActivePortfolio(null);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0d0f12] text-white">
      {activePortfolio ? (
        <FlipBookViewer
          portfolio={activePortfolio}
          isAdmin={isAdmin}
          onBack={() => {
            setActivePortfolio(null);
            // Clear portfolio param from hash while preserving client mode if set
            if (window.location.hash) {
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              hashParams.delete('portfolio');
              hashParams.delete('page');
              const remaining = hashParams.toString();
              const newUrl = window.location.pathname + (remaining ? `#${remaining}` : '');
              history.pushState('', document.title, newUrl);
            }
          }}
          onUploadNew={isAdmin ? () => setIsUploadOpen(true) : undefined}
        />
      ) : (
        <PortfolioLibrary
          portfolios={portfolios}
          isAdmin={isAdmin}
          onSelectPortfolio={(portfolio) => setActivePortfolio(portfolio)}
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
