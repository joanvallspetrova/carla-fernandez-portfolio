'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Move,
  ChevronRight,
} from 'lucide-react';

export interface CropQueueItem {
  id?: string; // If editing an existing photo
  file?: File;
  srcUrl: string;
  title: string;
  category: 'book' | 'digitals';
}

interface AspectPreset {
  id: string;
  label: string;
  sublabel: string;
  ratio: number | null; // width / height, null = original image ratio
}

const ASPECT_PRESETS: AspectPreset[] = [
  { id: '3:4', label: '3:4', sublabel: 'Book / Digitals', ratio: 3 / 4 },
  { id: '4:5', label: '4:5', sublabel: 'Instagram', ratio: 4 / 5 },
  { id: '2:3', label: '2:3', sublabel: 'Retrato 35mm', ratio: 2 / 3 },
  { id: '9:16', label: '9:16', sublabel: 'Vertical Full', ratio: 9 / 16 },
  { id: '1:1', label: '1:1', sublabel: 'Cuadrado', ratio: 1 },
  { id: '16:9', label: '16:9', sublabel: 'Horizontal', ratio: 16 / 9 },
  { id: 'original', label: 'Original', sublabel: 'Sin recorte', ratio: null },
];

interface PhotoCropModalProps {
  items: CropQueueItem[];
  onCancel: () => void;
  onComplete: (
    results: {
      existingPhotoId?: string;
      croppedFile: File;
      title: string;
      category: 'book' | 'digitals';
      aspectRatioId: string;
    }[]
  ) => void;
}

