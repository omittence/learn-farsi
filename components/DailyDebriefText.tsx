'use client';

import { useState, useCallback } from 'react';
import type { Word } from '@/lib/types';
import ClickableWord from './ClickableWord';
import WordDialog from './WordDialog';

type Token = { type: 'word'; word: Word } | { type: 'text'; text: string };

function tokenize(text: string, words: Word[]): Token[] {
  const wordMap = new Map(words.map((w) => [w.farsi, w]));
  const chunks = text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu) ?? [];
  return chunks.map((chunk): Token => {
    const word = wordMap.get(chunk);
    return word ? { type: 'word', word } : { type: 'text', text: chunk };
  });
}

interface Props {
  title: string;
  fullText: string;
  words: Word[];
}

export default function DailyDebriefText({ title, fullText, words }: Props) {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleWordClick = useCallback((word: Word, rect: DOMRect) => {
    setSelectedWord(word);
    setAnchorRect(rect);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedWord(null);
    setAnchorRect(null);
  }, []);

  const farsiFont = { fontFamily: 'var(--font-vazirmatn), sans-serif' };

  function renderTokens(text: string, className: string) {
    return tokenize(text, words).map((token, i) =>
      token.type === 'word' ? (
        <ClickableWord key={`${token.word.id}-${i}`} word={token.word} onClick={handleWordClick} />
      ) : (
        <span key={i} className={className}>{token.text}</span>
      )
    );
  }

  return (
    <>
      <h3
        dir="rtl"
        className="text-3xl sm:text-4xl font-bold text-white text-right mb-8 leading-normal"
        style={farsiFont}
      >
        {renderTokens(title, 'text-white')}
      </h3>

      <article
        dir="rtl"
        className="leading-loose text-2xl sm:text-4xl text-white mb-8"
        style={farsiFont}
      >
        {renderTokens(fullText, 'text-zinc-300')}
      </article>

      {selectedWord && anchorRect && (
        <WordDialog word={selectedWord} anchorRect={anchorRect} onClose={handleClose} />
      )}
    </>
  );
}
