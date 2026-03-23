'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Word, Letter } from '@/lib/types';

interface Props {
  word: Word;
  anchorRect: DOMRect;
  onClose: () => void;
}

const DIALOG_W = 380;
const GAP = 10;
const EDGE_PAD = 12;

export default function WordDialog({ word, anchorRect, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const dragY = useRef(0);

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragY.current = e.touches[0].clientY;
    if (dialogRef.current) {
      dialogRef.current.style.transition = 'none';
    }
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!dialogRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - dragY.current);
    dialogRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const handleDragEnd = useCallback((e: React.TouchEvent) => {
    if (!dialogRef.current) return;
    const dy = Math.max(0, e.changedTouches[0].clientY - dragY.current);
    if (dy > 100) {
      onClose();
    } else {
      dialogRef.current.style.transition = 'transform 0.25s ease';
      dialogRef.current.style.transform = '';
    }
  }, [onClose]);

  // Desktop: anchor below the clicked word.
  // anchorRect is viewport-relative (from getBoundingClientRect), and the dialog
  // uses fixed positioning (also viewport-relative), so no scrollY offset needed.
  const top = anchorRect.bottom + GAP;
  const centerX = anchorRect.left + anchorRect.width / 2;
  const left = Math.max(
    EDGE_PAD,
    Math.min(centerX - DIALOG_W / 2, window.innerWidth - DIALOG_W - EDGE_PAD)
  );

  const farsiFont = { fontFamily: 'var(--font-vazirmatn), sans-serif' };

  const dialogStyle = isMobile
    ? undefined // handled by Tailwind classes
    : { top, left, width: DIALOG_W };

  const dialogClass = isMobile
    ? `fixed z-50 bottom-0 left-0 right-0 rounded-t-2xl bg-[#1a1a1a] border border-white/8
       shadow-2xl shadow-black/60 animate-slide-up overflow-hidden focus:outline-none`
    : `fixed z-50 rounded-2xl bg-[#1a1a1a] border border-white/8
       shadow-2xl shadow-black/60 animate-slide-up overflow-hidden focus:outline-none`;

  return (
    <>
      {/* Gloss backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Word details: ${word.farsi}`}
        tabIndex={-1}
        className={dialogClass}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        {isMobile && (
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}

        {/* Header */}
        <div
          className="relative px-5 pt-4 pb-3 border-b border-white/10"
          onTouchStart={isMobile ? handleDragStart : undefined}
          onTouchMove={isMobile ? handleDragMove : undefined}
          onTouchEnd={isMobile ? handleDragEnd : undefined}
        >
          <button
            onClick={onClose}
            className="absolute top-3 left-4 text-zinc-500 hover:text-white
                       transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>

          <p className="text-4xl font-bold text-white text-right mb-1" style={farsiFont}>
            {word.farsi}
          </p>

        </div>

        {/* Scrollable body */}
        <div
          className="px-5 py-3 space-y-4 overflow-y-auto"
          style={{ maxHeight: isMobile ? '60vh' : '22rem' }}
        >
          {/* Overview */}
          <div className="space-y-2" dir="ltr">
            <InfoRow label="Meaning"         value={word.meaning} />
            <InfoRow label="Transliteration" value={word.transliteration} mono />
            <InfoRow label="Pronunciation"   value={word.pronunciation} />
          </div>

          {/* Letters */}
          {word.letters.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" dir="ltr">
                Letters
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" dir="rtl">
                {word.letters.map((letter, i) => (
                  <LetterCard key={i} letter={letter} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-sm text-zinc-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function LetterCard({ letter }: { letter: Letter }) {
  const farsiFont = { fontFamily: 'var(--font-vazirmatn), sans-serif' };
  return (
    <div className="flex-none rounded-xl bg-zinc-900/60 border border-white/8 p-2.5 w-20" dir="ltr">
      <p className="text-3xl text-white text-center mb-1" style={farsiFont}>
        {letter.char}
      </p>
      <p className="text-[10px] text-center text-zinc-500 mb-2 leading-tight">
        {letter.name}<br />{letter.sound}
      </p>
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-center">
        {[
          { label: 'Iso', value: letter.isolated },
          { label: 'Ini', value: letter.initial },
          { label: 'Med', value: letter.medial },
          { label: 'Fin', value: letter.final },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-sm text-zinc-200" style={farsiFont}>{value}</p>
            <p className="text-[9px] text-zinc-600">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
