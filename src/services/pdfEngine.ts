import * as pdfjsLib from 'pdfjs-dist';
import { PortfolioMeta, PortfolioPage } from '../types';
import { detectImagesFromCanvas } from './imageDetector';

// Setup worker
if (typeof window !== 'undefined') {
  // Use official CDN worker matching version or bundled worker
  const pdfjsVersion = pdfjsLib.version || '4.10.38';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;
}

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
export const MAX_PAGES_ALLOWED = 100; // 100 hojas

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export interface ProcessingProgress {
  currentPage: number;
  totalPages: number;
  phase: 'loading' | 'rendering' | 'finalizing';
  percentage: number;
  statusText: string;
}

export async function processPdfFile(
  file: File,
  meta: {
    title: string;
    author: string;
    description: string;
    category: 'arquitectura' | 'diseno' | 'fotografia' | 'arte' | 'editorial' | 'otro';
  },
  onProgress?: (progress: ProcessingProgress) => void
): Promise<PortfolioMeta> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `El archivo supera el límite de 500 MB (Tamaño detectado: ${formatFileSize(file.size)}). Por favor optimiza el PDF.`
    );
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('El archivo seleccionado no es un documento PDF válido.');
  }

  onProgress?.({
    currentPage: 0,
    totalPages: 0,
    phase: 'loading',
    percentage: 5,
    statusText: 'Cargando documento PDF y verificando páginas...',
  });

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdfDocument = await loadingTask.promise;
  const totalPages = pdfDocument.numPages;

  if (totalPages > MAX_PAGES_ALLOWED) {
    throw new Error(
      `El PDF contiene ${totalPages} páginas, superando el límite máximo permitido de ${MAX_PAGES_ALLOWED} hojas. Por favor, selecciona un portafolio de hasta 100 páginas.`
    );
  }

  const pages: PortfolioPage[] = [];

  // Optimal scale for razor-sharp fidelity without excessive memory usage:
  // 2.0x gives pristine vector rendering on Retina & Mobile 4K displays
  const RENDER_SCALE = 2.0;
  const THUMBNAIL_SCALE = 0.35;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pagePercent = Math.round(10 + (pageNum / totalPages) * 85);
    onProgress?.({
      currentPage: pageNum,
      totalPages,
      phase: 'rendering',
      percentage: pagePercent,
      statusText: `Renderizando página en Ultra HD (${pageNum} de ${totalPages})...`,
    });

    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const thumbViewport = page.getViewport({ scale: THUMBNAIL_SCALE });

    // 1. High-Res Canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });

    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto 2D para renderizado HD.');
    }

    // Fill white background before rendering PDF page
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      canvas: canvas,
      viewport,
      intent: 'display',
    }).promise;

    // Use high quality image encoding
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // 2. Thumbnail Canvas
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbViewport.width;
    thumbCanvas.height = thumbViewport.height;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);

    // 3. Scan & detect individual images/artwork on this page
    const extractedImages = await detectImagesFromCanvas(canvas, pageNum);

    pages.push({
      pageNumber: pageNum,
      dataUrl,
      thumbnailUrl,
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height,
      extractedImages,
    });

    // Cleanup canvases from memory
    canvas.width = 1;
    canvas.height = 1;
    thumbCanvas.width = 1;
    thumbCanvas.height = 1;
  }

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    phase: 'finalizing',
    percentage: 100,
    statusText: '¡Portafolio procesado con éxito!',
  });

  const portfolioId = 'pf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  const portfolio: PortfolioMeta = {
    id: portfolioId,
    title: meta.title.trim() || file.name.replace(/\.pdf$/i, ''),
    author: meta.author.trim() || 'Portafolio Profesional',
    description: meta.description.trim() || 'Portafolio digital interactivo publicado en FolioFlip.',
    category: meta.category,
    totalPages,
    fileSizeBytes: file.size,
    fileSizeFormatted: formatFileSize(file.size),
    createdAt: Date.now(),
    coverImage: pages[0]?.dataUrl || '',
    pdfBlob: file,
    pages,
    isSample: false,
  };

  return portfolio;
}
