import { getAllStoryCards } from '@/lib/queries';
import StoryCard from '@/components/StoryCard';

export const dynamic = 'force-static';

export default async function HomePage() {
  const stories = await getAllStoryCards();

  return (
    <main className="min-h-screen px-6 py-16 max-w-6xl mx-auto">
      <header className="mb-16 text-center animate-fade-in">
        <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-vazirmatn), sans-serif' }}>
          داستان‌های فارسی
        </h1>
        <p className="text-lg text-zinc-500">
          Learn to read Farsi through interactive stories
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story, index) => (
          <StoryCard
            key={story.id}
            story={story}
            animationDelay={index * 80}
          />
        ))}
      </div>

      {stories.length === 0 && (
        <p className="text-center text-zinc-600 mt-24">
          No stories yet. Run <code className="text-zinc-400">npm run ingest</code> to add stories.
        </p>
      )}
    </main>
  );
}
