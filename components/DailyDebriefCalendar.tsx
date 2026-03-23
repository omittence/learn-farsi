'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  availableDates: string[];
  selectedDate?: string;
}

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(date);
}

function toWeekIndex(date: Date) {
  return (date.getDay() + 1) % 7;
}

export default function DailyDebriefCalendar({ availableDates, selectedDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = selectedDate ?? availableDates[0] ?? new Date().toISOString().slice(0, 10);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date(`${initialDate}T00:00:00`)));
  const availableSet = new Set(availableDates);

  useEffect(() => {
    if (!selectedDate) return;
    setVisibleMonth(startOfMonth(new Date(`${selectedDate}T00:00:00`)));
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const firstDay = startOfMonth(visibleMonth);
  const firstWeekIndex = toWeekIndex(firstDay);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstWeekIndex + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    const cellDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
    const iso = cellDate.toISOString().slice(0, 10);
    return { iso, dayNumber, enabled: availableSet.has(iso), selected: selectedDate === iso };
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-400 hover:border-white/20 hover:text-white transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="2.5" width="12" height="11" rx="1.5" />
          <path d="M1 5.5h12M4 1v3M10 1v3" />
        </svg>
        Select day
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 w-68 rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3" dir="ltr">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/8 transition-colors text-base leading-none"
            >
              ‹
            </button>
            <p className="text-xs text-zinc-300">{monthLabel(visibleMonth)}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/8 transition-colors text-base leading-none"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1.5 text-center text-[10px] text-zinc-600">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className={`grid grid-cols-7 gap-0.5 ${isPending ? 'opacity-60' : ''}`}>
            {calendarCells.map((cell, index) =>
              cell ? (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!cell.enabled}
                  onClick={() => {
                    setOpen(false);
                    startTransition(() => router.push(`/daily/${cell.iso}`));
                  }}
                  className={`aspect-square rounded-lg text-xs transition-colors ${
                    cell.selected
                      ? 'bg-white text-black font-medium'
                      : cell.enabled
                        ? 'text-zinc-200 hover:bg-white/10'
                        : 'text-zinc-700 cursor-not-allowed'
                  }`}
                >
                  {cell.dayNumber}
                </button>
              ) : (
                <span key={`empty-${index}`} className="aspect-square" />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
