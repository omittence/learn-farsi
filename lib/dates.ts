export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

export function formatDebriefDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}
