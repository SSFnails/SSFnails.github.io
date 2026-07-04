import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { MONTHS, WEEKDAYS_SHORT, fmtDateFull, fmtTime, toISO, todayISO } from '../lib/format'
import { Btn, Card, Minion, MinionPeek, Spinner, StatusChip, inputCls } from '../ui'
import BookingForm from '../BookingForm'
import BookingDetails from '../BookingDetails'

const QUICK_TIMES = ['10:00', '12:00', '14:00', '16:00', '17:00', '18:00']

export default function Calendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState(todayISO())
  const [newTime, setNewTime] = useState('')
  const [formSlot, setFormSlot] = useState(null) // {date, slotId}
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  const from = toISO(cursor)
  const to = toISO(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))

  const seq = useRef(0)
  const load = useCallback(async () => {
    // при быстром листании месяцев старый ответ не должен перекрыть новый
    const my = ++seq.current
    const [s, b] = await Promise.all([
      supabase.from('slots').select('*').gte('date', from).lte('date', to).order('time'),
      supabase
        .from('bookings')
        .select('*, clients(*), services(*)')
        .gte('date', from)
        .lte('date', to)
        .in('status', ['new', 'confirmed', 'done', 'no_show'])
        .order('time'),
    ])
    if (my !== seq.current) return
    setSlots(s.data || [])
    setBookings(b.data || [])
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useAutoRefresh(load, 45000)

  // сетка месяца с понедельника
  const first = new Date(cursor)
  const pad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < pad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(cursor.getFullYear(), cursor.getMonth(), d)))

  const byDay = {}
  for (const s of slots) (byDay[s.date] ||= []).push(s)

  const daySlots = byDay[day] || []
  const dayBookings = bookings.filter((b) => b.date === day)

  async function addSlot(time) {
    setError('')
    const { error: e } = await supabase.from('slots').insert({ date: day, time, status: 'free' })
    if (e) setError('Это время уже есть в этот день.')
    else load()
    setNewTime('')
  }

  async function removeSlot(slot) {
    if (slot.status === 'busy') return
    await supabase.from('slots').delete().eq('id', slot.id)
    load()
  }

  async function toggleBlock(slot) {
    const status = slot.status === 'blocked' ? 'free' : 'blocked'
    await supabase.from('slots').update({ status }).eq('id', slot.id)
    load()
  }

  function shiftMonth(n) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl capitalize">
          {MONTHS[cursor.getMonth()]} <span className="text-cream-dim">{cursor.getFullYear()}</span>
        </h1>
        <div className="flex gap-1">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg bg-mocha px-3.5 py-2 active:bg-mocha-2">‹</button>
          <button onClick={() => shiftMonth(1)} className="rounded-lg bg-mocha px-3.5 py-2 active:bg-mocha-2">›</button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS_SHORT.map((w) => (
              <div key={w} className="pb-1 text-xs uppercase text-cream-dim">
                {w}
              </div>
            ))}
            {cells.map((iso, i) =>
              iso === null ? (
                <div key={`p${i}`} />
              ) : (
                <button
                  key={iso}
                  onClick={() => setDay(iso)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                    day === iso
                      ? 'bg-gold text-espresso font-semibold'
                      : iso === todayISO()
                        ? 'bg-mocha-2 text-cream'
                        : 'bg-mocha/50 text-cream'
                  }`}
                >
                  {Number(iso.slice(8))}
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {(byDay[iso] || []).slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          day === iso
                            ? 'bg-espresso/60'
                            : s.status === 'free'
                              ? 'bg-gold'
                              : s.status === 'busy'
                                ? 'bg-cream-dim/60'
                                : 'bg-line'
                        }`}
                      />
                    ))}
                  </span>
                </button>
              ),
            )}
          </div>

          <div className="mt-6">
            <h2 className="font-display text-xl">{fmtDateFull(day)}</h2>

            <div className="mt-3 space-y-2">
              {daySlots.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-5">
                  <Minion size={70} mood="sleep" />
                  <p className="text-sm text-cream-dim">В этот день окошек нет, выходной. Добавь время ниже, если работаешь.</p>
                </div>
              )}
              {daySlots.map((s) => {
                const booking = bookings.find((b) => b.id === s.booking_id)
                return (
                  <Card key={s.id} className="flex items-center justify-between !py-3">
                    <div className="flex items-center gap-3">
                      <span className={`font-display text-xl ${s.status === 'blocked' ? 'text-cream-dim line-through' : 'text-gold'}`}>
                        {fmtTime(s.time)}
                      </span>
                      {s.status === 'free' && <span className="text-sm text-ok">свободно</span>}
                      {s.status === 'blocked' && <span className="text-sm text-cream-dim">заблокировано</span>}
                      {s.status === 'busy' && booking && (
                        <button className="text-sm text-cream underline decoration-gold/40 underline-offset-4" onClick={() => setSelected(booking)}>
                          {booking.clients?.name || 'запись'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {s.status === 'free' && (
                        <Btn kind="primary" className="!px-3 !py-1.5 text-xs" onClick={() => setFormSlot({ date: day, slotId: s.id })}>
                          записать
                        </Btn>
                      )}
                      {s.status !== 'busy' && (
                        <>
                          <button onClick={() => toggleBlock(s)} className="rounded-lg bg-espresso px-2.5 py-1.5 text-xs text-cream-dim">
                            {s.status === 'blocked' ? 'открыть' : 'закрыть'}
                          </button>
                          <button onClick={() => removeSlot(s)} className="rounded-lg bg-espresso px-2.5 py-1.5 text-xs text-danger">
                            удалить
                          </button>
                        </>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="mt-4">
              <span className="mb-2 block text-xs uppercase tracking-wider text-cream-dim">Добавить окошко</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMES.filter((t) => !daySlots.some((s) => fmtTime(s.time) === t)).map((t) => (
                  <button key={t} onClick={() => addSlot(t)} className="rounded-lg border border-gold/40 px-3.5 py-2 text-sm text-gold active:bg-gold/10">
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex max-w-56 gap-2">
                <input type="time" className={inputCls} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                <Btn kind="ghost" className="shrink-0" onClick={() => newTime && addSlot(newTime)}>
                  +
                </Btn>
              </div>
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </div>

            {dayBookings.length > 0 && (
              <div className="mt-5 space-y-2">
                <span className="block text-xs uppercase tracking-wider text-cream-dim">Записи в этот день</span>
                {dayBookings.map((b) => (
                  <Card key={b.id} onClick={() => setSelected(b)} className="flex items-center justify-between !py-3">
                    <span>
                      <span className="font-display text-lg text-gold">{fmtTime(b.time)}</span>
                      <span className="ml-3 font-medium">{b.clients?.name || 'Без имени'}</span>
                      {b.clients?.has_allergy && <span className="ml-2 text-xs text-danger">аллергия</span>}
                    </span>
                    <StatusChip status={b.status} />
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-8 flex justify-center pb-2">
              <MinionPeek width={120} />
            </div>
          </div>
        </>
      )}

      {formSlot && (
        <BookingForm
          defaultDate={formSlot.date}
          defaultSlotId={formSlot.slotId}
          onClose={() => setFormSlot(null)}
          onSaved={() => {
            setFormSlot(null)
            load()
          }}
        />
      )}
      {selected && (
        <BookingDetails
          booking={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null)
            load()
          }}
        />
      )}
    </div>
  )
}
