'use client';

import { useState } from 'react';
import type { SentenceWithWords, Word } from '@/lib/types';

const DEP_LABELS: Record<string, string> = {
  nsubj: 'subject',
  obj: 'object',
  obl: 'oblique',
  root: 'root',
  advmod: 'adverb',
  amod: 'modifier',
  nmod: 'noun mod',
  case: 'case marker',
  det: 'determiner',
  conj: 'conjunct',
  cc: 'coordinator',
  punct: 'punct',
  cop: 'copula',
  mark: 'marker',
  xcomp: 'complement',
  ccomp: 'clause comp',
  aux: 'auxiliary',
  compound: 'compound',
  flat: 'flat',
  dep: 'dependent',
};

function friendlyRel(rel: string | null): string {
  if (!rel) return '';
  return DEP_LABELS[rel] ?? rel;
}

interface Props {
  sentence: SentenceWithWords;
}

export default function SentenceDiagram({ sentence }: Props) {
  const [expanded, setExpanded] = useState(false);
  const farsiFont = { fontFamily: 'var(--font-vazirmatn), sans-serif' };

  if (sentence.words.length === 0) return null;

  return (
    <div className="mt-2 mb-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500
                   hover:text-zinc-300 transition-colors"
        dir="ltr"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        Grammar
      </button>

      {expanded && (
        <div className="mt-2 overflow-x-auto animate-fade-in" dir="rtl">
          <div className="flex gap-3 pb-2">
            {sentence.words.map((word, i) => (
              <div
                key={`${word.id}-${i}`}
                className="flex-none text-center min-w-[4rem]"
              >
                <p className="text-lg text-white mb-0.5" style={farsiFont}>
                  {word.farsi}
                </p>
                {word.pos && (
                  <p className="text-[9px] uppercase tracking-wider text-zinc-400 mb-0.5">
                    {word.pos}
                  </p>
                )}
                {word.dep_rel && (
                  <p className="text-[9px] text-zinc-500">
                    {friendlyRel(word.dep_rel)}
                    {word.dep_head !== null && word.dep_head > 0 && (
                      <span className="text-zinc-600">
                        {' '}
                        → {sentence.words[word.dep_head - 1]?.farsi ?? `#${word.dep_head}`}
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