export default function PhotoCropModal({
  items,
  onCancel,
  onComplete,
}: PhotoCropModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('3:4');
  const [zoom, setZoom] = useState<number>(1);
  // Pan offsets in normalized coordinates (-1 to 1 of available overflow)
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number }>({
    w: 1200,
    h: 1600,
  });

  const [completedResults, setCompletedResults] = useState<
    {
      existingPhotoId?: string;
      croppedFile: File;
      title: string;
      category: 'book' | 'digitals';
      aspectRatioId: string;
    }[]
  >([]);

  const currentItem = items[currentIndex];
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const pinchStartDistRef = useRef<{ dist: number; startZoom: number } | null>(null);

  // Reset pan/zoom when switching image
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedPresetId('3:4');
  }, [currentIndex]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    setImgDimensions({
      w: img.naturalWidth || 1200,
      h: img.naturalHeight || 1600,
    });
  };

  const activePreset =
    ASPECT_PRESETS.find((p) => p.id === selectedPresetId) || ASPECT_PRESETS[0];

  const imgRatio = imgDimensions.w / imgDimensions.h;
  const targetRatio = activePreset.ratio ?? imgRatio;

  // Compute how large the image is relative to the frame at zoom = 1 ("cover" behavior)
  // If imgRatio > targetRatio, image is wider than frame -> height matches frame (100%), width is imgRatio / targetRatio (> 100%)
  // If imgRatio < targetRatio, image is taller than frame -> width matches frame (100%), height is targetRatio / imgRatio (> 100%)
  const baseScaleX = imgRatio > targetRatio ? imgRatio / targetRatio : 1;
  const baseScaleY = imgRatio < targetRatio ? targetRatio / imgRatio : 1;

  const totalScaleX = baseScaleX * zoom;
  const totalScaleY = baseScaleY * zoom;

  // Max pan offset in percentage of frame dimensions:
  // When totalScaleX = 1.5, the image extends 25% on left and 25% on right of frame center.
  const maxOffsetPercentX = Math.max(0, ((totalScaleX - 1) / 2) * 100);
  const maxOffsetPercentY = Math.max(0, ((totalScaleY - 1) / 2) * 100);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    // Convert pixel delta to percentage of frame width/height
    const deltaPercentX = (dx / rect.width) * 100;
    const deltaPercentY = (dy / rect.height) * 100;

    const nextX =
      maxOffsetPercentX > 0
        ? clamp(
            dragStartRef.current.startPanX + deltaPercentX / maxOffsetPercentX,
            -1,
            1
          )
        : 0;
    const nextY =
      maxOffsetPercentY > 0
        ? clamp(
            dragStartRef.current.startPanY + deltaPercentY / maxOffsetPercentY,
            -1,
            1
          )
        : 0;

    setPanX(nextX);
    setPanY(nextY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => clamp(Number((z + delta).toFixed(2)), 1, 3));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      setIsDragging(false);
      dragStartRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = {
        dist: Math.hypot(dx, dy),
        startZoom: zoom,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / Math.max(1, pinchStartDistRef.current.dist);
      setZoom(clamp(Number((pinchStartDistRef.current.startZoom * ratio).toFixed(2)), 1, 3));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const generateCroppedFile = useCallback(async (): Promise<File> => {
    const img = imgRef.current;
    if (!img) {
      throw new Error('Imagen no cargada');
    }

    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    // Determine source crop rectangle (sx, sy, sw, sh) in natural image pixels
    // Visible fraction of image width = 1 / totalScaleX
    // Visible fraction of image height = 1 / totalScaleY
    const sw = natW / totalScaleX;
    const sh = natH / totalScaleY;

    const maxShiftX = (natW - sw) / 2;
    const maxShiftY = (natH - sh) / 2;

    // Note: dragging image RIGHT (positive panX) means showing the LEFT side of the image (smaller sx)
    const sx = clamp(maxShiftX - panX * maxShiftX, 0, natW - sw);
    const sy = clamp(maxShiftY - panY * maxShiftY, 0, natH - sh);

    // Output high-resolution dimensions (max 2200px on longest side)
    const maxDim = 2200;
    let outW = Math.round(sw);
    let outH = Math.round(sh);

    if (outW > maxDim || outH > maxDim) {
      if (outW >= outH) {
        outH = Math.round((outH / outW) * maxDim);
        outW = maxDim;
      } else {
        outW = Math.round((outW / outH) * maxDim);
        outH = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    return new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo generar el recorte'));
            return;
          }
          const cleanName =
            currentItem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'photo';
          const file = new File([blob], `${cleanName}.jpg`, {
            type: 'image/jpeg',
          });
          resolve(file);
        },
        'image/jpeg',
        0.95
      );
    });
  }, [currentItem, panX, panY, totalScaleX, totalScaleY]);

  const handleConfirmCurrent = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const croppedFile = await generateCroppedFile();
      const newEntry = {
        existingPhotoId: currentItem.id,
        croppedFile,
        title: currentItem.title,
        category: currentItem.category,
        aspectRatioId: selectedPresetId,
      };
      const updated = [...completedResults, newEntry];

      if (currentIndex < items.length - 1) {
        setCompletedResults(updated);
        setCurrentIndex((i) => i + 1);
      } else {
        onComplete(updated);
      }
    } catch (err) {
      console.error('Crop error:', err);
      alert('Error al recortar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentItem) return null;

  // Compute preview stage dimensions so the frame fits comfortably on mobile & desktop screens
  const maxStageHeight = 420;
  const maxStageWidth = 340;
  let frameW = maxStageWidth;
  let frameH = frameW / targetRatio;
  if (frameH > maxStageHeight) {
    frameH = maxStageHeight;
    frameW = frameH * targetRatio;
  }

  const translateXPercent = panX * maxOffsetPercentX;
  const translateYPercent = panY * maxOffsetPercentY;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl border border-neutral-200 shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-4 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#111111]">
              Encuadrar Fotografía{' '}
              {items.length > 1 ? `(${currentIndex + 1} de ${items.length})` : ''}
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
              <Move className="w-3 h-3" />
              <span>Elige el formato y arrastra la foto con el dedo o ratón</span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-neutral-400 hover:text-[#111111]"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Instagram-Style Crop Stage */}
        <div className="bg-[#141414] py-5 px-3 flex flex-col items-center justify-center select-none">
          <div
            ref={frameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              width: `${Math.round(frameW)}px`,
              height: `${Math.round(frameH)}px`,
              touchAction: 'none',
            }}
            className="relative overflow-hidden bg-neutral-900 cursor-grab active:cursor-grabbing ring-1 ring-white/40 shadow-lg"
          >
            {/* Transformable Image Container */}
            <div
              style={{
                width: `${totalScaleX * 100}%`,
                height: `${totalScaleY * 100}%`,
                left: `${50 - (totalScaleX * 100) / 2 + translateXPercent}%`,
                top: `${50 - (totalScaleY * 100) / 2 + translateYPercent}%`,
              }}
              className="absolute pointer-events-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentItem.srcUrl}
                alt={currentItem.title}
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                draggable={false}
                className="w-full h-full object-fill block select-none"
              />
            </div>

            {/* Instagram 3x3 Rule-of-Thirds Grid Overlay */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
                isDragging ? 'opacity-90' : 'opacity-35'
              }`}
            >
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/50" />
                <div className="border-r border-b border-white/50" />
                <div className="border-b border-white/50" />
                <div className="border-r border-b border-white/50" />
                <div className="border-r border-b border-white/50" />
                <div className="border-b border-white/50" />
                <div className="border-r border-white/50" />
                <div className="border-r border-white/50" />
                <div />
              </div>
            </div>

            {/* Active Aspect Ratio Pill */}
            <div className="absolute bottom-2.5 left-2.5 bg-black/70 text-white text-[10px] tracking-widest uppercase px-2 py-0.5 pointer-events-none">
              {activePreset.label}
            </div>
          </div>

          {/* Zoom Slider & Reset Bar */}
          <div className="mt-4 w-full max-w-xs flex items-center gap-3 text-white">
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(Number((z - 0.15).toFixed(2)), 1, 3))}
              className="p-1.5 text-neutral-300 hover:text-white"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-white h-1 bg-neutral-700 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(Number((z + 0.15).toFixed(2)), 1, 3))}
              className="p-1.5 text-neutral-300 hover:text-white"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="p-1.5 text-neutral-300 hover:text-white border-l border-neutral-700 pl-2.5 text-[10px] uppercase tracking-wider flex items-center gap-1"
              title="Centrar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Aspect Ratio Selector Bar (3:4, 4:5, 2:3, 9:16, 1:1, 16:9, Original) */}
        <div className="p-4 bg-[#FAFAFA] border-t border-neutral-200 space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.18em] uppercase text-neutral-500 mb-2 font-medium">
              Formato de Encuadre (Proporción)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {ASPECT_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setPanX(0);
                      setPanY(0);
                    }}
                    className={`py-2 px-1.5 border text-center transition-colors ${
                      isSelected
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-neutral-200 hover:border-[#111111]'
                    }`}
                  >
                    <div className="text-xs font-semibold tracking-wider">
                      {preset.label}
                    </div>
                    <div
                      className={`text-[9px] truncate mt-0.5 ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-400'
                      }`}
                    >
                      {preset.sublabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2.5 border border-neutral-300 text-xs tracking-[0.16em] uppercase text-neutral-600 hover:border-[#111111] hover:text-[#111111]"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmCurrent}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 bg-[#111111] text-white px-6 py-2.5 text-xs tracking-[0.18em] uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Procesando...</span>
              ) : currentIndex < items.length - 1 ? (
                <>
                  <span>Siguiente Foto ({currentIndex + 1}/{items.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {currentItem.id ? 'Aplicar Encuadre' : 'Confirmar y Subir'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
