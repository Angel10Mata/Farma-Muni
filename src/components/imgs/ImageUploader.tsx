'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import imageCompression from 'browser-image-compression';
import ImageEditorModal from './ImageEditorModal';
import { ImagenAmpliadaOverlay } from './ImagenAmpliadaOverlay';
import { Loader2, Upload, Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import { useUserContext } from "@/components/(base)/providers/UserProvider";

export interface ImageUploaderHandle {
  openGallery: () => void;
  openCamera: () => void;
  deleteImage: () => Promise<void>;
  isProcessing: boolean;
  uploading: boolean;
  deleting: boolean;
  tieneImagen: boolean;
  puedeSubir: boolean;
}

interface ImageUploaderProps {
  bucketName: string;
  currentImagePath: string | null;
  onUploadSuccess: (newPath: string) => void | Promise<void>;
  onDeleteSuccess: () => void | Promise<void>;
  disabled?: boolean;
  signedUrlExpiresIn?: number;
  /** Aspect ratio for the crop editor (default: 3/4 portrait) */
  aspect?: number;
  aspectLabel?: string;
  /** Si es true, ignora el chequeo de rol y permite subir a cualquier autenticado */
  permitirTodos?: boolean;
  /** Oculta botones internos; usar ref para controlarlos desde el padre */
  botonesExternos?: boolean;
  onEstadoChange?: (estado: { uploading: boolean; deleting: boolean }) => void;
  /** Clase CSS adicional para la vista previa de la imagen (ej. max-h-[250px]) */
  previewClassName?: string;
  /** Modo compacto: solo íconos, sin textos y área clickeable */
  compact?: boolean;
  /** Variante visual optimizada para foto de producto (cuadrado, drop zone ampliada) */
  variant?: 'default' | 'product';
  /** Tamaño máximo del JPEG comprimido (bytes); si no se define, 200 KB por imagen */
  maxCompressedBytes?: number;
  onUploadedBytes?: (bytes: number) => void;
}

const ImageUploader = forwardRef<ImageUploaderHandle, ImageUploaderProps>(function ImageUploader({
  bucketName,
  currentImagePath,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
  signedUrlExpiresIn = 3600,
  aspect = 3 / 4,
  aspectLabel = 'Vertical 3:4',
  permitirTodos = false,
  botonesExternos = false,
  onEstadoChange,
  previewClassName,
  compact = false,
  variant = 'default',
  maxCompressedBytes,
  onUploadedBytes,
}, ref) {
  const supabase = createClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [imagenAmpliadaUrl, setImagenAmpliadaUrl] = useState<string | null>(null);
  const { effectiveRole: rol } = useUserContext();
  const tienePermisoSubir = permitirTodos || rol === 'SUPER' || rol === 'ADMINISTRADOR' || rol === 'SECRETARIO';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [magnifier, setMagnifier] = useState<{ show: boolean; clientX: number; clientY: number; bgX: number; bgY: number }>({ show: false, clientX: 0, clientY: 0, bgX: 0, bgY: 0 });
  const MAGNIFIER_SIZE = 250;
  const ZOOM_LEVEL = 2.5;

  const updateMagnifier = (clientX: number, clientY: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const bgX = (x / rect.width) * 100;
    const bgY = (y / rect.height) * 100;
    setMagnifier({ show: true, clientX, clientY, bgX, bgY });
  };

  // Generar signed URL para el preview
  useEffect(() => {
    if (!currentImagePath) {
      setPreviewUrl(null);
      return;
    }

    setLoadingPreview(true);
    supabase.storage
      .from(bucketName)
      .createSignedUrl(currentImagePath, signedUrlExpiresIn)
      .then(({ data, error }) => {
        setPreviewUrl(error ? null : data?.signedUrl ?? null);
        setLoadingPreview(false);
      });
  }, [currentImagePath, bucketName, supabase, signedUrlExpiresIn]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG o WebP.');
      return;
    }

    setEditingFile(file);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tienePermisoSubir || isProcessing || currentImagePath) return;
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tienePermisoSubir || isProcessing || currentImagePath) return;
    // Necesario para permitir el drop
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragging(false);
    
    if (!tienePermisoSubir || isProcessing || currentImagePath) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG o WebP.');
      return;
    }

    setEditingFile(file);
  };

  const buildUniqueName = (ext: string) => {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${rand}.${ext}`;
  };

  const uploadEditedFile = async (editedFile: File) => {
    setUploading(true);
    setEditingFile(null);
    try {
      const maxBytes = maxCompressedBytes ?? 200 * 1024;
      const maxSizeMB = Math.max(maxBytes / (1024 * 1024), 0.01);

      let compressed = await imageCompression(editedFile, {
        maxSizeMB,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });

      if (compressed.size > maxBytes) {
        compressed = await imageCompression(editedFile, {
          maxSizeMB: maxSizeMB * 0.85,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/jpeg',
        });
      }

      if (compressed.size > maxBytes) {
        alert(
          `La imagen comprimida supera el límite (${Math.round(maxBytes / 1024)} KB). Quita otras fotos o usa una imagen más pequeña.`,
        );
        return;
      }

      const jpegBlob = compressed.type === 'image/jpeg'
        ? compressed
        : new File([compressed], compressed.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
          });

      const newPath = buildUniqueName('jpg');

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(newPath, jpegBlob, { upsert: false, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      if (currentImagePath) {
        await supabase.storage.from(bucketName).remove([currentImagePath]);
      }

      onUploadedBytes?.(jpegBlob.size);
      await onUploadSuccess(newPath);
    } catch (err: unknown) {
      console.error('Error al subir imagen:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (message.toLowerCase().includes('bucket not found')) {
        alert(
          `El bucket de Storage "${bucketName}" no existe en este proyecto Supabase. ` +
            'Ejecuta db/migrations/20261019_storage_farmamuni_bucket.sql en el SQL Editor, ' +
            'o define NEXT_PUBLIC_PRODUCTO_IMAGENES_BUCKET con el nombre de tu bucket.',
        );
        return;
      }
      alert('Error al subir la imagen: ' + message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImagePath) return;
    const confirmar = confirm('¿Estás seguro de eliminar esta imagen?');
    if (!confirmar) return;

    setDeleting(true);
    try {
      await supabase.storage.from(bucketName).remove([currentImagePath]);
      await onDeleteSuccess();
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar: ' + (err?.message || ''));
    } finally {
      setDeleting(false);
    }
  };

  const isProcessing = uploading || deleting || disabled;

  useEffect(() => {
    onEstadoChange?.({ uploading, deleting });
  }, [uploading, deleting, onEstadoChange]);

  useImperativeHandle(ref, () => ({
    openGallery: () => fileInputRef.current?.click(),
    openCamera: () => cameraInputRef.current?.click(),
    deleteImage: handleDelete,
    isProcessing,
    uploading,
    deleting,
    tieneImagen: !!currentImagePath,
    puedeSubir: tienePermisoSubir,
  }), [isProcessing, uploading, deleting, currentImagePath, tienePermisoSubir]);

  const isProductVariant = variant === 'product' && !compact && !botonesExternos;
  const canOpenGallery = tienePermisoSubir && !isProcessing && !currentImagePath;

  const openGallery = () => fileInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div 
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          if (compact) {
            e.stopPropagation();
            return;
          }
        }}
        className={
          isProductVariant
            ? `relative w-full h-[156px] max-md:min-h-[10.5rem] max-md:h-auto rounded-2xl overflow-hidden transition-all duration-300 ${
                isDragging
                  ? 'ring-2 ring-[#8DA78E] ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 scale-[1.02]'
                  : ''
              }`
            : botonesExternos
            ? `flex flex-col items-center transition-colors ${
                currentImagePath
                  ? 'w-full'
                  : isDragging
                    ? 'border-2 border-dashed border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20 rounded-xl py-10 px-4'
                    : 'border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-xl py-10 px-4'
              }`
            : compact 
            ? `w-full h-full flex flex-col items-center justify-center transition-colors relative group ${!currentImagePath && tienePermisoSubir ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50' : ''}`
            : `border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 ${
                isDragging 
                  ? 'border-[#8DA78E] bg-[#8DA78E]/10 dark:bg-[#8DA78E]/5 scale-[1.01]' 
                  : 'border-[#C1D1C5]/40 dark:border-zinc-800 bg-[#F5F5F1]/50 dark:bg-zinc-900/40 hover:border-[#8DA78E]/60'
              }`
        }
      >
        {isProductVariant && !currentImagePath && (
          <div
            className={`absolute inset-0 bg-gradient-to-br from-[#F5F5F1] via-white to-[#8DA78E]/10 dark:from-zinc-900 dark:via-zinc-950 dark:to-[#8DA78E]/5 border border-dashed rounded-2xl transition-colors ${
              isDragging
                ? 'border-[#8DA78E] bg-[#8DA78E]/15 dark:bg-[#8DA78E]/10'
                : 'border-[#C1D1C5]/50 dark:border-zinc-700/80'
            }`}
          />
        )}

        {isProductVariant && currentImagePath && previewUrl && !loadingPreview && (
          <div className="absolute inset-0 rounded-2xl ring-1 ring-[#C1D1C5]/30 dark:ring-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            <img
              ref={imgRef}
              src={previewUrl}
              alt="Vista previa del producto"
              className="w-full h-full cursor-zoom-in object-contain select-none"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                setImagenAmpliadaUrl(previewUrl);
              }}
              onMouseMove={(e) => updateMagnifier(e.clientX, e.clientY)}
              onMouseLeave={() => setMagnifier(m => ({ ...m, show: false }))}
            />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={openGallery}
                  disabled={isProcessing}
                  className="flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-etiqueta font-bold rounded-lg bg-white/95 text-[#525D53] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Upload size={12} />
                  <span className="hidden sm:inline">Galería</span>
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={isProcessing}
                  aria-label="Tomar foto con la cámara"
                  className="flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-etiqueta font-bold rounded-lg bg-white/95 text-[#525D53] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Camera size={12} className="text-look-2-salvia-menta" />
                  <span className="hidden sm:inline">Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="flex shrink-0 items-center justify-center px-2.5 py-1.5 text-etiqueta font-bold rounded-lg bg-red-500/90 text-white transition-all disabled:opacity-50 cursor-pointer"
                  aria-label="Eliminar imagen"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {isProductVariant && currentImagePath && loadingPreview && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <Loader2 className="animate-spin text-look-2-salvia-menta" size={28} />
          </div>
        )}

        {isProductVariant && currentImagePath && !loadingPreview && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <p className="text-xs text-red-500 font-medium">No se pudo cargar la vista previa.</p>
          </div>
        )}

        {isProductVariant && uploading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm rounded-2xl">
            <Loader2 className="animate-spin text-look-2-salvia-menta" size={28} />
            <span className="text-etiqueta font-bold text-slate-600 dark:text-slate-300">Subiendo imagen...</span>
          </div>
        )}

        {/* Preview o placeholder (modos default / compact / botonesExternos) */}
        {!isProductVariant && currentImagePath ? (
          loadingPreview ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : previewUrl ? (
            <div className={compact ? 'w-full h-full' : botonesExternos ? 'w-full' : 'w-full flex justify-center'}>
              <div 
                className={compact ? 'w-full h-full relative' : `relative ${botonesExternos ? 'w-full cursor-zoom-in' : 'inline-block cursor-zoom-in'}`}
                onMouseMove={(e) => updateMagnifier(e.clientX, e.clientY)}
                onMouseLeave={() => setMagnifier(m => ({ ...m, show: false }))}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  if (!touch) return;
                  updateMagnifier(touch.clientX, touch.clientY);
                }}
                onTouchEnd={() => setMagnifier(m => ({ ...m, show: false }))}
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Vista previa"
                  className={
                    compact
                      ? 'w-full h-full object-cover rounded-xl select-none'
                      : botonesExternos
                      ? 'w-full max-h-[calc(95vh-11rem)] object-contain select-none block'
                      : `${previewClassName || 'max-h-[460px]'} object-contain rounded-lg shadow-md select-none`
                  }
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500 italic">
              No se pudo cargar la vista previa.
            </p>
          )
        ) : null}

        {isProductVariant && !currentImagePath && !uploading && (
          <div
            className="absolute inset-0 z-10 flex min-h-0 flex-col items-center justify-center gap-1.5 p-2 pointer-events-none"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#8DA78E]/25 bg-[#8DA78E]/15 text-look-2-salvia-menta dark:bg-[#8DA78E]/10">
              <ImageIcon className="size-4" />
            </div>
            <p className="max-w-full truncate px-1 text-center text-[10px] font-bold leading-tight text-slate-700 dark:text-slate-200">
              {isDragging ? "Suelta aquí" : "Foto de marca"}
            </p>
            {tienePermisoSubir ? (
              <div
                className="grid w-full max-w-full grid-cols-2 gap-1 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={openGallery}
                  disabled={isProcessing}
                  className="flex min-w-0 items-center justify-center gap-1 rounded-lg bg-[#8DA78E] px-1 py-2 text-[10px] font-bold leading-none text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Upload size={12} className="shrink-0" />
                  <span className="truncate">Galería</span>
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={isProcessing}
                  className="flex min-w-0 items-center justify-center gap-1 rounded-lg border border-[#C1D1C5]/60 bg-white/95 px-1 py-2 text-[10px] font-bold leading-none text-[#525D53] transition-all active:scale-95 disabled:opacity-50 cursor-pointer dark:border-zinc-700 dark:bg-zinc-800/95 dark:text-slate-200"
                >
                  <Camera size={12} className="shrink-0 text-look-2-salvia-menta" />
                  <span className="truncate">Cámara</span>
                </button>
              </div>
            ) : null}
          </div>
        )}

        {!isProductVariant && !currentImagePath && !uploading && !botonesExternos && !compact && (
          <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
            <div className="size-12 rounded-2xl bg-[#8DA78E]/10 dark:bg-[#8DA78E]/5 border border-[#8DA78E]/20 flex items-center justify-center text-look-2-salvia-menta mb-1">
              <ImageIcon className="size-6" />
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">
              Arrastra y suelta tu imagen
            </p>
          </div>
        )}

        {!currentImagePath && compact && !uploading && tienePermisoSubir && (
          <div className="w-full h-full flex flex-col justify-between py-1 bg-white dark:bg-zinc-900/60 rounded-xl">
            {/* Header Title */}
            <div className="text-center pt-1 pb-1 border-b border-[#C1D1C5]/10 dark:border-zinc-800/10 select-none">
              <span className="text-etiqueta font-bold text-slate-500 uppercase tracking-wider">Tomar / Subir Foto</span>
            </div>
            {/* Buttons Row */}
            <div className="flex-1 flex flex-row items-stretch divide-x divide-[#C1D1C5]/30 dark:divide-zinc-800/40">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex-1 flex flex-col items-center justify-center text-texto-tenue hover:text-[#8DA78E] hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-all gap-0.5 p-1 cursor-pointer select-none"
              >
                <Upload size={14} />
                <span className="text-etiqueta font-bold uppercase tracking-wider">Archivo</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="flex-1 flex flex-col items-center justify-center text-texto-tenue hover:text-[#8DA78E] hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-all gap-0.5 p-1 cursor-pointer select-none"
              >
                <Camera size={14} />
                <span className="text-etiqueta font-bold uppercase tracking-wider">Cámara</span>
              </button>
            </div>
          </div>
        )}

        {compact && uploading && (
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-look-2-salvia-menta" size={24} />
          </div>
        )}

        {compact && currentImagePath && tienePermisoSubir && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isProcessing}
            className="absolute top-1.5 right-1.5 size-7 flex items-center justify-center bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-sm backdrop-blur-sm transition-all disabled:opacity-50 z-10"
          >
            {deleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        )}

        {!botonesExternos && !compact && !isProductVariant && (
        <div className="flex gap-2.5 flex-wrap justify-center mt-1">
          {tienePermisoSubir && (
            <>
              {!currentImagePath && (
                <>
                  <button
                    type="button"
                    onClick={openGallery}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#8DA78E] text-[#F5F5F1] transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Subir Galería
                  </button>

                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-zinc-800 border border-[#C1D1C5]/60 dark:border-zinc-700 text-[#525D53] dark:text-slate-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Camera size={14} className="text-look-2-salvia-menta" />
                    Tomar Foto
                  </button>
                </>
              )}

              {currentImagePath && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Eliminar Imagen
                </button>
              )}
            </>
          )}
        </div>
        )}


        {!currentImagePath && !uploading && botonesExternos && (
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium text-center pointer-events-none select-none">
            Selecciona una imagen desde el pie del modal
          </p>
        )}
      </div>

      {/* Image Editor Modal */}
      {editingFile && (
        <ImageEditorModal
          file={editingFile}
          aspect={aspect}
          aspectLabel={aspectLabel}
          onApply={uploadEditedFile}
          onCancel={() => setEditingFile(null)}
        />
      )}

      <ImagenAmpliadaOverlay
        imageUrl={imagenAmpliadaUrl}
        alt="Vista previa del producto"
        onClose={() => setImagenAmpliadaUrl(null)}
      />

      {magnifier.show && previewUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed rounded-full border-4 border-white shadow-2xl pointer-events-none z-[9999]"
          style={{
            width: MAGNIFIER_SIZE,
            height: MAGNIFIER_SIZE,
            left: magnifier.clientX - MAGNIFIER_SIZE / 2,
            top: magnifier.clientY - MAGNIFIER_SIZE / 2,
            backgroundImage: `url(${previewUrl})`,
            backgroundSize: `${(imgRef.current?.width || 300) * ZOOM_LEVEL}px ${(imgRef.current?.height || 400) * ZOOM_LEVEL}px`,
            backgroundPosition: `${magnifier.bgX}% ${magnifier.bgY}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />,
        document.body
      )}
    </>
  );
});

export default ImageUploader;
