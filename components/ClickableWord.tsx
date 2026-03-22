'use client';

import type { Word } from '@/lib/types';

interface Props {
  word: Word;
  onClick: (word: Word, rect: DOMRect) => void;
}

export default function ClickableWord({ word, onClick }: Props) {
  return (
    <button
      onClick={(e) => onClick(word, e.currentTarget.getBoundingClientRect())}
      className="text-2xl sm:text-4xl text-white cursor-pointer
                 hover:text-zinc-400 transition-colors duration-150
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                 rounded px-0.5"
      style={{ fontFamily: 'var(--font-vazirmatn), sans-serif' }}
      dir="rtl"
      aria-label={`${word.farsi} — ${word.meaning}`}
    >
      {word.farsi}
    </button>
  );
}
