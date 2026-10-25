'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioData, PhotoItem } from '@/types/portfolio';
import { generateCompCardPdf } from '@/lib/compCardPdf';
import PhotoCropModal, { CropQueueItem } from '@/components/PhotoCropModal';
import {
  Upload,
  Save,
  Eye,
  EyeOff,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Download,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Camera,
  Ruler,
  FileText,
  LogOut,
  Crop,
  Video,
  Loader2,
} from 'lucide-react';

interface PortalViewProps {
  initialData: PortfolioData;
}

export default function PortalView({ initialData }: PortalViewProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [data, setData] = useState<PortfolioData>(initialData);
  const [activeTab, setActiveTab] = useState<'book' | 'digitals' | 'stats' | 'compcard'>('book');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cropQueue, setCropQueue] = useState<CropQueueItem[] | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    const savedPass = sessionStorage.getItem('carla_portal_pw') || '';
    if (savedPass) setPassword(savedPass);
    if (document.cookie.includes('carla_portal_auth=authenticated')) {
      setAuthenticated(true);
    }
    // Always fetch latest un-cached portfolio JSON on mount
    fetch(`/api/portfolio?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((fresh) => {
        if (fresh && fresh.profile && Array.isArray(fresh.photos)) {
          setData(fresh);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem('carla_portal_pw', password);
        setAuthenticated(true);
      } else {
        setAuthError('Contraseña incorrecta');
      }
    } catch {
      setAuthError('Error al conectar con el servidor');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    sessionStorage.removeItem('carla_portal_pw');
    setAuthenticated(false);
    setPassword('');
  };

  const persistPortfolioData = useCallback(
    async (payloadToSave: PortfolioData, customSuccessMsg?: string) => {
      setIsSaving(true);
      try {
        const res = await fetch('/api/portfolio', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(password ? { 'x-portal-password': password } : {}),
          },
          body: JSON.stringify(payloadToSave),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Error guardando cambios');
        }
        setHasUnsavedChanges(false);
        setStatusBanner({
          type: 'success',
          text:
            customSuccessMsg ||
            (result.savedGitHub
              ? '¡Cambios guardados y publicados en directo!'
              : '¡Cambios guardados correctamente!'),
        });
      } catch (err: unknown) {
        setStatusBanner({
          type: 'error',
          text: err instanceof Error ? err.message : 'Error al guardar en el servidor',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [password]
  );

  const updateData = (updater: (prev: PortfolioData) => PortfolioData) => {
    setData((prev) => updater(prev));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setStatusBanner({
      type: 'info',
      text: 'Guardando y publicando cambios...',
    });
    await persistPortfolioData(data);
  };

  // Step 1 when selecting files: open the Instagram-style Crop & Frame Modal
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'book' | 'digitals'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const queue: CropQueueItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      queue.push({
        file,
        srcUrl: objectUrl,
        title:
          category === 'digitals'
            ? `Digital ${Date.now().toString().slice(-4)}`
            : file.name.replace(/\.[^/.]+$/, ''),
        category,
      });
    }

    setCropQueue(queue);
    e.target.value = '';
  };

  // Open Crop & Frame Modal for an existing photo
  const handleReframeExisting = (photo: PhotoItem) => {
    setCropQueue([
      {
        id: photo.id,
        srcUrl: photo.jpgSrc || photo.src,
        title: photo.title,
        category: photo.category,
      },
    ]);
  };

  // Step 2: Upload the framed/cropped files returned by PhotoCropModal AND auto-publish immediately!
  const handleCropComplete = async (
    results: {
      existingPhotoId?: string;
      croppedFile: File;
      title: string;
      category: 'book' | 'digitals';
      aspectRatioId: string;
    }[]
  ) => {
    if (cropQueue) {
      cropQueue.forEach((item) => {
        if (item.srcUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.srcUrl);
        }
      });
    }
    setCropQueue(null);

    setIsUploading(true);
    setStatusBanner({
      type: 'info',
      text: `Subiendo y publicando ${results.length} foto(s)... Espera unos segundos.`,
    });

    try {
      const newlyAdded: PhotoItem[] = [];
      const updatedMap = new Map<string, PhotoItem>();

      for (const item of results) {
        const formData = new FormData();
        formData.append('file', item.croppedFile);
        formData.append('category', item.category);
        formData.append('title', item.title);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: password ? { 'x-portal-password': password } : undefined,
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Error subiendo imagen');
        }

        if (item.existingPhotoId) {
          updatedMap.set(item.existingPhotoId, json.photo);
        } else {
          newlyAdded.push(json.photo);
        }
      }

      // Compute next state and immediately save to GitHub so Carla doesn't have to press Save twice
      let updatedPhotos = data.photos.map((p) => {
        const replacement = updatedMap.get(p.id);
        if (!replacement) return p;
        return {
          ...p,
          src: replacement.src,
          jpgSrc: replacement.jpgSrc,
          width: replacement.width,
          height: replacement.height,
          aspectRatio: replacement.aspectRatio,
          span: replacement.aspectRatio === 'landscape' ? 'wide' : p.span,
        };
      });

      if (newlyAdded.length > 0) {
        const cat = newlyAdded[0].category;
        const existingCat = updatedPhotos.filter((p) => p.category === cat);
        const maxOrder = existingCat.reduce((max, p) => Math.max(max, p.order), 0);
        const numbered = newlyAdded.map((p, idx) => ({
          ...p,
          order: maxOrder + idx + 1,
        }));
        updatedPhotos = [...updatedPhotos, ...numbered];
      }

      const nextData: PortfolioData = {
        ...data,
        photos: updatedPhotos,
      };

      setData(nextData);
      await persistPortfolioData(
        nextData,
        '¡Foto subida, encuadrada y publicada directamente en la web!'
      );
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al subir la foto',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    if (cropQueue) {
      cropQueue.forEach((item) => {
        if (item.srcUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.srcUrl);
        }
      });
    }
    setCropQueue(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setStatusBanner({
      type: 'info',
      text: `Subiendo y publicando vídeo "${file.name}" (${(file.size / (1024 * 1024)).toFixed(
        1
      )} MB)...`,
    });

    try {
      const cfgRes = await fetch('/api/upload-video', {
        headers: password ? { 'x-portal-password': password } : undefined,
      });
      if (!cfgRes.ok) {
        throw new Error('No autorizado para subir vídeo');
      }
      const cfg = await cfgRes.json();

      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const safeExt = ['mp4', 'mov', 'webm', 'm4v'].includes(ext) ? ext : 'mp4';
      const filename = `digital-video-${Date.now()}.${safeExt}`;

      let videoUrl = `/photos/${filename}`;

      if (cfg.token) {
        const base64Content = await fileToBase64(file);
        const repoPath = `public/photos/${filename}`;
        const ghRes = await fetch(
          `https://api.github.com/repos/${cfg.repo}/contents/${repoPath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${cfg.token}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Upload digital video ${filename} via Portal`,
              content: base64Content,
              branch: cfg.branch || 'main',
            }),
          }
        );

        if (!ghRes.ok) {
          const errText = await ghRes.text();
          throw new Error(`Error subiendo vídeo a GitHub (${ghRes.status}): ${errText}`);
        }

        if (cfg.isVercel) {
          videoUrl = `https://raw.githubusercontent.com/${cfg.repo}/${
            cfg.branch || 'main'
          }/${repoPath}`;
        }
      }

      if (!cfg.isVercel) {
        const formData = new FormData();
        formData.append('file', file);
        const localRes = await fetch('/api/upload-video', {
          method: 'POST',
          headers: password ? { 'x-portal-password': password } : undefined,
          body: formData,
        });
        if (localRes.ok) {
          const localJson = await localRes.json();
          videoUrl = localJson.url;
        }
      }

      const nextData: PortfolioData = {
        ...data,
        digitalVideo: {
          src: videoUrl,
          visible: true,
          title: data.digitalVideo?.title || '360° Natural Light Digitals',
        },
      };

      setData(nextData);
      await persistPortfolioData(
        nextData,
        '¡Vídeo subido y publicado directamente en la web!'
      );
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al subir el vídeo',
      });
    } finally {
      setIsUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar este vídeo del portfolio?')) return;
    const nextData: PortfolioData = {
      ...data,
      digitalVideo: {
        ...data.digitalVideo,
        src: '',
        visible: false,
      },
    };
    setData(nextData);
    await persistPortfolioData(nextData, '¡Vídeo eliminado de la web!');
  };

  const movePhoto = (photoId: string, direction: 'up' | 'down') => {
    updateData((prev) => {
      const target = prev.photos.find((p) => p.id === photoId);
      if (!target) return prev;
      const catPhotos = prev.photos
        .filter((p) => p.category === target.category)
        .sort((a, b) => a.order - b.order);
      const idx = catPhotos.findIndex((p) => p.id === photoId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= catPhotos.length) return prev;

      const reordered = [...catPhotos];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);

      const orderMap = new Map<string, number>();
      reordered.forEach((item, i) => orderMap.set(item.id, i + 1));

      return {
        ...prev,
        photos: prev.photos.map((p) =>
          orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id)! } : p
        ),
      };
    });
  };

  const togglePhotoField = (photoId: string, field: 'visible' | 'blackAndWhite') => {
    updateData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, [field]: !p[field] } : p)),
    }));
  };

  const togglePhotoSpan = (photoId: string) => {
    updateData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === photoId ? { ...p, span: p.span === 'wide' ? 'normal' : 'wide' } : p
      ),
    }));
  };

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta foto del portfolio?')) return;
    const nextData: PortfolioData = {
      ...data,
      photos: data.photos.filter((p) => p.id !== photoId),
    };
    setData(nextData);
    await persistPortfolioData(nextData, '¡Foto eliminada y web actualizada!');
  };

  const toggleCompCardBackPhoto = (photoId: string) => {
    updateData((prev) => {
      const current = prev.compCard.backPhotoIds;
      let next: string[];
      if (current.includes(photoId)) {
        next = current.filter((id) => id !== photoId);
      } else {
        if (current.length >= 4) {
          next = [...current.slice(1), photoId];
        } else {
          next = [...current, photoId];
        }
      }
      return {
        ...prev,
        compCard: {
          ...prev.compCard,
          backPhotoIds: next,
        },
      };
    });
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-neutral-200 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-10 h-10 bg-[#111111] text-white flex items-center justify-center mx-auto mb-4">
              <Lock className="w-4 h-4" />
            </div>
            <h1 className="font-serif text-2xl tracking-[0.14em] uppercase text-[#111111]">
              CARLA FERNÁNDEZ
            </h1>
            <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mt-1">
              Portal de Gestión · Management Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] tracking-[0.16em] uppercase text-neutral-500 mb-2">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-neutral-300 px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#111111]"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{authError}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#111111] text-white py-3.5 text-xs tracking-[0.2em] uppercase font-medium hover:bg-neutral-800 transition-colors"
            >
              Entrar al Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  const bookPhotos = data.photos
    .filter((p) => p.category === 'book')
    .sort((a, b) => a.order - b.order);

  const digitalPhotos = data.photos
    .filter((p) => p.category === 'digitals')
    .sort((a, b) => a.order - b.order);

  const activeBookCount = bookPhotos.filter((p) => p.visible).length;
  const activeDigitalsCount = digitalPhotos.filter((p) => p.visible).length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] pb-28">
      {/* Instagram-style Photo Crop & Frame Modal */}
      {cropQueue && cropQueue.length > 0 && (
        <PhotoCropModal
          items={cropQueue}
          onCancel={handleCropCancel}
          onComplete={handleCropComplete}
        />
      )}

      {/* Full-Screen Mobile Progress Overlay during Photo/Video Upload */}
      {(isUploading || isUploadingVideo) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-6 max-w-sm w-full text-center space-y-3 border border-neutral-200 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#111111]" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#111111]">
              Subiendo y Publicando...
            </h3>
            <p className="text-xs text-neutral-500">
              Optimizando archivo en alta resolución y guardándolo en la web. No cierres esta
              pestaña.
            </p>
          </div>
        </div>
      )}

      {/* Floating Bottom Toast Notification (Always visible on mobile regardless of scroll position) */}
      {statusBanner && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 shadow-xl">
          <div
            className={`p-4 border flex items-center justify-between text-xs tracking-wide shadow-lg ${
              statusBanner.type === 'success'
                ? 'bg-emerald-950 border-emerald-700 text-white'
                : statusBanner.type === 'error'
                ? 'bg-red-950 border-red-700 text-white'
                : 'bg-[#111111] border-neutral-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : statusBanner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-300 shrink-0" />
              )}
              <span>{statusBanner.text}</span>
            </div>
            <button
              onClick={() => setStatusBanner(null)}
              className="text-[10px] uppercase tracking-widest underline ml-4 text-neutral-300 hover:text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Top Sticky Admin Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-serif text-base sm:text-xl tracking-[0.12em] uppercase truncate">
              PORTAL · CARLA
            </span>
            {hasUnsavedChanges && (
              <span className="bg-amber-100 text-amber-900 text-[9px] sm:text-[10px] tracking-wider uppercase px-2 py-0.5 font-medium shrink-0">
                Sin guardar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://portfolio.carlafernandezoliva.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-neutral-300 px-2.5 sm:px-3 py-2 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase hover:border-[#111111] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Web Pública</span>
            </a>

            <button
              onClick={handleSave}
              disabled={isSaving || isUploading || isUploadingVideo}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-medium transition-colors ${
                hasUnsavedChanges
                  ? 'bg-amber-500 text-black hover:bg-amber-400 font-semibold'
                  : 'bg-[#111111] text-white hover:bg-neutral-800'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>

            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 text-neutral-400 hover:text-[#111111]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-3 sm:px-8 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 bg-white p-1.5 border border-neutral-200">
          <button
            onClick={() => setActiveTab('book')}
            className={`flex items-center justify-center gap-2 py-3 px-2 text-[11px] sm:text-xs tracking-[0.12em] uppercase font-medium transition-colors ${
              activeTab === 'book'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>1. Book ({activeBookCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('digitals')}
            className={`flex items-center justify-center gap-2 py-3 px-2 text-[11px] sm:text-xs tracking-[0.12em] uppercase font-medium transition-colors ${
              activeTab === 'digitals'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>2. Digitals ({activeDigitalsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center justify-center gap-2 py-3 px-2 text-[11px] sm:text-xs tracking-[0.12em] uppercase font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 shrink-0" />
            <span>3. Medidas</span>
          </button>

          <button
            onClick={() => setActiveTab('compcard')}
            className={`flex items-center justify-center gap-2 py-3 px-2 text-[11px] sm:text-xs tracking-[0.12em] uppercase font-medium transition-colors ${
              activeTab === 'compcard'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>4. Comp Card</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-8 pt-6">
        {/* TAB 1: BOOK / GALERÍA PRINCIPAL */}
        {activeTab === 'book' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Galería Principal (Book) y Foto de Portada
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Al subir una foto podrás elegir el formato (<strong>3:4, 4:5, 9:16, 2:3</strong>,
                  etc.), encuadrarla con el dedo y se publicará automáticamente.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3.5 text-xs tracking-[0.16em] uppercase font-medium hover:bg-neutral-800 transition-colors shrink-0">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Subiendo...' : 'Subir Fotos al Book'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => handleFileSelect(e, 'book')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {bookPhotos.map((photo, idx) => {
                const isHero = data.heroPhotoId === photo.id;
                return (
                  <div
                    key={photo.id}
                    className={`bg-white border transition-all ${
                      isHero ? 'border-[#111111] ring-1 ring-[#111111]' : 'border-neutral-200'
                    } ${!photo.visible ? 'opacity-50' : ''}`}
                  >
                    <div className="relative bg-neutral-100 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt={photo.title}
                        className={`w-full h-auto max-h-[440px] object-contain block ${
                          photo.blackAndWhite ? 'grayscale contrast-[1.05]' : ''
                        }`}
                      />

                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="bg-black/80 text-white text-[10px] tracking-widest uppercase px-2 py-1">
                          #{idx + 1}
                        </span>
                        {isHero && (
                          <span className="bg-amber-400 text-black text-[10px] tracking-widest uppercase px-2.5 py-1 font-semibold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-black" /> PORTADA (HERO)
                          </span>
                        )}
                        {photo.blackAndWhite && (
                          <span className="bg-white/90 text-black text-[10px] tracking-widest uppercase px-2 py-1 font-medium">
                            B&W
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <input
                        type="text"
                        value={photo.title}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            photos: prev.photos.map((p) =>
                              p.id === photo.id ? { ...p, title: e.target.value } : p
                            ),
                          }))
                        }
                        className="w-full text-xs font-medium tracking-wider uppercase border-b border-transparent focus:border-neutral-300 pb-1 focus:outline-none"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-neutral-100">
                        <button
                          onClick={() =>
                            updateData((prev) => ({ ...prev, heroPhotoId: photo.id }))
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border ${
                            isHero
                              ? 'bg-[#111111] text-white border-[#111111]'
                              : 'border-neutral-200 text-neutral-700 hover:border-[#111111]'
                          }`}
                        >
                          <Star className="w-3 h-3" />
                          <span>{isHero ? 'Portada' : 'Hacer Portada'}</span>
                        </button>

                        <button
                          onClick={() => handleReframeExisting(photo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border border-neutral-200 text-neutral-700 hover:border-[#111111]"
                          title="Ajustar encuadre (3:4, 9:16, 4:5...)"
                        >
                          <Crop className="w-3 h-3" />
                          <span>Encuadrar</span>
                        </button>

                        <button
                          onClick={() => togglePhotoField(photo.id, 'blackAndWhite')}
                          className={`inline-flex items-center gap-1 px-2 py-1.5 text-[10px] tracking-wider uppercase border ${
                            photo.blackAndWhite
                              ? 'bg-neutral-800 text-white border-neutral-800'
                              : 'border-neutral-200 text-neutral-700 hover:border-[#111111]'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>B&N</span>
                        </button>

                        <button
                          onClick={() => togglePhotoSpan(photo.id)}
                          className={`px-2 py-1.5 text-[10px] tracking-wider uppercase border ${
                            photo.span === 'wide'
                              ? 'bg-neutral-200 text-black border-neutral-400'
                              : 'border-neutral-200 text-neutral-600'
                          }`}
                        >
                          {photo.span === 'wide' ? '2 Col' : '1 Col'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => movePhoto(photo.id, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 border border-neutral-200 hover:border-[#111111] disabled:opacity-30"
                            title="Subir posición"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => movePhoto(photo.id, 'down')}
                            disabled={idx === bookPhotos.length - 1}
                            className="p-1.5 border border-neutral-200 hover:border-[#111111] disabled:opacity-30"
                            title="Bajar posición"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => togglePhotoField(photo.id, 'visible')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border border-neutral-200 hover:border-[#111111]"
                          >
                            {photo.visible ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Oculta</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => deletePhoto(photo.id)}
                            className="p-1.5 text-red-600 border border-neutral-200 hover:bg-red-50 hover:border-red-300"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DIGITALS / POLAROIDS */}
        {activeTab === 'digitals' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Digitals / Polaroids (Luz Natural · Cero Retoque)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Al subir tus nuevas Digitals podrás encuadrarlas (<strong>3:4, 4:5, 9:16</strong>,
                  etc.) y al pulsar <strong>Confirmar y Publicar</strong> quedarán guardadas en la
                  web automáticamente.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3.5 text-xs tracking-[0.16em] uppercase font-medium hover:bg-neutral-800 transition-colors shrink-0">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Subiendo...' : 'Subir Nuevas Digitals'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => handleFileSelect(e, 'digitals')}
                  className="hidden"
                />
              </label>
            </div>

            {/* Video Digitals Management Card */}
            <div className="bg-white border border-neutral-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Video className="w-4 h-4 text-[#111111]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em]">
                      Vídeo Digital (Movimiento y Proporciones 360°)
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Puedes reemplazar el vídeo por uno nuevo, ocultarlo temporalmente o eliminarlo
                      si no quieres mostrar ningún vídeo.
                    </p>
                  </div>
                </div>

                <label className="cursor-pointer inline-flex items-center justify-center gap-2 border border-[#111111] bg-white text-[#111111] px-4 py-2.5 text-xs tracking-[0.15em] uppercase font-medium hover:bg-[#111111] hover:text-white transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingVideo
                      ? 'Subiendo Vídeo...'
                      : data.digitalVideo?.src
                      ? 'Reemplazar Vídeo'
                      : 'Subir Vídeo Digital'}
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/*"
                    disabled={isUploadingVideo}
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {data.digitalVideo && data.digitalVideo.src ? (
                <div
                  className={`border border-neutral-200 p-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center ${
                    !data.digitalVideo.visible ? 'opacity-50' : ''
                  }`}
                >
                  <div className="md:col-span-4 bg-neutral-900 overflow-hidden max-w-[240px] mx-auto w-full">
                    <video
                      key={data.digitalVideo.src}
                      src={data.digitalVideo.src}
                      controls
                      playsInline
                      muted
                      preload="metadata"
                      className="w-full h-auto max-h-[300px] object-contain block"
                    />
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <div>
                      <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                        Título del Vídeo
                      </label>
                      <input
                        type="text"
                        value={data.digitalVideo.title || ''}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            digitalVideo: {
                              ...prev.digitalVideo,
                              title: e.target.value,
                            },
                          }))
                        }
                        placeholder="360° Natural Light Digitals"
                        className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateData((prev) => ({
                            ...prev,
                            digitalVideo: {
                              ...prev.digitalVideo,
                              visible: !prev.digitalVideo.visible,
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider uppercase font-medium border ${
                          data.digitalVideo.visible
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-[#111111]'
                        }`}
                      >
                        {data.digitalVideo.visible ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Vídeo Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Vídeo Oculto</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteVideo}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider uppercase font-medium text-red-600 border border-neutral-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Vídeo</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-neutral-300 bg-[#FAFAFA] p-6 text-center text-xs text-neutral-500">
                  Actualmente no hay ningún vídeo en la sección de Digitals. Pulsa{' '}
                  <strong>Subir Vídeo Digital</strong> si quieres añadir uno.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              {digitalPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`bg-white border border-neutral-200 ${
                    !photo.visible ? 'opacity-50' : ''
                  }`}
                >
                  <div className="relative bg-neutral-100 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="w-full h-auto max-h-[420px] object-contain block"
                    />
                    <span className="absolute top-3 left-3 bg-black/80 text-white text-[10px] tracking-widest uppercase px-2 py-1">
                      Digital #{idx + 1}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) =>
                        updateData((prev) => ({
                          ...prev,
                          photos: prev.photos.map((p) =>
                            p.id === photo.id ? { ...p, title: e.target.value } : p
                          ),
                        }))
                      }
                      className="w-full text-xs font-medium tracking-wider uppercase border-b border-transparent focus:border-neutral-300 pb-1 focus:outline-none"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                      <button
                        onClick={() => handleReframeExisting(photo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border border-neutral-200 text-neutral-700 hover:border-[#111111]"
                      >
                        <Crop className="w-3 h-3" />
                        <span>Encuadrar</span>
                      </button>

                      <button
                        onClick={() => togglePhotoField(photo.id, 'visible')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border border-neutral-200 hover:border-[#111111]"
                      >
                        {photo.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        <span>{photo.visible ? 'Visible' : 'Oculta'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => movePhoto(photo.id, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 border border-neutral-200 hover:border-[#111111] disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => movePhoto(photo.id, 'down')}
                          disabled={idx === digitalPhotos.length - 1}
                          className="p-1.5 border border-neutral-200 hover:border-[#111111] disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="p-1.5 text-red-600 border border-neutral-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEDIDAS (STATS) Y CONTACTO */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-neutral-200 p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Medidas Oficiales (Sistema Métrico Europeo)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Se actualizan al instante tanto en la portada de la web como en el Comp Card (PDF).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Altura (Height)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.height}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, height: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Pecho (Bust)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.bust}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, bust: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Cintura (Waist)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.waist}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, waist: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Cadera (Hips)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.hips}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, hips: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Calzado (Shoe)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.shoe}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, shoe: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Talla de Ropa (Dress)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.dress}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, dress: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Cabello (Inglés / Internacional)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.hair.en}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: {
                            ...prev.profile.stats,
                            hair: { ...prev.profile.stats.hair, en: e.target.value },
                          },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Cabello (Español)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.hair.es}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: {
                            ...prev.profile.stats,
                            hair: { ...prev.profile.stats.hair, es: e.target.value },
                          },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Ojos (Inglés / Internacional)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.eyes.en}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: {
                            ...prev.profile.stats,
                            eyes: { ...prev.profile.stats.eyes, en: e.target.value },
                          },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Ojos (Español)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.eyes.es}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: {
                            ...prev.profile.stats,
                            eyes: { ...prev.profile.stats.eyes, es: e.target.value },
                          },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Ubicación (Base)
                  </label>
                  <input
                    type="text"
                    value={data.profile.stats.base}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          stats: { ...prev.profile.stats, base: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white border border-neutral-200 p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Datos de Contacto Profesionales
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Por privacidad, nunca se muestra teléfono ni dirección postal en la web pública.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Nombre Artístico (Cabecera)
                  </label>
                  <input
                    type="text"
                    value={data.profile.name}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, name: e.target.value },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Email de Booking / Contacto
                  </label>
                  <input
                    type="email"
                    value={data.profile.contact.email}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          contact: { ...prev.profile.contact, email: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Usuario de Instagram (ej. @carlafernandezoliva)
                  </label>
                  <input
                    type="text"
                    value={data.profile.contact.instagram}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          contact: { ...prev.profile.contact, instagram: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 mb-1.5">
                    Enlace Completo a Instagram
                  </label>
                  <input
                    type="url"
                    value={data.profile.contact.instagramUrl}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          contact: { ...prev.profile.contact, instagramUrl: e.target.value },
                        },
                      }))
                    }
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-base sm:text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMP CARD (PDF) CONFIGURATOR */}
        {activeTab === 'compcard' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Diseño de tu Comp Card (PDF Descargable)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Elige <strong>1 Foto Principal</strong> (grande a la izquierda) y{' '}
                  <strong>4 Fotos Secundarias</strong> (mosaico a la derecha) para el archivo PDF que
                  descargan las agencias y directores de casting.
                </p>
              </div>

              <button
                onClick={() => generateCompCardPdf(data, 'en')}
                className="inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3 text-xs tracking-[0.16em] uppercase font-medium hover:bg-neutral-800 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Probar Descarga PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.photos.map((photo) => {
                const isFront = data.compCard.frontPhotoId === photo.id;
                const backIdx = data.compCard.backPhotoIds.indexOf(photo.id);
                const isBack = backIdx !== -1;

                return (
                  <div
                    key={photo.id}
                    className={`bg-white border p-2 ${
                      isFront
                        ? 'border-[#111111] ring-2 ring-[#111111]'
                        : isBack
                        ? 'border-neutral-800'
                        : 'border-neutral-200'
                    }`}
                  >
                    <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt={photo.title}
                        className={`w-full h-full object-cover ${
                          photo.blackAndWhite ? 'grayscale' : ''
                        }`}
                      />
                      {isFront && (
                        <span className="absolute top-2 left-2 bg-amber-400 text-black text-[9px] font-bold uppercase px-2 py-0.5">
                          Principal
                        </span>
                      )}
                      {isBack && (
                        <span className="absolute top-2 right-2 bg-[#111111] text-white text-[9px] font-bold uppercase px-2 py-0.5">
                          Mosaico #{backIdx + 1}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() =>
                          updateData((prev) => ({
                            ...prev,
                            compCard: { ...prev.compCard, frontPhotoId: photo.id },
                          }))
                        }
                        className={`w-full py-1.5 text-[10px] tracking-wider uppercase border ${
                          isFront
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'border-neutral-200 text-neutral-700 hover:border-[#111111]'
                        }`}
                      >
                        {isFront ? '✓ Foto Principal' : 'Usar Principal'}
                      </button>

                      <button
                        onClick={() => toggleCompCardBackPhoto(photo.id)}
                        className={`w-full py-1.5 text-[10px] tracking-wider uppercase border ${
                          isBack
                            ? 'bg-neutral-800 text-white border-neutral-800'
                            : 'border-neutral-200 text-neutral-600 hover:border-[#111111]'
                        }`}
                      >
                        {isBack ? `✓ Secundaria #${backIdx + 1}` : '+ Secundaria'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
