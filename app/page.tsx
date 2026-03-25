import { getAllStoryCards, getDailyDebriefArchiveDates, getLatestDailyDebriefWithWords } from '@/lib/queries';
import DailyDebriefFeature from '@/components/DailyDebriefFeature';
import StoryCard from '@/components/StoryCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [storiesResult, latestDebriefResult, archiveDatesResult] = await Promise.allSettled([
    getAllStoryCards(),
    getLatestDailyDebriefWithWords(),
    getDailyDebriefArchiveDates(),
  ]);
  if (storiesResult.status !== 'fulfilled') {
    throw storiesResult.reason;
  }

  const all = storiesResult.value;
  const latestDebrief = latestDebriefResult.status === 'fulfilled' ? latestDebriefResult.value : null;
  const archiveDates = archiveDatesResult.status === 'fulfilled' ? archiveDatesResult.value : [];
  const stories = all.filter((s) => s.layout === 'prose');
  const poems = all.filter((s) => s.layout === 'poem');

  return (
    <main className="min-h-screen px-6 py-16 max-w-6xl mx-auto">
      <header className="mb-16 text-center animate-fade-in">
        <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-vazirmatn), sans-serif' }}>
          فارسی
        </h1>
        <p className="text-lg text-zinc-500">
          Learn to read Farsi through interactive stories and poems
        </p>
      </header>

      <DailyDebriefFeature latestDebrief={latestDebrief} archiveDates={archiveDates} />

      {stories.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-zinc-400 mb-6 flex items-center gap-3">
            Stories
            <span className="text-zinc-700 text-sm font-normal">{stories.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, index) => (
              <StoryCard key={story.id} story={story} animationDelay={index * 80} />
            ))}
          </div>
        </section>
      )}

      {poems.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-zinc-400 mb-6 flex items-center gap-3">
            Poems
            <span className="text-zinc-700 text-sm font-normal">{poems.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {poems.map((poem, index) => (
              <StoryCard key={poem.id} story={poem} animationDelay={index * 80} />
            ))}
          </div>
        </section>
      )}

      {all.length === 0 && (
        <p className="text-center text-zinc-600 mt-24">
          No content yet. Run <code className="text-zinc-400">npm run ingest</code> to add stories.
        </p>
      )}
    </main>
  );
}
