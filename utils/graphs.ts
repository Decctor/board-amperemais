import dayjs from 'dayjs'

export type TIntervalGrouping = 'DIA' | 'MÊS' | 'BIMESTRE' | 'TRIMESTRE' | 'SEMESTRE' | 'ANO'

export function getIntervalPossibleGrouping({ after, before }: { after: string; before: string }): TIntervalGrouping[] {
  const diffInDays = dayjs(before).diff(after)

  if (diffInDays < 30) return ['DIA']
  if (diffInDays < 60) return ['DIA', 'MÊS']
  if (diffInDays < 90) return ['DIA', 'MÊS', 'BIMESTRE']
  if (diffInDays < 180) return ['DIA', 'MÊS', 'BIMESTRE', 'TRIMESTRE']
  if (diffInDays < 365) return ['DIA', 'MÊS', 'BIMESTRE', 'TRIMESTRE', 'SEMESTRE']
  return ['DIA', 'MÊS', 'BIMESTRE', 'TRIMESTRE', 'SEMESTRE', 'ANO']
}
