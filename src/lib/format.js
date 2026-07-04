export const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

export const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

export function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISO(new Date())
}

export function addDaysISO(iso, days) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

export function fmtDateFull(iso) {
  const d = new Date(iso + 'T12:00:00')
  const wd = WEEKDAYS_SHORT[(d.getDay() + 6) % 7]
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${wd}`
}

export function fmtTime(t) {
  return (t || '').slice(0, 5)
}

export function fmtMoney(n) {
  if (n == null) return ''
  return new Intl.NumberFormat('ru-RU').format(n) + ' р.'
}

export function weekBoundsISO(date = new Date()) {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  const start = toISO(d)
  d.setDate(d.getDate() + 6)
  return [start, toISO(d)]
}

export function monthBoundsISO(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth()
  return [toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0))]
}

export const BOOKING_STATUS = {
  new: 'новая',
  confirmed: 'подтверждена',
  done: 'выполнена',
  cancelled: 'отменена',
  no_show: 'не пришла',
}

export function daysBetween(isoA, isoB) {
  return Math.round((new Date(isoB + 'T12:00:00') - new Date(isoA + 'T12:00:00')) / 86400000)
}
