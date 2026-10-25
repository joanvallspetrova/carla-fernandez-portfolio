'use client';

import React, { useState } from 'react';
import { PortfolioData, PhotoItem } from '@/types/portfolio';
import { generateCompCardPdf } from '@/lib/compCardPdf';
import { Download, Instagram, Mail, Check, X, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

interface PortfolioViewProps {
  initialData: PortfolioData;
}

export default function PortfolioView({ initialData }: PortfolioViewProps) {
  const [data] = useState<PortfolioData>(initialData);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxList, setLightboxList] = useState<PhotoItem[]>([]);

  // Inquiry form state (zero captcha, direct mailto / quick inquiry)
  const [senderName, setSenderName] = useState('');
  const [senderAgency, setSenderAgency] = useState('');
  const [senderMessage, setSenderMessage] = useState('');

  const { profile, photos, heroPhotoId, digitalVideo } = data;
  const { stats, contact } = profile;

  const visiblePhotos = photos.filter((p) => p.visible);
  const heroPhoto =
    visiblePhotos.find((p) => p.id === heroPhotoId) ||
    visiblePhotos.find((p) => p.category === 'book') ||
    visiblePhotos[0];

  const bookPhotos = visiblePhotos
    .filter((p) => p.category === 'book')
    .sort((a, b) => a.order - b.order);

  const digitalPhotos = visiblePhotos
    .filter((p) => p.category === 'digitals')
    .sort((a, b) => a.order - b.order);

  const handleDownloadCompCard = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await generateCompCardPdf(data, lang);
    } catch (err) {
      console.error('Error generating Comp Card PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contact.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const openLightbox = (list: PhotoItem[], index: number) => {
    setLightboxList(list);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const prevLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + lightboxList.length) % lightboxList.length);
  };

  const nextLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % lightboxList.length);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Booking / Casting Inquiry — ${senderAgency || senderName || 'Portfolio'}`
    );
    const body = encodeURIComponent(
      `${senderMessage}\n\n—\n${senderName}${senderAgency ? ` (${senderAgency})` : ''}`
    );
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  };

  const t = {
    portfolio: lang === 'en' ? 'Portfolio' : 'Portfolio',
    digitals: lang === 'en' ? 'Digitals' : 'Digitals',
    contact: lang === 'en' ? 'Contact' : 'Contacto',
    compCard: lang === 'en' ? 'Comp Card (PDF)' : 'Comp Card (PDF)',
    downloadFullCompCard:
      lang === 'en' ? 'Download Comp Card / Book (PDF)' : 'Descargar Comp Card / Book (PDF)',
    generatingPdf: lang === 'en' ? 'Generating PDF...' : 'Generando PDF...',
    height: lang === 'en' ? 'Height' : 'Altura',
    bustWaistHips: lang === 'en' ? 'Bust - Waist - Hips' : 'Pecho - Cintura - Cadera',
    bust: lang === 'en' ? 'Bust' : 'Pecho',
    waist: lang === 'en' ? 'Waist' : 'Cintura',
    hips: lang === 'en' ? 'Hips' : 'Cadera',
    shoe: lang === 'en' ? 'Shoe' : 'Calzado',
    dress: lang === 'en' ? 'Dress' : 'Talla',
    hair: lang === 'en' ? 'Hair' : 'Cabello',
    eyes: lang === 'en' ? 'Eyes' : 'Ojos',
    base: lang === 'en' ? 'Base' : 'Ubicación',
    digitalsSubtitle:
      lang === 'en'
        ? 'NATURAL DAYLIGHT · NO RETOUCHING · MINIMAL MAKEUP'
        : 'LUZ NATURAL · CERO RETOQUE · AL NATURAL',
    bookSubtitle: lang === 'en' ? 'SELECTED WORK · EDITORIAL & COMMERCIAL' : 'BOOK PRINCIPAL',
    directBooking: lang === 'en' ? 'Direct Booking & Casting' : 'Booking Directo y Casting',
    yourName: lang === 'en' ? 'Name' : 'Nombre',
    agencyOrBrand: lang === 'en' ? 'Agency / Brand / Production' : 'Agencia / Marca / Productora',
    projectDetails:
      lang === 'en'
        ? 'Dates, location & shoot details...'
        : 'Fechas, ubicación y detalles del proyecto...',
    sendInquiry: lang === 'en' ? 'Send Direct Email' : 'Enviar Correo Directo',
    copied: lang === 'en' ? 'Copied' : 'Copiado',
    copy: lang === 'en' ? 'Copy' : 'Copiar',
  };

  const measurementsList = [
    { label: t.height, value: stats.height },
    {
      label: t.bustWaistHips,
      value: `${stats.bust.replace(' cm', '')} - ${stats.waist.replace(' cm', '')} - ${stats.hips}`,
    },
    { label: t.shoe, value: stats.shoe },
    { label: t.dress, value: stats.dress },
    { label: t.hair, value: lang === 'en' ? stats.hair.en : stats.hair.es },
    { label: t.eyes, value: lang === 'en' ? stats.eyes.en : stats.eyes.es },
    { label: t.base, value: stats.base },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* Fixed Minimalist Navigation Bar (3 Anchors: Portfolio | Digitals | Contact) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between">
          <a
            href="#top"
            className="font-serif text-lg sm:text-2xl tracking-[0.14em] uppercase font-normal text-[#111111] truncate pr-2"
          >
            {profile.name}
          </a>

          <nav className="flex items-center gap-4 sm:gap-8 text-[11px] sm:text-xs tracking-[0.2em] uppercase font-medium text-[#111111]">
            <a
              href="#portfolio"
              className="hover:opacity-60 transition-opacity py-1"
            >
              {t.portfolio}
            </a>
            <a
              href="#digitals"
              className="hover:opacity-60 transition-opacity py-1"
            >
              {t.digitals}
            </a>
            <a
              href="#contact"
              className="hover:opacity-60 transition-opacity py-1"
            >
              {t.contact}
            </a>

            <button
              onClick={handleDownloadCompCard}
              disabled={isGeneratingPdf}
              className="hidden md:inline-flex items-center gap-1.5 border border-[#111111] px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase hover:bg-[#111111] hover:text-white transition-colors disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              <span>{isGeneratingPdf ? t.generatingPdf : t.compCard}</span>
            </button>

            {/* International Language Switcher (EN default for agencies / ES) */}
            <div className="flex items-center gap-1 text-[10px] tracking-widest border-l border-neutral-200 pl-3 sm:pl-4 text-neutral-400">
              <button
                onClick={() => setLang('en')}
                className={lang === 'en' ? 'text-[#111111] font-semibold' : 'hover:text-[#111111]'}
                aria-label="English"
              >
                EN
              </button>
              <span>/</span>
              <button
                onClick={() => setLang('es')}
                className={lang === 'es' ? 'text-[#111111] font-semibold' : 'hover:text-[#111111]'}
                aria-label="Español"
              >
                ES
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* SECTION 1: HERO + IMMEDIATE STATS (< 3 SECONDS RULE) */}
      <section
        id="top"
        className="max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-12 pt-3 pb-10 sm:py-10 lg:py-14"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left / Top: High-Impact Hero Portrait (Eager loaded, high priority, zero frames/shadows) */}
          <div className="lg:col-span-7 w-full">
            {heroPhoto && (
              <div
                onClick={() => openLightbox(bookPhotos, 0)}
                className="relative w-full overflow-hidden bg-[#FAFAFA] cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPhoto.src}
                  alt={profile.name}
                  width={heroPhoto.width || 1134}
                  height={heroPhoto.height || 1700}
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  className={`w-full h-auto max-h-[78vh] lg:max-h-[84vh] object-cover object-top block ${
                    heroPhoto.blackAndWhite ? 'grayscale contrast-[1.04]' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {/* Right / Bottom: Model Name + Technical Measurements Table + Comp Card Download */}
          <div className="lg:col-span-5 flex flex-col justify-center px-1 sm:px-0">
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[52px] leading-[1.08] tracking-[0.08em] uppercase font-normal text-[#111111] mb-6 sm:mb-8">
              {profile.firstName}
              <span className="block text-2xl sm:text-4xl lg:text-[40px] mt-1 tracking-[0.12em]">
                {profile.lastName}
              </span>
            </h1>

            {/* Technical Measurements Table (Metric System) */}
            <div className="border-t border-neutral-200 divide-y divide-neutral-200 text-xs sm:text-sm">
              {measurementsList.map((item) => (
                <div
                  key={item.label}
                  className="py-2.5 sm:py-3 flex items-center justify-between tracking-[0.12em]"
                >
                  <span className="uppercase text-neutral-500 text-[11px] sm:text-xs font-normal">
                    {item.label}
                  </span>
                  <span className="font-medium text-[#111111] uppercase text-xs sm:text-sm">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Primary Actions for Scouts / Bookers */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadCompCard}
                disabled={isGeneratingPdf}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? t.generatingPdf : t.downloadFullCompCard}</span>
              </button>

              <a
                href="#digitals"
                className="inline-flex items-center justify-center border border-[#111111] text-[#111111] px-5 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-[#FAFAFA] transition-colors"
              >
                {t.digitals}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: MAIN GALLERY (BOOK) — 1 Column Mobile (Instagram WebView), 2-3 Columns Desktop */}
      <section
        id="portfolio"
        className="max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-12 py-10 sm:py-16 border-t border-neutral-100"
      >
        <div className="flex items-baseline justify-between mb-6 sm:mb-10 px-1 sm:px-0">
          <h2 className="text-xs sm:text-sm tracking-[0.25em] uppercase font-medium text-[#111111]">
            {t.portfolio}
          </h2>
          <span className="text-[10px] sm:text-xs tracking-[0.18em] uppercase text-neutral-400">
            {t.bookSubtitle}
          </span>
        </div>

        {/* Mobile: 1 full-width column for thumb scrolling in Instagram WebView. Desktop: 2-3 column editorial gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 lg:gap-10 items-start">
          {bookPhotos.map((photo, idx) => {
            const isWide = photo.span === 'wide' || photo.aspectRatio === 'landscape';
            return (
              <div
                key={photo.id}
                onClick={() => openLightbox(bookPhotos, idx)}
                className={`w-full overflow-hidden bg-[#FAFAFA] cursor-zoom-in ${
                  isWide ? 'md:col-span-2' : 'col-span-1'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={`${profile.name} — ${photo.title}`}
                  width={photo.width || 1134}
                  height={photo.height || 1700}
                  loading={idx < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`w-full h-auto block transition-opacity duration-300 ${
                    photo.blackAndWhite ? 'grayscale contrast-[1.05]' : ''
                  }`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: DIGITALS / POLAROIDS (Natural Light, Zero Retouching) */}
      <section
        id="digitals"
        className="bg-[#FAFAFA] border-t border-neutral-200/70 py-12 sm:py-20"
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6 sm:mb-10 px-1 sm:px-0">
            <h2 className="text-xs sm:text-sm tracking-[0.25em] uppercase font-medium text-[#111111]">
              {t.digitals} / Polaroids
            </h2>
            <span className="text-[10px] sm:text-xs tracking-[0.18em] uppercase text-neutral-500">
              {t.digitalsSubtitle}
            </span>
          </div>

          {/* 1 column on mobile so bookers see full-size unretouched skin/bone structure; 4 columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {digitalPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => openLightbox(digitalPhotos, idx)}
                className="w-full bg-white overflow-hidden cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={`${profile.name} Digital — ${photo.title}`}
                  width={photo.width || 1536}
                  height={photo.height || 2048}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-auto lg:aspect-[3/4] lg:object-cover block ${
                    photo.blackAndWhite ? 'grayscale contrast-[1.05]' : ''
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Optional Natural Movement / Walk Video in Digitals Section */}
          {digitalVideo && digitalVideo.visible && digitalVideo.src && (
            <div className="mt-8 sm:mt-12 max-w-md mx-auto">
              <div className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3 text-center">
                {digitalVideo.title}
              </div>
              <div className="bg-white overflow-hidden">
                <video
                  src={digitalVideo.src}
                  controls
                  playsInline
                  muted
                  loop
                  preload="metadata"
                  className="w-full h-auto block"
                />
              </div>
            </div>
          )}

          {/* Compact Measurement Reminder Bar inside Digitals for Scouts */}
          <div className="mt-10 pt-6 border-t border-neutral-200 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] tracking-[0.16em] uppercase text-neutral-600">
            <span>
              <strong className="text-[#111111] font-medium">{t.height}:</strong> {stats.height}
            </span>
            <span>
              <strong className="text-[#111111] font-medium">{t.bust}:</strong> {stats.bust}
            </span>
            <span>
              <strong className="text-[#111111] font-medium">{t.waist}:</strong> {stats.waist}
            </span>
            <span>
              <strong className="text-[#111111] font-medium">{t.hips}:</strong> {stats.hips}
            </span>
            <span>
              <strong className="text-[#111111] font-medium">{t.shoe}:</strong> {stats.shoe}
            </span>
            <span>
              <strong className="text-[#111111] font-medium">{t.dress}:</strong> {stats.dress}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: CONTACT & COMP CARD (Privacy-First: Only Email, Instagram, Direct Form & PDF Comp Card) */}
      <footer id="contact" className="bg-white border-t border-neutral-200 py-14 sm:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Direct Links & Comp Card Download */}
            <div className="lg:col-span-6 space-y-8">
              <div>
                <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-400 mb-2">
                  {t.contact}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl tracking-[0.1em] uppercase font-normal text-[#111111]">
                  {profile.name}
                </h2>
                <p className="text-xs tracking-[0.2em] uppercase text-neutral-500 mt-2">
                  {stats.base}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Direct Email + Copy Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2.5 text-sm sm:text-base tracking-[0.08em] text-[#111111] hover:opacity-60 transition-opacity font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{contact.email}</span>
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1 border border-neutral-300 px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase text-neutral-600 hover:border-[#111111] hover:text-[#111111] transition-colors"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <span>{t.copy}</span>
                    )}
                  </button>
                </div>

                {/* Direct Professional Instagram */}
                <div>
                  <a
                    href={contact.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-sm sm:text-base tracking-[0.08em] text-[#111111] hover:opacity-60 transition-opacity"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>{contact.instagram}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                </div>
              </div>

              {/* Star Feature: Comp Card PDF Button */}
              <div className="pt-2">
                <button
                  onClick={handleDownloadCompCard}
                  disabled={isGeneratingPdf}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#111111] text-white px-7 py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? t.generatingPdf : t.downloadFullCompCard}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Clean Frictionless Booking / Casting Form (No Captchas) */}
            <div className="lg:col-span-6">
              <p className="text-[11px] tracking-[0.22em] uppercase text-neutral-500 mb-6">
                {t.directBooking}
              </p>
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder={t.yourName}
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-4 py-3 text-xs tracking-[0.08em] text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111]"
                  />
                  <input
                    type="text"
                    placeholder={t.agencyOrBrand}
                    value={senderAgency}
                    onChange={(e) => setSenderAgency(e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-4 py-3 text-xs tracking-[0.08em] text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder={t.projectDetails}
                  value={senderMessage}
                  onChange={(e) => setSenderMessage(e.target.value)}
                  className="w-full border border-neutral-300 bg-white px-4 py-3 text-xs tracking-[0.08em] text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111]"
                />
                <button
                  type="submit"
                  className="border border-[#111111] text-[#111111] px-6 py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-[#111111] hover:text-white transition-colors"
                >
                  {t.sendInquiry}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] tracking-[0.2em] uppercase text-neutral-400">
            <span>© {new Date().getFullYear()} {profile.name}</span>
            <span>{stats.base}</span>
          </div>
        </div>
      </footer>

      {/* High-Res Lightbox Modal for Desktop Casting Directors */}
      {lightboxIndex !== null && lightboxList[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-white/98 flex items-center justify-center p-2 sm:p-6"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-[#111111] hover:opacity-60"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevLightbox();
            }}
            className="absolute left-2 sm:left-6 p-2 text-[#111111] hover:opacity-60"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxList[lightboxIndex].src}
            alt={lightboxList[lightboxIndex].title}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[92vh] max-w-[92vw] object-contain ${
              lightboxList[lightboxIndex].blackAndWhite ? 'grayscale contrast-[1.05]' : ''
            }`}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextLightbox();
            }}
            className="absolute right-2 sm:right-6 p-2 text-[#111111] hover:opacity-60"
            aria-label="Next image"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
}
