"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import type { GalleryImage } from "@/lib/data";
import DownloadButton from "@/components/DownloadButton";

type LightboxProps = {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

// Swipe thresholds
const SWIPE_DISTANCE = 50;
const SWIPE_VELOCITY = 0.3;
const VERTICAL_CLOSE_DISTANCE = 120;
const MAX_DRAG = 300;

// Zoom thresholds
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 2.5; // double-tap zoom level
const PINCH_SENSITIVITY = 1;

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const [loaded, setLoaded] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"x" | "y" | null>(null);
  const [imageOpacity, setImageOpacity] = useState(1);

  // Zoom state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Mirrors pinch/pan refs into render so the transition can be disabled
  // while a gesture is live (refs alone never trigger a re-render, which
  // made the image lag behind the finger on the first frames of a drag).
  const [gestureLive, setGestureLive] = useState(false);

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const dragRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Pinch tracking
  const pinchRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    active: false,
  });

  // Pan tracking (when zoomed)
  const panRef = useRef({
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    active: false,
  });

  // Double-tap tracking
  const lastTap = useRef(0);

  const isZoomed = scale > 1.05;

  const close = useCallback(() => {
    setLoaded(false);
    setDragX(0);
    setDragY(0);
    setScale(1);
    setPanX(0);
    setPanY(0);
    onClose();
  }, [onClose]);

  const navigate = useCallback(
    (newIndex: number) => {
      setLoaded(false);
      setDragX(0);
      setDragY(0);
      setScale(1);
      setPanX(0);
      setPanY(0);
      setSwipeDirection(null);
      onNavigate(newIndex);
    },
    [onNavigate],
  );

  // Focus management: move focus into the dialog on open, restore on close.
  // The invoker is captured ONLY on the open transition (index: null -> n).
  // Re-capturing on every navigation would remember the dialog itself
  // (the rAF below moves focus into it), so restore-on-close would silently
  // focus a detached node and drop focus to <body>.
  useEffect(() => {
    if (index !== null) {
      if (!lastFocused.current) {
        lastFocused.current = document.activeElement as HTMLElement | null;
      }
      requestAnimationFrame(() => dialogRef.current?.focus());
    } else if (lastFocused.current) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, [index]);

  // Keyboard navigation
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          setScale(1);
          setPanX(0);
          setPanY(0);
        } else {
          close();
        }
      }
      if (e.key === "ArrowRight" && !isZoomed) navigate((index + 1) % images.length);
      if (e.key === "ArrowLeft" && !isZoomed) navigate((index - 1 + images.length) % images.length);
      if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(s + 0.5, MAX_ZOOM));
      }
      if (e.key === "-") {
        setScale((s) => {
          const next = Math.max(s - 0.5, MIN_ZOOM);
          if (next <= 1) { setPanX(0); setPanY(0); }
          return next;
        });
      }
      if (e.key === "0") {
        setScale(1);
        setPanX(0);
        setPanY(0);
      }
      // Tab trap: keep keyboard focus inside the dialog.
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, images.length, navigate, close, isZoomed]);

  // Get distance between two touches
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch start
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Two-finger pinch start (touchAction:none on the container already
      // suppresses browser gestures — React's preventDefault here would be a
      // passive-listener no-op)
      if (e.touches.length === 2) {
        pinchRef.current = {
          initialDistance: getTouchDistance(e.touches),
          initialScale: scale,
          active: true,
        };
        setGestureLive(true);
        setIsDragging(false);
        return;
      }

      // Single touch - check for double-tap
      if (e.touches.length === 1) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTap.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          // Double tap detected
          lastTap.current = 0;

          if (isZoomed) {
            // Zoom out
            setScale(1);
            setPanX(0);
            setPanY(0);
          } else {
            // Zoom in to tapped point
            const touch = e.touches[0];
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const offsetX = touch.clientX - rect.left - rect.width / 2;
              const offsetY = touch.clientY - rect.top - rect.height / 2;
              setScale(ZOOM_STEP);
              setPanX(-offsetX * 0.5);
              setPanY(-offsetY * 0.5);
            }
          }
          return;
        }

        lastTap.current = now;

        const touch = e.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY, time: now };

        if (isZoomed) {
          // Start panning when zoomed
          panRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startPanX: panX,
            startPanY: panY,
            active: true,
          };
          setGestureLive(true);
        } else {
          setIsDragging(true);
          setSwipeDirection(null);
        }
      }
    },
    [scale, isZoomed, panX, panY],
  );

  // Touch move
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Pinch zoom
      if (e.touches.length === 2 && pinchRef.current.active) {
        const currentDistance = getTouchDistance(e.touches);
        const scaleChange = (currentDistance / pinchRef.current.initialDistance) * PINCH_SENSITIVITY;
        const newScale = Math.min(Math.max(pinchRef.current.initialScale * scaleChange, MIN_ZOOM), MAX_ZOOM);
        setScale(newScale);

        if (newScale <= 1) {
          setPanX(0);
          setPanY(0);
        }
        return;
      }

      // Pan when zoomed
      if (isZoomed && panRef.current.active && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - panRef.current.startX;
        const dy = touch.clientY - panRef.current.startY;
        setPanX(panRef.current.startPanX + dx);
        setPanY(panRef.current.startPanY + dy);
        return;
      }

      // Swipe navigation (only when not zoomed)
      if (!isDragging || isZoomed) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!swipeDirection && (absDx > 10 || absDy > 10)) {
        setSwipeDirection(absDx > absDy ? "x" : "y");
      }

      if (swipeDirection === "x") {
        const dampedDx =
          Math.sign(dx) * Math.min(absDx, MAX_DRAG) * (1 - absDx / (MAX_DRAG * 3));
        dragRef.current = { x: dampedDx, y: 0 };
        setDragX(dampedDx);
        setDragY(0);
        setImageOpacity(1 - absDx / (MAX_DRAG * 2.5));
      } else if (swipeDirection === "y" && dy > 0) {
        const dampedDy = Math.min(dy, VERTICAL_CLOSE_DISTANCE * 1.5);
        dragRef.current = { x: 0, y: dampedDy };
        setDragX(0);
        setDragY(dampedDy);
        setImageOpacity(1 - dampedDy / (VERTICAL_CLOSE_DISTANCE * 2));
      }
    },
    [isDragging, isZoomed, swipeDirection],
  );

  // Touch end
  const onTouchEnd = useCallback(
    () => {
      setGestureLive(false);
      // End pinch
      if (pinchRef.current.active) {
        pinchRef.current.active = false;

        // Snap to min/max if close
        setScale((s) => {
          if (s < 1.15) {
            setPanX(0);
            setPanY(0);
            return 1;
          }
          return Math.min(s, MAX_ZOOM);
        });
        return;
      }

      // End pan
      if (isZoomed && panRef.current.active) {
        panRef.current.active = false;
        return;
      }

      // End swipe
      if (!isDragging) return;
      setIsDragging(false);

      const dx = dragRef.current.x;
      const dy = dragRef.current.y;
      const elapsed = Date.now() - touchStart.current.time;
      const velocity = Math.abs(dx) / elapsed;

      if (swipeDirection === "y" && dy > VERTICAL_CLOSE_DISTANCE) {
        close();
        return;
      }

      if (swipeDirection === "x") {
        const isQuickSwipe = velocity > SWIPE_VELOCITY && Math.abs(dx) > 20;
        const isLongSwipe = Math.abs(dx) > SWIPE_DISTANCE;

        if (isQuickSwipe || isLongSwipe) {
          if (dx < 0) {
            navigate((index! + 1) % images.length);
          } else {
            navigate((index! - 1 + images.length) % images.length);
          }
          return;
        }
      }

      // Snap back
      setDragX(0);
      setDragY(0);
      setImageOpacity(1);
      setSwipeDirection(null);
    },
    [isDragging, isZoomed, swipeDirection, index, images.length, navigate, close],
  );

  // OS/gesture cancellation (incoming call, modal, etc.): mirror the
  // end-handler cleanup so no gesture is left frozen mid-state.
  const onTouchCancel = useCallback(() => {
    pinchRef.current.active = false;
    panRef.current.active = false;
    setGestureLive(false);
    setIsDragging(false);
    setDragX(0);
    setDragY(0);
    setImageOpacity(1);
    setSwipeDirection(null);
  }, []);

  // Wheel zoom (desktop) — attached natively with passive:false. React's
  // delegated wheel listener on <body> is passive by browser default, so the
  // old React onWheel + preventDefault was a silent no-op that spammed
  // console errors.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setScale((s) => {
        const next = Math.min(Math.max(s + delta, MIN_ZOOM), MAX_ZOOM);
        if (next <= 1) {
          setPanX(0);
          setPanY(0);
        }
        return next;
      });
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [index]);

  if (index === null) return null;

  const image = images[index];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.title}
      tabIndex={-1}
      className="lightbox-enter fixed inset-0 z-[100] flex flex-col bg-black/95 outline-none dark:bg-black/98"
    >
      {/* Header */}
      <div className="flex min-w-0 items-center justify-between gap-3 p-3 sm:p-4">
        <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-white">{image.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap text-sm text-white/50">
            {index + 1} / {images.length}
          </span>
          {isZoomed && (
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={() => { setScale(1); setPanX(0); setPanY(0); }}
              className="flex h-8 items-center gap-1 rounded-full bg-white/15 px-3 text-xs font-medium text-white transition hover:bg-white/25"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5">
                <path d="M3.51 15a9 9 0 105.46-10.28L10.5 7.5M3.51 15l4.99-4.99M20.49 9a9 9 0 11-5.46 10.28L13.5 16.5" />
              </svg>
              Reset
            </button>
          )}
          <DownloadButton
            href={image.src}
            label="Download image"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          />
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area with swipe + pinch */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-6"
        style={{ touchAction: "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {/* Prev button (hidden when zoomed) */}
        {!isZoomed && (
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => navigate((index - 1 + images.length) % images.length)}
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
          >
            <BsChevronLeft className="text-2xl" />
          </button>
        )}

        {/* Swipeable + zoomable image */}
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            transform: `translate3d(${dragX + panX}px, ${dragY + panY}px, 0) scale(${scale})`,
            transition: isDragging || gestureLive
              ? "none"
              : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
            opacity: imageOpacity,
          }}
        >
          <Image
            key={image.src}
            src={image.src}
            alt={image.title}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
            onLoad={() => setLoaded(true)}
            className={`object-contain transition-opacity duration-300 select-none ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            draggable={false}
          />
        </div>

        {/* Next button (hidden when zoomed) */}
        {!isZoomed && (
          <button
            type="button"
            aria-label="Next image"
            onClick={() => navigate((index + 1) % images.length)}
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
          >
            <BsChevronRight className="text-2xl" />
          </button>
        )}

        {/* Pagination dots (mobile, not zoomed) */}
        {!isZoomed && (
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 sm:hidden">
            {images.length > 1 &&
              images.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
          </div>
        )}

        {/* Zoom indicator (mobile, when zoomed) */}
        {isZoomed && (
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex items-center justify-center sm:hidden">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              {Math.round(scale * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="p-4 text-center text-sm text-white/80">{image.description}</p>
    </div>
  );
}
