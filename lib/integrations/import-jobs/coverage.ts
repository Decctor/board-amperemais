/** Merge only overlapping/touching fully closed windows. A missing source is unknown coverage. */
export function resolveHistoricalCoverage(sources: Array<Array<{ inicio: Date; fim: Date }>>) {
 if (!sources.length || sources.some((intervals) => !intervals.length)) return null;
 const starts = sources.map((intervals) => {
  const sorted = intervals.toSorted((a, b) => b.fim.getTime() - a.fim.getTime());
  let start = sorted[0].inicio.getTime();
  for (const interval of sorted.slice(1)) {
   if (interval.fim.getTime() < start) break;
   start = Math.min(start, interval.inicio.getTime());
  }
  return start;
 });
 return new Date(Math.max(...starts));
}
