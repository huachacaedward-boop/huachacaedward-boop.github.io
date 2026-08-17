export interface ExtractedImage {
  id: string;
  pageNumber: number;
  dataUrl: string;
  thumbnailUrl?: string;
  xPercent: number; // 0 - 100 percentage of page width
  yPercent: number; // 0 - 100 percentage of page height
  widthPercent: number; // 0 - 100 percentage of page width
  heightPercent: number; // 0 - 100 percentage of page height
  title?: string;
  width?: number;
  height?: number;
}

export interface PortfolioPage {
  pageNumber: number;
  dataUrl: string; // High-res image data
  thumbnailUrl?: string; // Lightweight thumbnail
  width: number;
  height: number;
  aspectRatio: number;
  extractedImages?: ExtractedImage[]; // Detected / extracted individual photos on this page
}

export type BookBackgroundTheme = 'abstract-arch' | 'studio-dark' | 'blueprint-cad' | 'concrete-arch' | 'wood-desk' | 'paper-warm' | 'minimal-light' | 'midnight-navy';

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
