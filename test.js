const dayjs = require('dayjs')

console.log(dayjs('2024-09-30T03:00:00.000Z').endOf('day').toISOString())
