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
          onBack={() => {
            setActivePortfolio(null);
            // Clear hash
            if (window.location.hash) {
              history.pushState('', document.title, window.location.pathname + window.location.search);
            }
          }}
          onUploadNew={() => setIsUploadOpen(true)}
        />
      ) : (
        <PortfolioLibrary
          portfolios={portfolios}
          onSelectPortfolio={(portfolio) => setActivePortfolio(portfolio)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onDeletePortfolio={handleDeletePortfolio}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
