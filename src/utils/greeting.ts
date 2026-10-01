export function greeting(hour: number, name = ''): string {
  const who = name.trim() ? `, ${name.trim()}` : '';
  if (hour < 5) return `Up late${who}?`;
  if (hour < 12) return `Good morning${who}`;
  if (hour < 17) return `Good afternoon${who}`;
  if (hour < 22) return `Good evening${who}`;
  return `Good night${who}`;
}

export function progressMessage(done: number, total: number, isToday: boolean): string {
  if (total === 0) return isToday ? 'Nothing due today. Enjoy the rest day.' : 'Nothing was due this day.';
  const left = total - done;
  if (left === 0) return isToday ? 'Everything done. Beautiful work.' : 'A perfect day.';
  if (done === 0) return isToday ? 'Fresh start. Pick one and go.' : `${total} habit${total === 1 ? '' : 's'} were due.`;
  if (!isToday) return `${left} left unfinished.`;
  return left === 1 ? 'One more to go.' : `${left} more to go. Keep it rolling.`;
}
