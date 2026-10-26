'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioData, PhotoItem } from '@/types/portfolio';
import { generateCompCardPdf } from '@/lib/compCardPdf';
import EditorialVideoPlayer from '@/components/EditorialVideoPlayer';
import {
  Download,
  Instagram,
  Mail,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

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
    .filter((p) => p.category === 'book' && p.id !== heroPhoto?.id)
    .sort((a, b) => a.order - b.order);

  const digitalPhotos = visiblePhotos
    .filter((p) => p.category === 'digitals' && p.id !== heroPhoto?.id)
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

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  const bwhCompact = `${stats.bust.replace(' cm', '')} - ${stats.waist.replace(' cm', '')} - ${stats.hips}`;

  const measurementsList = [
    { label: t.height, value: stats.height },
    { label: t.bustWaistHips, value: bwhCompact },
    { label: t.shoe, value: stats.shoe },
    { label: t.dress, value: stats.dress },
    { label: t.hair, value: lang === 'en' ? stats.hair.en : stats.hair.es },
    { label: t.eyes, value: lang === 'en' ? stats.eyes.en : stats.eyes.es },
    { label: t.base, value: stats.base },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* Fixed Minimalist Navigation Bar — Optimized for Mobile Instagram WebView & Desktop */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-12">
          {/* Top Row: Editorial Serif Name + Language & Desktop Links */}
          <div className="h-12 sm:h-16 flex items-center justify-between">
            <a
              href="#top"
              className="font-serif text-[17px] sm:text-2xl tracking-[0.12em] sm:tracking-[0.14em] uppercase font-normal text-[#111111] truncate"
            >
              {profile.name}
            </a>

            <div className="flex items-center gap-5 sm:gap-8">
              {/* Desktop 3-Anchor Menu */}
              <nav className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] uppercase font-medium text-[#111111]">
                <a href="#portfolio" className="hover:opacity-60 transition-opacity py-1">
                  {t.portfolio}
                </a>
                <a href="#digitals" className="hover:opacity-60 transition-opacity py-1">
                  {t.digitals}
                </a>
                <a href="#contact" className="hover:opacity-60 transition-opacity py-1">
                  {t.contact}
                </a>
                <button
                  onClick={handleDownloadCompCard}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 border border-[#111111] px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase hover:bg-[#111111] hover:text-white transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  <span>{isGeneratingPdf ? t.generatingPdf : t.compCard}</span>
                </button>
              </nav>

              {/* Language Switcher (EN / ES) */}
              <div className="flex items-center gap-1.5 text-[11px] tracking-widest text-neutral-400">
                <button
                  onClick={() => setLang('en')}
                  className={`px-1 py-1 ${
                    lang === 'en' ? 'text-[#111111] font-semibold' : 'hover:text-[#111111]'
                  }`}
                  aria-label="English"
                >
                  EN
                </button>
                <span>/</span>
                <button
                  onClick={() => setLang('es')}
                  className={`px-1 py-1 ${
                    lang === 'es' ? 'text-[#111111] font-semibold' : 'hover:text-[#111111]'
                  }`}
                  aria-label="Español"
                >
                  ES
                </button>
              </div>
            </div>
          </div>

          {/* Mobile 3-Anchor Bar (Portfolio | Digitals | Contact | PDF) — Thumb-friendly for Instagram WebView */}
          <nav className="flex md:hidden items-center justify-between border-t border-neutral-100 h-9 text-[10px] tracking-[0.18em] uppercase font-medium text-[#111111]">
            <a href="#portfolio" className="py-2 pr-2 active:opacity-60">
              {t.portfolio}
            </a>
            <a href="#digitals" className="py-2 px-2 active:opacity-60">
              {t.digitals}
            </a>
            <a href="#contact" className="py-2 px-2 active:opacity-60">
              {t.contact}
            </a>
            <button
              onClick={handleDownloadCompCard}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1 py-1 px-2 bg-[#111111] text-white text-[9px] tracking-[0.16em] uppercase"
            >
              <Download className="w-2.5 h-2.5" />
              <span>PDF</span>
            </button>
          </nav>
        </div>
      </header>

      {/* SECTION 1: HERO + IMMEDIATE STATS (< 3 SECONDS RULE ON MOBILE & DESKTOP) */}
      <section
        id="top"
        className="max-w-[1440px] mx-auto px-2 sm:px-8 lg:px-12 pt-2 pb-8 sm:py-10 lg:py-14"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 lg:gap-12 items-center">
          {/* Hero Portrait — Sized on mobile (54dvh) so Face + Stats are BOTH visible immediately without scrolling in Instagram WebView */}
          <div className="lg:col-span-7 w-full">
            {heroPhoto && (
              <div
                onClick={() => openLightbox([heroPhoto, ...bookPhotos], 0)}
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
                  className={`w-full max-h-[54dvh] sm:max-h-[75vh] lg:max-h-[84vh] object-contain mx-auto block ${
                    heroPhoto.blackAndWhite ? 'grayscale contrast-[1.04]' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {/* Right / Bottom: Model Name + Technical Measurements */}
          <div className="lg:col-span-5 flex flex-col justify-center px-1 sm:px-0">
            {/* Desktop Editorial Heading */}
            <h1 className="hidden sm:block font-serif text-4xl lg:text-[52px] leading-[1.08] tracking-[0.08em] uppercase font-normal text-[#111111] mb-8">
              {profile.firstName}
              <span className="block text-3xl lg:text-[40px] mt-1 tracking-[0.12em]">
                {profile.lastName}
              </span>
            </h1>

            {/* Mobile Ultra-Scannable 3-Second Stats Grid (Visible immediately under Hero photo on mobile) */}
            <div className="grid grid-cols-4 sm:hidden gap-y-2.5 gap-x-2 border-y border-neutral-200 py-3 text-center">
              <div>
                <span className="block text-[9px] tracking-[0.14em] uppercase text-neutral-400">
                  {t.height}
                </span>
                <span className="text-xs font-medium uppercase text-[#111111]">
                  {stats.height}
                </span>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.14em] uppercase text-neutral-400">
                  B - W - H
                </span>
                <span className="text-xs font-medium uppercase text-[#111111]">
                  {bwhCompact.replace(' cm', '')}
                </span>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.14em] uppercase text-neutral-400">
                  {t.shoe}
                </span>
                <span className="text-xs font-medium uppercase text-[#111111]">
                  {stats.shoe}
                </span>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.14em] uppercase text-neutral-400">
                  {t.dress}
                </span>
                <span className="text-xs font-medium uppercase text-[#111111]">
                  {stats.dress}
                </span>
              </div>
              <div className="col-span-2 border-t border-neutral-100 pt-2">
                <span className="text-[9px] tracking-[0.14em] uppercase text-neutral-400 mr-1.5">
                  {t.hair}:
                </span>
                <span className="text-[11px] font-medium uppercase text-[#111111]">
                  {lang === 'en' ? stats.hair.en : stats.hair.es}
                </span>
              </div>
              <div className="col-span-2 border-t border-neutral-100 pt-2">
                <span className="text-[9px] tracking-[0.14em] uppercase text-neutral-400 mr-1.5">
                  {t.eyes}:
                </span>
                <span className="text-[11px] font-medium uppercase text-[#111111]">
                  {lang === 'en' ? stats.eyes.en : stats.eyes.es}
                </span>
              </div>
            </div>

            {/* Desktop Technical Measurements Table (Metric System) */}
            <div className="hidden sm:block border-t border-neutral-200 divide-y divide-neutral-200 text-sm">
              {measurementsList.map((item) => (
                <div
                  key={item.label}
                  className="py-3 flex items-center justify-between tracking-[0.12em]"
                >
                  <span className="uppercase text-neutral-500 text-xs font-normal">
                    {item.label}
                  </span>
                  <span className="font-medium text-[#111111] uppercase text-sm">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Primary Actions for Scouts / Bookers */}
            <div className="mt-4 sm:mt-8 grid grid-cols-2 sm:flex sm:flex-row gap-2.5 sm:gap-3">
              <button
                onClick={handleDownloadCompCard}
                disabled={isGeneratingPdf}
                className="col-span-2 sm:flex-1 inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-4 py-3.5 text-[11px] tracking-[0.18em] uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? t.generatingPdf : t.downloadFullCompCard}</span>
              </button>

              <a
                href="#digitals"
                className="col-span-2 sm:w-auto inline-flex items-center justify-center border border-[#111111] text-[#111111] px-5 py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-[#FAFAFA] transition-colors"
              >
                {t.digitals}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: MAIN GALLERY (BOOK) — 1 Full-Width Column on Mobile (Instagram WebView), 2-3 Columns on Desktop */}
      <section
        id="portfolio"
        className="max-w-[1440px] mx-auto px-2 sm:px-8 lg:px-12 py-8 sm:py-16 border-t border-neutral-100"
      >
        <div className="flex items-baseline justify-between mb-4 sm:mb-10 px-1 sm:px-0">
          <h2 className="text-xs sm:text-sm tracking-[0.25em] uppercase font-medium text-[#111111]">
            {t.portfolio}
          </h2>
          <span className="text-[10px] sm:text-xs tracking-[0.16em] uppercase text-neutral-400">
            {t.bookSubtitle}
          </span>
        </div>

        {/* Mobile: 1 column near-full-bleed for thumb scrolling. Desktop: 2-3 column gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8 lg:gap-10 items-start">
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
                  className={`w-full h-auto block ${
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
        className="bg-[#FAFAFA] border-t border-neutral-200/70 py-10 sm:py-20"
      >
        <div className="max-w-[1440px] mx-auto px-2 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 mb-5 sm:mb-10 px-1 sm:px-0">
            <h2 className="text-xs sm:text-sm tracking-[0.25em] uppercase font-medium text-[#111111]">
              {t.digitals} / Polaroids
            </h2>
            <span className="text-[10px] sm:text-xs tracking-[0.16em] uppercase text-neutral-500">
              {t.digitalsSubtitle}
            </span>
          </div>

          {/* Mobile: 1 full-width column so scouts see natural skin/proportions large; Desktop: 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 items-start">
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
                  className={`w-full h-auto block ${
                    photo.blackAndWhite ? 'grayscale contrast-[1.05]' : ''
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Natural Movement / Walk Video in Digitals Section — Custom Editorial Video Player with Full Pre-Buffer */}
          {digitalVideo && digitalVideo.visible && digitalVideo.src && (
            <div className="mt-8 sm:mt-14 max-w-md mx-auto">
              <div className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 mb-3 text-center font-medium">
                {digitalVideo.title}
              </div>
              <EditorialVideoPlayer
                src={digitalVideo.src}
                title={digitalVideo.title}
              />
            </div>
          )}

          {/* Compact Measurement Reminder Bar inside Digitals for Scouts */}
          <div className="mt-8 sm:mt-10 pt-6 border-t border-neutral-200 flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-2 text-[11px] tracking-[0.15em] uppercase text-neutral-600 px-2">
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
      <footer id="contact" className="bg-white border-t border-neutral-200 py-12 sm:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left Column: Direct Links & Comp Card Download */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8">
              <div>
                <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-400 mb-2">
                  {t.contact}
                </p>
                <h2 className="font-serif text-2xl sm:text-4xl tracking-[0.1em] uppercase font-normal text-[#111111]">
                  {profile.name}
                </h2>
                <p className="text-xs tracking-[0.2em] uppercase text-neutral-500 mt-1.5">
                  {stats.base}
                </p>
              </div>

              <div className="space-y-4 pt-1">
                {/* Direct Email + Copy Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2.5 text-sm sm:text-base tracking-[0.06em] text-[#111111] hover:opacity-60 transition-opacity font-medium break-all"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
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
                    className="inline-flex items-center gap-2.5 text-sm sm:text-base tracking-[0.06em] text-[#111111] hover:opacity-60 transition-opacity"
                  >
                    <Instagram className="w-4 h-4 shrink-0" />
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
              <p className="text-[11px] tracking-[0.22em] uppercase text-neutral-500 mb-4 sm:mb-6">
                {t.directBooking}
              </p>
              <form onSubmit={handleInquirySubmit} className="space-y-3.5 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <input
                    type="text"
                    required
                    placeholder={t.yourName}
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-4 py-3.5 text-base sm:text-xs tracking-[0.06em] text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111] rounded-none"
                  />
                  <input
                    type="text"
                    placeholder={t.agencyOrBrand}
                    value={senderAgency}
                    onChange={(e) => setSenderAgency(e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-4 py-3.5 text-base sm:text-xs tracking-[0.06em] text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111] rounded-none"
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder={t.projectDetails}
                  value={senderMessage}
                  onChange={(e) => setSenderMessage(e.target.value)}
                  className="w-full border border-neutral-300 bg-white px-4 py-3.5 text-base sm:text-xs tracking-[0.06em] text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111] rounded-none"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto border border-[#111111] text-[#111111] px-6 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-[#111111] hover:text-white transition-colors"
                >
                  {t.sendInquiry}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-12 sm:mt-16 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] tracking-[0.2em] uppercase text-neutral-400">
            <span>
              © {new Date().getFullYear()} {profile.name}
            </span>
            <span>{stats.base}</span>
          </div>
        </div>
      </footer>

      {/* High-Res Lightbox Modal with Blurred Frosted Background */}
      {lightboxIndex !== null && lightboxList[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 animate-subtle-fade"
          onClick={closeLightbox}
        >
          {/* Image Counter Pill */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 px-3 py-1.5 bg-white/80 backdrop-blur-md text-[#111111] text-[10px] tracking-[0.22em] uppercase font-medium pointer-events-none">
            {lightboxIndex + 1} / {lightboxList.length}
          </div>

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/80 backdrop-blur-md text-[#111111] flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevLightbox();
            }}
            className="absolute left-2 sm:left-6 w-10 h-10 bg-white/80 backdrop-blur-md text-[#111111] flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxList[lightboxIndex].src}
            alt={lightboxList[lightboxIndex].title}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[90vh] max-w-[90vw] object-contain shadow-2xl ${
              lightboxList[lightboxIndex].blackAndWhite ? 'grayscale contrast-[1.05]' : ''
            }`}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextLightbox();
            }}
            className="absolute right-2 sm:right-6 w-10 h-10 bg-white/80 backdrop-blur-md text-[#111111] flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
