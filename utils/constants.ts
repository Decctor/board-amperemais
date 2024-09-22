export const Months = [
  { id: 1, label: 'Janeiro', value: 1 },
  { id: 2, label: 'Fevereiro', value: 2 },
  { id: 3, label: 'Março', value: 3 },
  { id: 4, label: 'Abril', value: 4 },
  { id: 5, label: 'Maio', value: 5 },
  { id: 6, label: 'Junho', value: 6 },
  { id: 7, label: 'Julho', value: 7 },
  { id: 8, label: 'Agosto', value: 8 },
  { id: 9, label: 'Setembro', value: 9 },
  { id: 10, label: 'Outubro', value: 10 },
  { id: 11, label: 'Novembro', value: 11 },
  { id: 12, label: 'Dezembro', value: 12 },
]
export function getMonthLabel(month: number) {
  return Months.find((m) => m.value === month)?.label || ''
}
