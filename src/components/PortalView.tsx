'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioData, PhotoItem } from '@/types/portfolio';
import { generateCompCardPdf } from '@/lib/compCardPdf';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (document.cookie.includes('carla_portal_auth=authenticated')) {
      setAuthenticated(true);
    }
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
    setAuthenticated(false);
    setPassword('');
  };

  const updateData = (updater: (prev: PortfolioData) => PortfolioData) => {
    setData((prev) => {
      const next = updater(prev);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(password ? { 'x-portal-password': password } : {}),
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Error guardando cambios');
      }
      setHasUnsavedChanges(false);
      setStatusBanner({
        type: 'success',
        text: result.savedGitHub
          ? '¡Cambios guardados y sincronizados en GitHub / Vercel!'
          : '¡Cambios guardados correctamente!',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'book' | 'digitals'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusBanner({
      type: 'info',
      text: `Optimizando y subiendo ${files.length} foto(s) en alta resolución (WebP Retina)...`,
    });

    try {
      const uploadedPhotos: PhotoItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append(
          'title',
          category === 'digitals' ? `Digital ${Date.now().toString().slice(-4)}` : file.name.replace(/\.[^/.]+$/, '')
        );

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: password ? { 'x-portal-password': password } : undefined,
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Error subiendo imagen');
        }
        uploadedPhotos.push(json.photo);
      }

      updateData((prev) => {
        const existingCat = prev.photos.filter((p) => p.category === category);
        const maxOrder = existingCat.reduce((max, p) => Math.max(max, p.order), 0);
        const numbered = uploadedPhotos.map((p, idx) => ({
          ...p,
          order: maxOrder + idx + 1,
        }));
        const nextData = {
          ...prev,
          photos: [...prev.photos, ...numbered],
        };
        return nextData;
      });

      setStatusBanner({
        type: 'success',
        text: `${uploadedPhotos.length} foto(s) añadida(s). Pulsa "Guardar Cambios" arriba para publicarlas.`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al subir archivo',
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
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

  const deletePhoto = (photoId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta foto del portfolio?')) return;
    updateData((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== photoId),
    }));
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
                className="w-full border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-[#111111]"
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
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] pb-20">
      {/* Top Sticky Admin Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-serif text-lg sm:text-xl tracking-[0.12em] uppercase truncate">
              PORTAL · CARLA
            </span>
            {hasUnsavedChanges && (
              <span className="hidden sm:inline-block bg-amber-100 text-amber-900 text-[10px] tracking-wider uppercase px-2.5 py-0.5 font-medium">
                Cambios sin guardar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-neutral-300 px-3 py-2 text-[11px] tracking-[0.14em] uppercase hover:border-[#111111] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Web Pública</span>
            </a>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2 text-[11px] tracking-[0.16em] uppercase font-medium transition-colors ${
                hasUnsavedChanges
                  ? 'bg-[#111111] text-white hover:bg-neutral-800'
                  : 'bg-neutral-800 text-white hover:bg-[#111111]'
              } disabled:opacity-50`}
            >
              <Save className="w-3.5 h-3.5" />
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

      {/* Status Notification Banner */}
      {statusBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
          <div
            className={`p-3.5 border flex items-center justify-between text-xs tracking-wide ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusBanner.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-neutral-100 border-neutral-300 text-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusBanner.text}</span>
            </div>
            <button
              onClick={() => setStatusBanner(null)}
              className="text-[10px] uppercase tracking-widest underline ml-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 border border-neutral-200">
          <button
            onClick={() => setActiveTab('book')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs tracking-[0.14em] uppercase font-medium transition-colors ${
              activeTab === 'book'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>1. Book ({activeBookCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('digitals')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs tracking-[0.14em] uppercase font-medium transition-colors ${
              activeTab === 'digitals'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>2. Digitals ({activeDigitalsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs tracking-[0.14em] uppercase font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>3. Medidas y Contacto</span>
          </button>

          <button
            onClick={() => setActiveTab('compcard')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs tracking-[0.14em] uppercase font-medium transition-colors ${
              activeTab === 'compcard'
                ? 'bg-[#111111] text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>4. Comp Card (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* TAB 1: BOOK / GALERÍA PRINCIPAL */}
        {activeTab === 'book' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Galería Principal (Book) y Foto de Portada
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Regla de oro de las agencias: mantén entre <strong>8 y 15 fotos impecables</strong>.
                  Actualmente tienes <strong>{activeBookCount} visibles</strong>. Pulsa la estrella para
                  elegir tu Foto Principal (Hero).
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3 text-xs tracking-[0.16em] uppercase font-medium hover:bg-neutral-800 transition-colors shrink-0">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Subiendo...' : 'Subir Fotos al Book'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => handleFileUpload(e, 'book')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookPhotos.map((photo, idx) => {
                const isHero = data.heroPhotoId === photo.id;
                return (
                  <div
                    key={photo.id}
                    className={`bg-white border transition-all ${
                      isHero ? 'border-[#111111] ring-1 ring-[#111111]' : 'border-neutral-200'
                    } ${!photo.visible ? 'opacity-50' : ''}`}
                  >
                    <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt={photo.title}
                        className={`w-full h-full object-cover object-top ${
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

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                        {/* Set as Hero */}
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
                          <span>{isHero ? 'Portada Actual' : 'Hacer Portada'}</span>
                        </button>

                        {/* Toggle B&W */}
                        <button
                          onClick={() => togglePhotoField(photo.id, 'blackAndWhite')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border ${
                            photo.blackAndWhite
                              ? 'bg-neutral-800 text-white border-neutral-800'
                              : 'border-neutral-200 text-neutral-700 hover:border-[#111111]'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>B&N</span>
                        </button>

                        {/* Toggle Wide / Normal */}
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
            <div className="bg-white border border-neutral-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em]">
                  Digitals / Polaroids (Luz Natural · Cero Retoque)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Las agencias buscan entre <strong>4 y 6 fotos naturales</strong> (primer plano,
                  perfil, medio cuerpo y cuerpo entero). Aquí puedes subir las nuevas fotos de
                  Tàrrega directamente desde el móvil.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3 text-xs tracking-[0.16em] uppercase font-medium hover:bg-neutral-800 transition-colors shrink-0">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Subiendo...' : 'Subir Nuevas Digitals'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => handleFileUpload(e, 'digitals')}
                  className="hidden"
                />
              </label>
            </div>

            {/* Video Digitals Toggle */}
            <div className="bg-white border border-neutral-200 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Vídeo Digital (Movimiento y Proporciones 360°)
                </span>
                <p className="text-xs text-neutral-500">
                  Mostrar el vídeo corto al final de la sección de Digitals
                </p>
              </div>
              <button
                onClick={() =>
                  updateData((prev) => ({
                    ...prev,
                    digitalVideo: {
                      ...prev.digitalVideo,
                      visible: !prev.digitalVideo.visible,
                    },
                  }))
                }
                className={`px-4 py-2 text-xs tracking-wider uppercase font-medium border ${
                  data.digitalVideo?.visible
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-white text-neutral-600 border-neutral-300'
                }`}
              >
                {data.digitalVideo?.visible ? 'Vídeo Visible' : 'Vídeo Oculto'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {digitalPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`bg-white border border-neutral-200 ${
                    !photo.visible ? 'opacity-50' : ''
                  }`}
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="w-full h-full object-cover"
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

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => togglePhotoField(photo.id, 'visible')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-wider uppercase border border-neutral-200 hover:border-[#111111]"
                        >
                          {photo.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{photo.visible ? 'Visible' : 'Oculta'}</span>
                        </button>
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          className="p-1.5 text-red-600 border border-neutral-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
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
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMP CARD (PDF) CONFIGURATOR */}
        {activeTab === 'compcard' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
