'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReadingDocument, SentenceWithWords, Word } from '@/lib/types';
import ClickableWord from './ClickableWord';
import WordDialog from './WordDialog';

interface Props {
  document: ReadingDocument;
  backHref?: string;
  backLabel?: string;
  showHeader?: boolean;
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


export default function ReadingView({
  document,
  backHref = '/',
  backLabel = 'Back to home',
  showHeader = true,
}: Props) {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [anchorRect, setAnchorRect]     = useState<DOMRect | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [hoveredSentence, setHoveredSentence] = useState<number | null>(null);

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
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-zinc-400
                   hover:text-white transition-colors mb-10"
        dir="ltr"
      >
        ← {backLabel}
      </Link>

      {/* Story header */}
      {showHeader && (
        <header className="mb-8 text-right">
          <h1 className="text-4xl font-bold text-white mb-2" style={farsiFont}>
            {document.title}
          </h1>
          <p className="text-zinc-400" dir="ltr">
            {document.title_en}
          </p>
        </header>
      )}

      {/* Reading area */}
      <article
        dir="rtl"
        className={`leading-loose text-2xl sm:text-4xl text-white mb-12${document.layout === 'poem' ? ' text-center' : ''}`}
        style={farsiFont}
      >
        {document.sentences && document.sentences.length > 0
          ? document.sentences.map((sent, si) => (
              <SentenceBlock
                key={sent.id}
                sentence={sent}
                allWords={document.words}
                isPoem={document.layout === 'poem'}
                isLast={si === document.sentences!.length - 1}
                onWordClick={handleWordClick}
                showTranslation={hoveredSentence === si}
                onHover={() => setHoveredSentence(si)}
                onLeave={() => setHoveredSentence(null)}
              />
            ))
          : document.layout === 'poem'
            ? document.full_text.split('\n').flatMap((line, li, arr) => {
                const tokens = tokenize(line, document.words).map((token, i) =>
                  token.type === 'word' ? (
                    <ClickableWord key={`${li}-${token.word.id}-${i}`} word={token.word} onClick={handleWordClick} />
                  ) : (
                    <span key={`${li}-t-${i}`} className="text-zinc-300">{token.text}</span>
                  )
                );
                if (li < arr.length - 1) tokens.push(<br key={`br-${li}`} />);
                return tokens;
              })
            : tokenize(document.full_text, document.words).map((token, i) =>
                token.type === 'word' ? (
                  <ClickableWord key={`${token.word.id}-${i}`} word={token.word} onClick={handleWordClick} />
                ) : (
                  <span key={i} className="text-zinc-300">{token.text}</span>
                )
              )
        }
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
            {document.translation}
          </p>
        )}
      </section>

      {selectedWord && anchorRect && (
        <WordDialog word={selectedWord} anchorRect={anchorRect} onClose={handleClose} />
      )}
    </div>
  );
}

function SentenceBlock({
  sentence,
  allWords,
  isPoem,
  isLast,
  onWordClick,
  showTranslation,
  onHover,
  onLeave,
}: {
  sentence: SentenceWithWords;
  allWords: Word[];
  isPoem: boolean;
  isLast: boolean;
  onWordClick: (word: Word, rect: DOMRect) => void;
  showTranslation: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const tokens = tokenize(sentence.text, allWords);
  const hasImage = !!sentence.image_url;

  // Picture-book pages use a block wrapper so the image sits above the text.
  // Plain sentences keep the existing inline span behaviour.
  if (hasImage) {
    return (
      <div className="mb-8 cursor-pointer" onClick={onHover} onMouseEnter={onHover} onMouseLeave={onLeave}>
        <div className="mb-4 rounded-2xl overflow-hidden bg-zinc-900 border border-white/8">
          <Image
            src={sentence.image_url!}
            alt=""
            width={800}
            height={600}
            className="w-full h-auto"
          />
        </div>
        <div className="rounded-lg transition-colors hover:bg-white/5 px-1">
          {tokens.map((token, i) =>
            token.type === 'word' ? (
              <ClickableWord
                key={`${sentence.id}-${token.word.id}-${i}`}
                word={token.word}
                onClick={onWordClick}
              />
            ) : (
              <span key={`${sentence.id}-t-${i}`} className="text-zinc-300">
                {token.text}
              </span>
            ),
          )}
          {showTranslation && sentence.translation && (
            <span
              dir="ltr"
              className="block text-sm text-zinc-400 mt-1 animate-fade-in"
              style={{ fontFamily: 'inherit' }}
            >
              {sentence.translation}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <span
      className="inline cursor-pointer rounded-lg transition-colors hover:bg-white/5"
      onClick={onHover}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {tokens.map((token, i) =>
        token.type === 'word' ? (
          <ClickableWord
            key={`${sentence.id}-${token.word.id}-${i}`}
            word={token.word}
            onClick={onWordClick}
          />
        ) : (
          <span key={`${sentence.id}-t-${i}`} className="text-zinc-300">
            {token.text}
          </span>
        ),
      )}
      {isPoem && !isLast && <br />}
      {showTranslation && sentence.translation && (
        <span
          dir="ltr"
          className="block text-sm text-zinc-400 mt-1 mb-3 animate-fade-in"
          style={{ fontFamily: 'inherit' }}
        >
          {sentence.translation}
        </span>
      )}
      {!isPoem && ' '}
    </span>
  );
}
