'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { StoryWithWords, Word } from '@/lib/types';
import ClickableWord from './ClickableWord';
import WordDialog from './WordDialog';

interface Props {
  story: StoryWithWords;
}

type Token =
  | { type: 'word'; word: Word }
  | { type: 'text'; text: string };

// Tokenize a string into clickable words and plain punctuation/spaces.
function tokenize(text: string, words: Word[]): Token[] {
  const wordMap = new Map(words.map((w) => [w.farsi, w]));
  const chunks  = text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu) ?? [];
  return chunks.map((chunk): Token => {
    const word = wordMap.get(chunk);
    return word ? { type: 'word', word } : { type: 'text', text: chunk };
  });
}


export default function ReadingView({ story }: Props) {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [anchorRect, setAnchorRect]     = useState<DOMRect | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleWordClick = useCallback((word: Word, rect: DOMRect) => {
    setSelectedWord(word);
    setAnchorRect(rect);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedWord(null);
    setAnchorRect(null);
  }, []);

  const farsiFont = { fontFamily: 'var(--font-vazirmatn), sans-serif' };

  return (
    <div className="min-h-screen px-4 py-10 max-w-3xl mx-auto animate-fade-in">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-400
                   hover:text-white transition-colors mb-10"
        dir="ltr"
      >
        ← Back to stories
      </Link>

      {/* Story header */}
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-bold text-white mb-2" style={farsiFont}>
          {story.title}
        </h1>
        <p className="text-zinc-400" dir="ltr">
          {story.title_en}
        </p>
      </header>

      {/* Reading area */}
      <article
        dir="rtl"
        className={`leading-loose text-2xl sm:text-4xl text-white mb-12${story.layout === 'poem' ? ' text-center' : ''}`}
        style={farsiFont}
      >
        {tokenize(story.full_text, story.words).map((token, i) =>
          token.type === 'word' ? (
            <ClickableWord
              key={`${token.word.id}-${i}`}
              word={token.word}
              onClick={handleWordClick}
            />
          ) : (
            <span key={i} className="text-zinc-300">
              {token.text}
            </span>
          )
        )}
      </article>

      {/* English translation */}
      <section dir="ltr" className="border-t border-white/10 pt-6">
        <button
          onClick={() => setShowTranslation((v) => !v)}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500
                     hover:text-zinc-300 transition-colors"
        >
          <span>{showTranslation ? '▾' : '▸'}</span>
          Translation
        </button>
        {showTranslation && (
          <p className="text-zinc-400 leading-relaxed mt-3 animate-fade-in whitespace-pre-line">
            {story.translation}
          </p>
        )}
      </section>

      {selectedWord && anchorRect && (
        <WordDialog word={selectedWord} anchorRect={anchorRect} onClose={handleClose} />
      )}
    </div>
  );
}
