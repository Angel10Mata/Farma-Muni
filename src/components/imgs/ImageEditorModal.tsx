'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from './cropImage';
import { getCroppedFile } from './cropImage';
import { Loader2, RotateCcw, RotateCw, RefreshCw } from 'lucide-react';

interface ImageEditorModalProps {
  file: File;
  aspectLabel?: string;
  aspect?: number;
  onApply: (croppedFile: File) => void | Promise<void>;
  onCancel: () => void;
}

export default function ImageEditorModal({
  file,
  aspectLabel = 'Libre',
  aspect = 3 / 4,
  onApply,
  onCancel,
}: ImageEditorModalProps) {
  const [currentAspect, setCurrentAspect] = useState(aspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const imageSrc = URL.createObjectURL(file);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const cropped = await getCroppedFile(
        imageSrc,
        croppedAreaPixels,
        rotation,
        file.name,
        file.type || 'image/jpeg'
      );
      await onApply(cropped);
    } catch (err) {
      console.error('Error al recortar:', err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Editar imagen
          </h3>
          <span className="text-xs text-gray-500">{aspectLabel}</span>
        </div>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: '350px' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={currentAspect}
            restrictPosition={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-4 py-3 space-y-3 border-t border-gray-200 dark:border-neutral-700">
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.2))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors text-lg font-bold text-gray-700 dark:text-gray-300 active:scale-95"
              title="Alejar"
            >
              −
            </button>
            <input
              type="range"
              min={0.1}
              max={10}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-blue-600 h-2"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(10, z + 0.2))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors text-lg font-bold text-gray-700 dark:text-gray-300 active:scale-95"
              title="Acercar"
            >
              +
            </button>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[42px] text-center bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Rotation + Reset */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRotation((r) => r - 90)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              title="Rotar -90°"
            >
              <RotateCcw size={18} />
            </button>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[50px] text-center">
              {rotation}°
            </span>
            <button
              type="button"
              onClick={() => setRotation((r) => r + 90)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              title="Rotar +90°"
            >
              <RotateCw size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setRotation(0);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
              className="p-2 rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              title="Reset"
            >
              <RefreshCw size={18} />
            </button>
            {currentAspect !== 1 && (
              <button
                type="button"
                onClick={() => setCurrentAspect((a) => 1 / a)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                title="Cambiar orientación (Vertical/Horizontal)"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span className={currentAspect < 1 ? 'text-blue-500' : ''}>V</span>
                  <span>/</span>
                  <span className={currentAspect > 1 ? 'text-blue-500' : ''}>H</span>
                </div>
              </button>
            )}
          </div>

          <p className="text-etiqueta text-center text-gray-400 dark:text-gray-500">Pellizca o usa la rueda del ratón para hacer zoom</p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-700 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {applying && <Loader2 size={16} className="animate-spin" />}
            Aplicar y subir
          </button>
        </div>
      </div>
    </div>
  );
}
