export interface PortfolioPage {
  pageNumber: number;
  dataUrl: string; // High-res image data
  thumbnailUrl?: string; // Lightweight thumbnail
  width: number;
  height: number;
  aspectRatio: number;
}

export type BookBackgroundTheme = 'studio-dark' | 'minimal-light' | 'wood-desk' | 'midnight-navy' | 'paper-warm';

export type BookCoverFinish = 'matte' | 'glossy' | 'leather' | 'linen';

export interface PortfolioMeta {
  id: string;
  title: string;
  author: string;
  description: string;
  category: 'arquitectura' | 'diseno' | 'fotografia' | 'arte' | 'editorial' | 'otro';
  totalPages: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  createdAt: number;
  coverImage: string;
  pdfBlob?: Blob;
  pages: PortfolioPage[];
  isSample?: boolean;
}

export interface ViewerSettings {
  soundEnabled: boolean;
  viewMode: 'auto' | 'single' | 'double';
  backgroundTheme: BookBackgroundTheme;
  pageShadowIntensity: number; // 0.1 to 1.0
  autoFlipInterval: number; // in seconds
  zoomScale: number; // 1.0 to 3.0
  showPageNumbers: boolean;
  hardcoverEffect: boolean;
}
