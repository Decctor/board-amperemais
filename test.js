const dayjs = require('dayjs')

function getDayStringsBetweenDates({ initialDate, endDate, format }) {
  let strings = []
  let iteratingDate = dayjs(initialDate)
  const goalDate = dayjs(endDate)

  while (iteratingDate.isBefore(goalDate) || iteratingDate.isSame(goalDate, 'day')) {
    const dayStr = iteratingDate.format(format || 'DD/MM')
    strings.push(dayStr)
    iteratingDate = iteratingDate.add(1, 'day')
  }

  return strings
}
function getYearStringsBetweenDates({ initialDate, endDate }) {
  let strings = []
  let iteratingDate = dayjs(initialDate).year()
  const goalDate = dayjs(endDate).year()

  while (iteratingDate <= goalDate) {
    strings.push(iteratingDate)
    iteratingDate += 1
  }

  return strings
}

const strings = getDayStringsBetweenDates({ initialDate: '2024-09-01T03:00:00.000Z', endDate: '2024-09-05T03:00:00.000Z' })
const stringsYear = getYearStringsBetweenDates({ initialDate: '2024-09-01T03:00:00.000Z', endDate: '2026-09-05T03:00:00.000Z' })
console.log(Math.ceil((dayjs('2024-07-01T05:00:00.000Z').month() + 1) / 6))
