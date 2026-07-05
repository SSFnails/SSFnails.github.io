import { MONTHS_EN, WEEKDAYS_EN, WEEKDAYS_EN_SHORT, toISO, todayISO } from './lib/format'

// Календарь в стиле фирменных картинок мастера: тёмный шоколад, крупный сериф,
// времена прямо в клетках, занятые перечёркнуты красным как маркером.
// byDate: { '2026-07-06': [{time, status}, ...] }
export default function MonthSheet({
  cursor,
  onShift,
  byDate,
  selected,
  onPickDay,
  pickableEmpty = false,
  canPrev = true,
  canNext = true,
}) {
  const pad = (new Date(cursor).getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < pad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(cursor.getFullYear(), cursor.getMonth(), d)))
  while (cells.length % 7 !== 0) cells.push(null)
  const today = todayISO()

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => onShift(-1)}
          disabled={!canPrev}
          className="rounded-lg bg-mocha px-3.5 py-2 text-cream disabled:opacity-25"
        >
          ‹
        </button>
        <div className="text-center leading-none">
          <span className="font-display text-5xl font-bold lowercase sm:text-6xl">
            {MONTHS_EN[cursor.getMonth()]}
          </span>
          {cursor.getFullYear() !== new Date().getFullYear() && (
            <span className="ml-2 align-super text-xs text-cream-dim">{cursor.getFullYear()}</span>
          )}
        </div>
        <button
          onClick={() => onShift(1)}
          disabled={!canNext}
          className="rounded-lg bg-mocha px-3.5 py-2 text-cream disabled:opacity-25"
        >
          ›
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7">
        {WEEKDAYS_EN.map((w, i) => (
          <div
            key={w}
            className={`border-b border-cream/30 pb-2 text-center font-display font-semibold text-[10px] sm:text-base ${
              i > 0 ? 'border-l border-l-cream/15' : ''
            }`}
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{WEEKDAYS_EN_SHORT[i]}</span>
          </div>
        ))}
        {cells.map((iso, i) => {
          const daySlots = iso ? byDate[iso] || [] : []
          const hasFree = daySlots.some((s) => s.status === 'free')
          const clickable = Boolean(iso && (pickableEmpty || hasFree))
          return (
            <div
              key={iso || `p${i}`}
              onClick={clickable ? () => onPickDay(iso) : undefined}
              className={`min-h-16 border-b border-cream/30 p-1 sm:min-h-20 sm:p-1.5 ${
                i % 7 > 0 ? 'border-l border-l-cream/15' : ''
              } ${clickable ? 'cursor-pointer active:bg-cream/5' : ''} ${selected === iso ? 'bg-gold/10' : ''}`}
            >
              {iso && (
                <>
                  <div className={`font-display text-sm font-semibold sm:text-lg ${iso === today ? 'text-gold' : ''}`}>
                    {Number(iso.slice(8))}
                  </div>
                  <div className="space-y-0.5 pr-0.5 text-right font-display text-[10px] font-medium leading-snug sm:text-[15px]">
                    {daySlots.map((s) => (
                      <div
                        key={s.time}
                        className={
                          s.status === 'free' ? 'text-cream' : s.status === 'blocked' ? 'strike opacity-40' : 'strike'
                        }
                      >
                        {s.time.slice(0, 5)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
