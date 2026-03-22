import Link from 'next/link';
import type { StoryCard } from '@/lib/types';

const LEVEL_STYLES: Record<string, string> = {
  beginner:     'bg-white/5 text-zinc-300 border border-white/10',
  intermediate: 'bg-white/5 text-zinc-300 border border-white/10',
  advanced:     'bg-white/5 text-zinc-300 border border-white/10',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

interface Props {
  story: StoryCard;
  animationDelay: number;
}

export default function StoryCard({ story, animationDelay }: Props) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="group block rounded-2xl border border-white/8 bg-[#1a1a1a]
                 hover:border-white/20 hover:bg-[#202020]
                 transition-all duration-300 p-6 animate-stagger-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <h2
        className="text-2xl font-bold text-white text-right mb-1
                   group-hover:text-zinc-300 transition-colors"
        style={{ fontFamily: 'var(--font-vazirmatn), sans-serif' }}
      >
        {story.title}
      </h2>

      <p className="text-sm text-zinc-500 mb-4" dir="ltr">
        {story.title_en}
      </p>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEVEL_STYLES[story.level]}`}>
          {LEVEL_LABELS[story.level]}
        </span>
        <span className="text-xs text-zinc-600">
          {story.word_count} {story.word_count === 1 ? 'word' : 'words'}
        </span>
      </div>

      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 text-right">
        {story.description}
      </p>

      <div className="mt-4 flex justify-start">
        <span className="text-zinc-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Read →
        </span>
      </div>
    </Link>
  );
}
