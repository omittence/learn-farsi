import { notFound } from 'next/navigation';
import DailyDebriefCalendar from '@/components/DailyDebriefCalendar';
import ReadingView from '@/components/ReadingView';
import { formatDebriefDate, isIsoDate } from '@/lib/dates';
import { getDailyDebriefArchiveDates, getDailyDebriefByDate, getSentencesForDocument } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isIsoDate(date)) {
    return { title: 'Daily Reading | Farsi Reader' };
  }

  try {
    const debrief = await getDailyDebriefByDate(date);
    return {
      title: `${debrief.title_en} | Daily Reading`,
      description: debrief.summary,
    };
  } catch {
    return { title: 'Daily Reading | Farsi Reader' };
  }
}

export default async function DailyDebriefPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isIsoDate(date)) notFound();

  let debrief;
  try {
    debrief = await getDailyDebriefByDate(date);
  } catch {
    notFound();
  }

  let archiveDates: string[] = [];
  try {
    archiveDates = await getDailyDebriefArchiveDates();
  } catch {}

  let sentences: Awaited<ReturnType<typeof getSentencesForDocument>> | undefined = undefined;
  try {
    sentences = await getSentencesForDocument(debrief.id, 'daily_debrief');
  } catch {}

  const debriefWithSentences = sentences?.length ? { ...debrief, sentences } : debrief;

  return (
    <main className="min-h-screen px-6 py-16 max-w-6xl mx-auto">
      <section className="mb-10 animate-fade-in">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300/70 mb-3" dir="ltr">
            Daily Reading
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white text-right mb-2"
            style={{ fontFamily: 'var(--font-vazirmatn), sans-serif' }}
          >
            {debrief.title}
          </h1>
          <p className="text-zinc-400 mb-3" dir="ltr">
            {debrief.title_en}
          </p>
          <div className="flex items-center justify-between mb-6" dir="ltr">
            <p className="text-sm text-zinc-500">
              {formatDebriefDate(debrief.debrief_date, 'en-CA')}
            </p>
            <DailyDebriefCalendar availableDates={archiveDates} selectedDate={debrief.debrief_date} />
          </div>
          <p className="text-zinc-300 leading-8" dir="ltr">{debrief.summary}</p>
        </div>
      </section>

      <ReadingView document={debriefWithSentences} backLabel="Back to home" showHeader={false} />
    </main>
  );
}
