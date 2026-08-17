import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  HardDrive,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PortfolioMeta } from '../types';
import { processPdfFile, MAX_FILE_SIZE_BYTES, MAX_PAGES_ALLOWED, formatFileSize, ProcessingProgress } from '../services/pdfEngine';
import { savePortfolioToStorage } from '../services/storageService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (portfolio: PortfolioMeta) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<'arquitectura' | 'diseno' | 'fotografia' | 'arte' | 'editorial' | 'otro'>('diseno');

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setAuthor('');
    setDescription('');
    setCategory('diseno');
    setIsProcessing(false);
    setProgress(null);
    setErrorMessage(null);
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    // Validate size (500 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `El archivo pesa ${formatFileSize(file.size)}, superando el límite de 500 MB. Por favor optimiza el PDF.`
      );
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Solo se admiten documentos en formato PDF (.pdf).');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [title]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const portfolio = await processPdfFile(
        selectedFile,
        {
          title: title.trim() || selectedFile.name.replace(/\.pdf$/i, ''),
          author: author.trim() || 'Autor',
          description: description.trim() || 'Portafolio publicado en formato libro.',
          category,
        },
        (prog) => {
          setProgress(prog);
        }
      );

      // Save to IndexedDB
      await savePortfolioToStorage(portfolio);

      // Celebrate
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      onSuccess(portfolio);
      resetForm();
      onClose();
    } catch (err: unknown) {
      console.error('Error processing PDF:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar el archivo PDF.'
      );
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-8"
      >
        {/* Close Button */}
        {!isProcessing && (
          <button
            id="close-upload-modal-btn"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono-tech uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Motor de Procesamiento CAD / Ultra HD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-arch font-bold tracking-tight text-white">
            Publicar Portafolio en Libro Interactivo
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 font-sans">
            Convierte tu PDF en un libro digital 3D de alta fidelidad, con paso de página físico y extracción de fotos/renders.
          </p>
        </div>

        {/* Requirements Pill Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 p-3 rounded-xl bg-black/50 border border-white/10 text-center font-mono-tech">
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              Límite
            </span>
            <span className="text-xs sm:text-sm font-bold text-white mt-0.5">Hasta 500 MB</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1 border-x border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Páginas
            </span>
            <span className="text-xs sm:text-sm font-bold text-white mt-0.5">Hasta 100 Hojas</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Calidad
            </span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">Sin Pérdida (HD)</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Processing State with Live Progress Bar */}
        {isProcessing && progress ? (
          <div className="py-8 px-4 text-center space-y-5 bg-black/30 rounded-2xl border border-white/10">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-full h-full rounded-full border-4 border-white/10 border-t-amber-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-amber-300">
                {progress.percentage}%
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">{progress.statusText}</h4>
              <p className="text-xs text-white/50 mt-1">
                Generando capas vectoriales y optimizando renderizado para móviles y pantallas Retina...
              </p>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-[11px] text-white/40">
              Página {progress.currentPage} de {progress.totalPages} procesadas
            </div>
          </div>
        ) : (
          /* File Selection & Metadata Form */
          <div className="space-y-4">
            {/* Drag & Drop Box */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-500/5'
                  : 'border-white/20 hover:border-white/40 bg-black/20 hover:bg-black/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{selectedFile.name}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">
                      Tamaño: {formatFileSize(selectedFile.size)} • Listo para renderizar en HD
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Arrastra y suelta tu archivo PDF aquí o <span className="text-amber-400 underline">haz clic para explorar</span>
                  </div>
                  <p className="text-xs text-white/40">
                    Admite archivos de hasta 500 MB y hasta 100 páginas en máxima resolución
                  </p>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                  Título del Portafolio
                </label>
                <input
                  id="portfolio-title-input"
                  type="text"
                  placeholder="Ej: Portafolio de Arquitectura 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                  Autor / Estudio
                </label>
                <input
                  id="portfolio-author-input"
                  type="text"
                  placeholder="Ej: Arq. María González"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                  Categoría
                </label>
                <select
                  id="portfolio-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="arquitectura">Arquitectura & Espacios</option>
                  <option value="diseno">Diseño UI/UX & Digital</option>
                  <option value="fotografia">Fotografía & Artes Visuales</option>
                  <option value="arte">Ilustración & Bellas Artes</option>
                  <option value="editorial">Diseño Editorial & Moda</option>
                  <option value="otro">Otro Portafolio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                  Descripción Breve
                </label>
                <input
                  id="portfolio-description-input"
                  type="text"
                  placeholder="Ej: Selección de proyectos de autor..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                id="cancel-upload-btn"
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80 transition"
              >
                Cancelar
              </button>

              <button
                id="submit-process-portfolio-btn"
                type="button"
                disabled={!selectedFile}
                onClick={handleStartProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 text-black disabled:text-white/30 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:shadow-none transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Generar Libro Interactivo HD</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
