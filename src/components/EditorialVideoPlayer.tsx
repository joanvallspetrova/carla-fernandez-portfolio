'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize2, X, Loader2 } from 'lucide-react';

interface EditorialVideoPlayerProps {
  src: string;
  title?: string;
}

export default function EditorialVideoPlayer({ src, title }: EditorialVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inlinePlaceholderRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);
  const [preloadPercent, setPreloadPercent] = useState<number>(0);
  const [isFullyBuffered, setIsFullyBuffered] = useState(false);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inlineHeight, setInlineHeight] = useState<number | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Pre-fetch the entire video in the background into browser RAM (Blob) so it plays 100% smoothly without mid-stream stalls
  useEffect(() => {
    if (!src) return;
    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();

    setBlobSrc(null);
    setIsFullyBuffered(false);
    setPreloadPercent(0);

    async function prefetchVideo() {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok || !response.body) return;

        const contentLength = Number(response.headers.get('Content-Length')) || 0;
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedLength += value.length;
            if (contentLength > 0 && active) {
              const pct = Math.min(99, Math.round((receivedLength / contentLength) * 100));
              setPreloadPercent(pct);
              setBufferedPercent((prev) => Math.max(prev, pct));
            }
          }
        }

        if (!active) return;
        const rawType = response.headers.get('Content-Type') || 'video/mp4';
        const mimeType = rawType.includes('quicktime') ? 'video/mp4' : rawType;
        const blob = new Blob(chunks as BlobPart[], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);
        setBlobSrc(objectUrl);
        setPreloadPercent(100);
        setBufferedPercent(100);
        setIsFullyBuffered(true);
      } catch {
        // Fallback to native streaming if fetch is aborted or fails
      }
    }

    prefetchVideo();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  // Swap to in-memory blobSrc smoothly when ready, preserving playback state and currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !blobSrc) return;
    const wasPlaying = !video.paused;
    const savedTime = video.currentTime;

    if (video.src !== blobSrc) {
      video.src = blobSrc;
      video.currentTime = savedTime;
      if (wasPlaying) {
        video.play().catch(() => {});
      }
    }
  }, [blobSrc]);

  // Close expanded lightbox view on Escape key and lock body scroll while expanded
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const scheduleHideControls = () => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setShowControls(true);
    hideControlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 2600);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          scheduleHideControls();
        })
        .catch((err) => {
          console.warn('Play interrupted:', err);
        });
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded && inlinePlaceholderRef.current) {
      setInlineHeight(inlinePlaceholderRef.current.offsetHeight);
    }
    setIsExpanded((prev) => !prev);
    scheduleHideControls();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }
    if (!isFullyBuffered && video.buffered.length > 0 && video.duration > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const pct = Math.min(100, Math.round((bufferedEnd / video.duration) * 100));
      setBufferedPercent((prev) => Math.max(prev, pct));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    scheduleHideControls();
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const playProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={inlinePlaceholderRef}
      style={isExpanded && inlineHeight ? { height: `${inlineHeight}px` } : undefined}
      className="w-full"
    >
      {/* Outer wrapper: either inline or floating lightbox modal with blurred background (matching photo lightbox) */}
      <div
        onClick={isExpanded ? () => setIsExpanded(false) : undefined}
        className={
          isExpanded
            ? 'fixed inset-0 z-50 bg-black/45 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 animate-subtle-fade'
            : 'w-full'
        }
      >
        {/* Top-Right Close Button in Fullscreen Lightbox Mode (matches photo lightbox) */}
        {isExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-10 h-10 bg-white/80 backdrop-blur-md text-[#111111] flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Close fullscreen"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Video Player Frame */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          onMouseMove={scheduleHideControls}
          onTouchStart={scheduleHideControls}
          className={
            isExpanded
              ? 'relative w-fit h-fit max-h-[90vh] max-w-[90vw] bg-[#0F0F0F] shadow-2xl overflow-hidden cursor-pointer group select-none flex items-center justify-center'
              : 'relative w-full bg-[#0F0F0F] overflow-hidden cursor-pointer group select-none'
          }
        >
          <video
            ref={videoRef}
            src={blobSrc || src}
            playsInline
            muted={isMuted}
            loop
            preload="auto"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (d && !isNaN(d)) setDuration(d);
            }}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              setShowControls(true);
            }}
            onWaiting={() => setIsWaiting(true)}
            onPlaying={() => setIsWaiting(false)}
            onCanPlay={() => setIsWaiting(false)}
            className={
              isExpanded
                ? 'max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain block'
                : 'w-full h-auto block'
            }
          />

          {/* Top Subtle Status / Preload Indicator */}
          {!isFullyBuffered && preloadPercent > 0 && preloadPercent < 100 && (
            <div className="absolute top-3 right-3 z-20 bg-black/55 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[9px] tracking-[0.2em] uppercase text-white/90 flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>HD {preloadPercent}%</span>
            </div>
          )}

          {/* Center Play / Buffering Glassmorphic Button */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
              !isPlaying || isWaiting ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/35 flex items-center justify-center text-white shadow-2xl transition-transform duration-300 group-hover:scale-105">
              {isWaiting ? (
                <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" />
              ) : (
                <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white translate-x-0.5" />
              )}
            </div>
          </div>

          {/* Bottom Editorial Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 pt-10 pb-3.5 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
              showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Interactive Scrubber / Buffer Bar */}
            <div
              onClick={handleSeek}
              className="w-full py-2 cursor-pointer group/bar"
            >
              <div className="relative w-full h-[3px] group-hover/bar:h-[5px] bg-white/20 overflow-hidden transition-all">
                {/* Buffered Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/40 transition-all duration-300"
                  style={{ width: `${bufferedPercent}%` }}
                />
                {/* Current Playback Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-white transition-all duration-75"
                  style={{ width: `${playProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white mt-1 gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="text-white hover:opacity-75 transition-opacity p-1"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-white hover:opacity-75 transition-opacity p-1"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <span className="text-[10px] tracking-[0.18em] font-mono text-white/85 whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {title && (
                  <span className="hidden sm:inline text-[9px] tracking-[0.2em] uppercase text-white/60 truncate max-w-[160px]">
                    {title}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="text-white hover:opacity-75 transition-opacity p-1"
                  aria-label={isExpanded ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
