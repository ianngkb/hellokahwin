'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GalleryImage } from './article-renderer';
import { track } from '@/lib/analytics/tracker';

interface PhotoGalleryProps {
  images: GalleryImage[];
  trigger?: React.ReactNode;
}

export function PhotoGallery({ images, trigger }: PhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchActiveRef = useRef(false);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadingRef = useRef(false);
  const preloadedRef = useRef<HTMLImageElement[]>([]);
  const trackedRef = useRef(false);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // F7: Portal needs client-side mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  const navigateTo = useCallback(
    (newIndex: number) => {
      // F5: Use ref as primary guard to prevent stale-closure race
      if (
        newIndex < 0 ||
        newIndex >= images.length ||
        newIndex === currentIndex ||
        fadingRef.current
      )
        return;
      fadingRef.current = true;
      setFading(true);
      // F2: Store timeout in ref so it can be cleared on unmount
      fadeTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(newIndex);
        fadingRef.current = false;
        setFading(false);
        fadeTimeoutRef.current = null;
      }, 150);
    },
    [currentIndex, images.length],
  );

  const prev = useCallback(() => {
    if (hasPrev) navigateTo(currentIndex - 1);
  }, [hasPrev, currentIndex, navigateTo]);

  const next = useCallback(() => {
    if (hasNext) navigateTo(currentIndex + 1);
  }, [hasNext, currentIndex, navigateTo]);

  // Keyboard navigation + F1: Focus trap
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'Tab') {
        // F1: Trap focus within the dialog
        const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable && focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, prev, next]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Focus container on open
  useEffect(() => {
    if (open) {
      containerRef.current?.focus();
    }
  }, [open]);

  // F2: Clear fade timeout on close/unmount
  useEffect(() => {
    if (!open && fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
      fadingRef.current = false;
      setFading(false);
    }
  }, [open]);

  // F8: Preload adjacent images, stored in ref to prevent GC
  useEffect(() => {
    if (!open) {
      preloadedRef.current = [];
      return;
    }
    const imgs: HTMLImageElement[] = [];
    if (currentIndex > 0) {
      const img = new window.Image();
      img.src = images[currentIndex - 1].src;
      imgs.push(img);
    }
    if (currentIndex < images.length - 1) {
      const img = new window.Image();
      img.src = images[currentIndex + 1].src;
      imgs.push(img);
    }
    preloadedRef.current = imgs;
  }, [open, currentIndex, images]);

  // F9: Auto-scroll thumbnail strip, deferred to avoid layout jank
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const thumb = thumbnailRefs.current.get(currentIndex);
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, currentIndex]);

  // Touch swipe + F3: Track touch to suppress click-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchActiveRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    // F3: Reset touchActive after the synthesized click event fires
    setTimeout(() => {
      touchActiveRef.current = false;
    }, 0);
  };

  const handleBackdropClick = () => {
    // F3: Suppress close if this click was synthesized from a touch event
    if (touchActiveRef.current) return;
    setOpen(false);
  };

  const handleOpen = () => {
    setCurrentIndex(0);
    fadingRef.current = false;
    setFading(false);
    setOpen(true);
    if (!trackedRef.current) {
      trackedRef.current = true;
      track('Photo Gallery Opened', { source: 'article', photo_count: images.length });
    }
  };

  if (images.length === 0) return null;

  const dialog = open ? (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo gallery — ${currentIndex + 1} of ${images.length}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="w-10" />
        <span className="text-sm font-medium text-white/80" aria-live="polite">
          {currentIndex + 1} of {images.length}
        </span>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          onClick={() => setOpen(false)}
          aria-label="Close gallery"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {/* Main image area */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4"
        onClick={handleBackdropClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous arrow — desktop only */}
        {hasPrev && (
          <button
            type="button"
            className="absolute left-4 z-10 hidden size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 lg:left-6 lg:inline-flex"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Foto sebelumnya"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex].src}
          alt={`Photo ${currentIndex + 1} of ${images.length}`}
          className={`max-h-[calc(100vh-160px)] max-w-full cursor-default object-contain motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-in-out ${fading ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next arrow — desktop only */}
        {hasNext && (
          <button
            type="button"
            className="absolute right-4 z-10 hidden size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 lg:right-6 lg:inline-flex"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Foto seterusnya"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div
        ref={thumbnailStripRef}
        className="scrollbar-hide flex shrink-0 items-center justify-start gap-1.5 overflow-x-auto px-4 py-2 lg:gap-2 lg:py-3"
      >
        {images.map((image, idx) => (
          <button
            key={idx}
            ref={(el) => {
              if (el) {
                thumbnailRefs.current.set(idx, el);
              } else {
                thumbnailRefs.current.delete(idx);
              }
            }}
            type="button"
            onClick={() => navigateTo(idx)}
            className={`shrink-0 overflow-hidden rounded transition-all ${
              idx === currentIndex ? 'opacity-100 ring-2 ring-white' : 'opacity-50 hover:opacity-80'
            }`}
            aria-label={`Pergi ke foto ${idx + 1}`}
            aria-current={idx === currentIndex ? 'true' : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.thumbnailUrl}
              alt=""
              className="h-[42px] w-14 object-cover lg:h-[54px] lg:w-[72px]"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      {trigger ? (
        <button
          type="button"
          onClick={handleOpen}
          className="cursor-pointer text-left"
          aria-label={`Lihat semua ${images.length} foto`}
        >
          {trigger}
        </button>
      ) : (
        <Button variant="quiet" size="sm" onClick={handleOpen}>
          Lihat Semua Foto ({images.length})
        </Button>
      )}

      {/* F7: Render dialog via portal to avoid stacking context issues */}
      {mounted && dialog && createPortal(dialog, document.body)}
    </>
  );
}
