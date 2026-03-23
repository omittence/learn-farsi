import Link from 'next/link';
import type { DailyDebriefWithWords } from '@/lib/types';
import { formatDebriefDate } from '@/lib/dates';
import DailyDebriefCalendar from './DailyDebriefCalendar';
import DailyDebriefText from './DailyDebriefText';

interface Props {
  latestDebrief: DailyDebriefWithWords | null;
  archiveDates: string[];
  selectedDate?: string;
}

export default function DailyDebriefFeature({ latestDebrief, archiveDates, selectedDate }: Props) {
  return (
    <section className="mb-18 animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300/70 mb-2" dir="ltr">
            Daily Readings
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">خواندنی روز</h2>
        </div>
        <p className="max-w-md text-sm text-zinc-500 text-right">
          Fresh learner-friendly world news in Farsi, with a calendar archive for previous debriefs.
        </p>
      </div>

      {latestDebrief ? (
        <>
          <div className="flex items-center justify-between mb-6" dir="ltr">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-amber-200">
                {formatDebriefDate(latestDebrief.debrief_date, 'en-CA')}
              </span>
              <span>{archiveDates.length} archived readings</span>
            </div>
            <DailyDebriefCalendar
              availableDates={archiveDates}
              selectedDate={selectedDate ?? latestDebrief.debrief_date}
            />
          </div>

          <DailyDebriefText title={latestDebrief.title} fullText={latestDebrief.full_text} words={latestDebrief.words} />

          <div className="flex items-center justify-between" dir="ltr">
            <Link
              href={`/daily/${latestDebrief.debrief_date}`}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Read full debrief →
            </Link>
            <p className="text-xs text-zinc-700">{latestDebrief.title_en}</p>
          </div>
        </>
      ) : (
        <div className="py-12">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4" dir="ltr">
            No debrief yet
          </p>
          <h3 className="text-3xl font-bold text-white text-right mb-3">اولین خواندنی روز را اضافه کنید</h3>
          <p className="text-zinc-400 text-right leading-7">
            Generate a dated debrief file, ingest it, and it will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
