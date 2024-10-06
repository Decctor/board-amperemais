import dayjs from 'dayjs'

export function formatDateTime(value: any) {
  if (!value) return undefined
  if (isNaN(new Date(value).getMilliseconds())) return undefined
  return dayjs(value).format('YYYY-MM-DDTHH:mm')
}

export function formatDateAsLocale(date?: string | Date | null, showHours = false) {
  if (!date) return null
  if (showHours) return dayjs(date).format('DD/MM/YYYY HH:mm')
  return dayjs(date).add(3, 'hour').format('DD/MM/YYYY')
}
export function formatDateForInput(value: any) {
  if (!value) return undefined
  if (isNaN(new Date(value).getMilliseconds())) return undefined
  return new Date(value).toISOString().slice(0, 10)
}
export function formatDateInputChange(value: any, returnType?: 'date' | 'string', normalizeHours: boolean = true) {
  if (isNaN(new Date(value).getMilliseconds())) return null
  if (!returnType || returnType === 'string') {
    if (!normalizeHours) return new Date(value).toISOString()
    return dayjs(value).add(3, 'hours').toISOString()
  }
  if (!normalizeHours) return new Date(value)
  return dayjs(value).add(3, 'hours').toDate()
}
export function formatToDateTime(date: string | null) {
  if (!date) return ''
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}
export function formatDateQuery(date: string, type: 'start' | 'end', returnAs?: 'string' | 'date') {
  if (type == 'start') {
    if (returnAs == 'date') return dayjs(date).startOf('day').subtract(3, 'hour').toDate() as Date
    return dayjs(date).startOf('day').subtract(3, 'hour').toISOString()
  }
  if (type == 'end') {
    if (returnAs == 'date') return dayjs(date).endOf('day').subtract(3, 'hour').toDate() as Date
    return dayjs(date).endOf('day').subtract(3, 'hour').toISOString()
  }
  return dayjs(date).startOf('day').subtract(3, 'hour').toISOString()
}
export function formatNameAsInitials(name: string) {
  const splittedName = name.split(' ')
  const firstLetter = splittedName[0][0]
  var secondLetter
  if (['DE', 'DA', 'DO', 'DOS', 'DAS'].includes(splittedName[1])) secondLetter = splittedName[2] ? splittedName[2][0] : ''
  else secondLetter = splittedName[1] ? splittedName[1][0] : ''
  if (!firstLetter && !secondLetter) return 'N'
  return firstLetter + secondLetter
}
export function formatToMoney(value: string | number, tag: string = 'R$') {
  return `${tag} ${Number(value).toLocaleString('pt-br', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
export function formatDecimalPlaces(value: string | number, minPlaces?: number, maxPlaces?: number) {
  return Number(value).toLocaleString('pt-br', {
    minimumFractionDigits: minPlaces != null && minPlaces != undefined ? minPlaces : 0,
    maximumFractionDigits: maxPlaces != null && maxPlaces != undefined ? maxPlaces : 2,
  })
}

export function formatWithoutDiacritics(string: string, useUpperCase?: boolean) {
  if (!useUpperCase) return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  else
    return string
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
}

export function formatLongString(str: string, size: number) {
  if (str.length > size) {
    return str.substring(0, size) + '\u2026'
  } else {
    return str
  }
}

export function formatToPhone(value: string): string {
  if (!value) return ''
  value = value.replace(/\D/g, '')
  value = value.replace(/(\d{2})(\d)/, '($1) $2')
  value = value.replace(/(\d)(\d{4})$/, '$1-$2')
  return value
}
export function formatToCPForCNPJ(value: string): string {
  const cnpjCpf = value.replace(/\D/g, '')

  if (cnpjCpf.length === 11) {
    return cnpjCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4')
  }

  return cnpjCpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5')
}
export function formatToCEP(value: string): string {
  let cep = value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1')

  return cep
}
