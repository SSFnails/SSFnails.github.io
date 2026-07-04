import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { addDaysISO, fmtDate, fmtMoney, fmtTime, todayISO } from '../lib/format'
import { AllergyBadge, Btn, Card, Empty, Minion, Plate, Spinner, StatusChip, Toggle } from '../ui'
import BookingForm from '../BookingForm'
import BookingDetails from '../BookingDetails'

const SELECT = '*, clients(*), services(*)'

export default function Today() {
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState([])
  const [tomorrow, setTomorrow] = useState([])
  const [requests, setRequests] = useState([])
  const [reminders, setReminders] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const t = todayISO()
    const tm = addDaysISO(t, 1)
    const [a, b, c] = await Promise.all([
      supabase.from('bookings').select(SELECT).eq('date', t).in('status', ['new', 'confirmed', 'done', 'no_show']).order('time'),
      supabase.from('bookings').select(SELECT).eq('date', tm).in('status', ['new', 'confirmed']).order('time'),
      supabase.from('bookings').select(SELECT).eq('status', 'new').gte('date', t).order('date').order('time'),
    ])
    setToday(a.data || [])
    setTomorrow(b.data || [])
    setRequests(c.data || [])
    setLoading(false)
    loadReminders()
  }, [])

  // кому пора напомнить: последняя выполненная запись 14-21 день назад и нет будущих
  async function loadReminders() {
    const t = todayISO()
    const from = addDaysISO(t, -21)
    const to = addDaysISO(t, -14)
    const [{ data: recent }, { data: future }] = await Promise.all([
      supabase.from('bookings').select('client_id, date, clients(id, name, telegram)').eq('status', 'done').gte('date', from).order('date', { ascending: false }),
      supabase.from('bookings').select('client_id').gte('date', t).in('status', ['new', 'confirmed']),
    ])
    const busy = new Set((future || []).map((b) => b.client_id))
    const seen = new Set()
    const list = []
    for (const b of recent || []) {
      if (!b.client_id || seen.has(b.client_id)) continue
      seen.add(b.client_id)
      if (b.date <= to && !busy.has(b.client_id) && b.clients) {
        list.push({ ...b.clients, lastDate: b.date })
      }
    }
    setReminders(list.slice(0, 5))
  }

  useEffect(() => {
    load()
  }, [load])

  useAutoRefresh(load, 45000)

  async function toggleAddress(b, v) {
    setTomorrow((list) => list.map((x) => (x.id === b.id ? { ...x, address_sent: v } : x)))
    const { error } = await supabase.from('bookings').update({ address_sent: v }).eq('id', b.id)
    if (error) load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-7 pt-2">
      {requests.length > 0 && (
        <section>
          <Plate>Новые заявки</Plate>
          <div className="mt-3 space-y-2">
            {requests.map((b) => (
              <Card key={b.id} onClick={() => setSelected(b)} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {b.clients?.name || 'Без имени'}
                    {b.clients?.has_allergy && <span className="ml-2"><AllergyBadge note={b.clients.allergy_note} /></span>}
                  </div>
                  <div className="mt-0.5 text-sm text-cream-dim">
                    {fmtDate(b.date)} в {fmtTime(b.time)}, {b.services?.name || 'услуга: на месте'}
                  </div>
                </div>
                <StatusChip status="new" />
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl">Сегодня</h1>
          <span className="text-sm text-cream-dim">{fmtDate(todayISO())}</span>
        </div>
        <div className="mt-4 space-y-2">
          {today.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Minion size={92} arms="up" />
              <p className="text-sm text-cream-dim">Сегодня записей нет. Можно выдохнуть.</p>
            </div>
          )}
          {today.map((b) => (
            <Card key={b.id} onClick={() => setSelected(b)}>
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl text-gold">{fmtTime(b.time)}</span>
                <StatusChip status={b.status} />
              </div>
              <div className="mt-2 flex items-center gap-2 font-medium">
                {b.clients?.name || 'Без имени'}
                {b.clients?.has_allergy && <AllergyBadge note={b.clients.allergy_note} />}
              </div>
              <div className="mt-0.5 flex items-center justify-between text-sm text-cream-dim">
                <span>
                  {b.services?.name || 'услуга: на месте'}
                  {b.with_design ? ', дизайн' : ''}
                </span>
                <span className="text-cream">{fmtMoney(b.price)}</span>
              </div>
            </Card>
          ))}
        </div>
        <Btn onClick={() => setShowForm(true)} className="mt-4 w-full">
          + Новая запись
        </Btn>
      </section>

      <section>
        <Plate>Отправить адрес</Plate>
        <p className="mt-2 text-sm text-cream-dim">Клиенты на завтра, адрес высылается за сутки.</p>
        <div className="mt-3 space-y-2">
          {tomorrow.length === 0 && <Empty>Завтра записей нет.</Empty>}
          {tomorrow.map((b) => (
            <Card key={b.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{b.clients?.name || 'Без имени'}</div>
                <div className="text-sm text-cream-dim">
                  {fmtTime(b.time)}
                  {b.clients?.telegram ? `, ${b.clients.telegram}` : ''}
                </div>
              </div>
              <Toggle checked={b.address_sent} onChange={(v) => toggleAddress(b, v)} />
            </Card>
          ))}
        </div>
      </section>

      {today.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          <Minion size={52} />
          <p className="text-sm text-cream-dim">Хорошего дня!</p>
        </div>
      )}

      {reminders.length > 0 && (
        <section>
          <Plate>Пора напомнить о записи</Plate>
          <p className="mt-2 text-sm text-cream-dim">Носка 2-3 недели, у этих девочек она подходит к концу.</p>
          <div className="mt-3 space-y-2">
            {reminders.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-cream-dim">
                  была {fmtDate(c.lastDate)}
                  {c.telegram ? `, ${c.telegram}` : ''}
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {showForm && (
        <BookingForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
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
