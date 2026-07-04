import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtDate, fmtMoney, fmtTime, todayISO } from '../lib/format'
import { AllergyBadge, Btn, Card, Empty, Field, MinionPeek, Spinner, StatusChip, Toggle, inputCls } from '../ui'
import BookingDetails from '../BookingDetails'

export default function ClientCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [history, setHistory] = useState([])
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    const [{ data: c }, { data: bs }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase
        .from('bookings')
        .select('*, clients(*), services(*)')
        .eq('client_id', id)
        .order('date', { ascending: false })
        .order('time', { ascending: false }),
    ])
    setClient(c)
    setHistory(bs || [])
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!client) return <Spinner />

  const totalSpent = history.filter((b) => b.status === 'done').reduce((s, b) => s + (b.price || 0), 0)

  // коррекции подряд: считаем по выполненным и подтверждённым, сверху вниз
  let corrStreak = 0
  for (const b of history) {
    if (!['done', 'confirmed'].includes(b.status)) continue
    if ((b.services?.category || '').toLowerCase().startsWith('коррекция')) corrStreak++
    else break
  }

  // удаление: будущие записи отменяются, окошки освобождаются, история визитов остаётся без имени
  async function removeClient() {
    const ok = window.confirm(
      `Удалить клиента "${client.name}"? Будущие записи отменятся и окошки снова станут свободными. Прошлые визиты останутся в истории и доходе, но уже без имени. Вернуть будет нельзя.`,
    )
    if (!ok) return
    const { data: future } = await supabase
      .from('bookings')
      .select('id, slot_id')
      .eq('client_id', id)
      .gte('date', todayISO())
      .in('status', ['new', 'confirmed'])
    for (const b of future || []) {
      if (b.slot_id) await supabase.from('slots').update({ status: 'free', booking_id: null }).eq('id', b.slot_id)
    }
    if ((future || []).length > 0) {
      await supabase.from('bookings').update({ status: 'cancelled' }).in('id', future.map((b) => b.id))
    }
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      setSaveError('Не получилось удалить, попробуй ещё раз.')
      return
    }
    navigate('/clients')
  }

  async function save() {
    setSaveError('')
    const { error } = await supabase
      .from('clients')
      .update({
        name: form.name.trim(),
        label: form.label.trim() || null,
        telegram: form.telegram.trim() || null,
        phone: form.phone.trim() || null,
        has_allergy: form.has_allergy,
        allergy_note: form.allergy_note.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', id)
    if (error) {
      setSaveError('Не сохранилось, попробуй ещё раз.')
      return
    }
    setEdit(false)
    load()
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="pt-2">
      <Link to="/clients" className="text-sm text-cream-dim">
        ‹ все клиенты
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl">{client.name}</h1>
          {client.label && (
            <span className="mt-1 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">{client.label}</span>
          )}
        </div>
        {!edit && (
          <Btn
            kind="ghost"
            className="!py-2"
            onClick={() => {
              setForm({
                name: client.name,
                label: client.label || '',
                telegram: client.telegram || '',
                phone: client.phone || '',
                has_allergy: client.has_allergy,
                allergy_note: client.allergy_note || '',
                notes: client.notes || '',
              })
              setEdit(true)
            }}
          >
            Изменить
          </Btn>
        )}
      </div>

      {client.has_allergy && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          Аллергия{client.allergy_note ? `: ${client.allergy_note}` : ''}. Не забудь предупредить, что дома кот.
        </p>
      )}

      {corrStreak >= 2 && (
        <p className="mt-3 rounded-lg bg-gold/10 px-3.5 py-2.5 text-sm text-gold">
          Уже {corrStreak} коррекции подряд. По правилам дальше нужно новое покрытие.
        </p>
      )}

      {edit ? (
        <div className="mt-4 space-y-4">
          <Field label="Имя">
            <input className={inputCls} value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Подпись для себя">
            <input className={inputCls} value={form.label} onChange={set('label')} placeholder="Например: Аня с работы" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Телеграм">
              <input className={inputCls} value={form.telegram} onChange={set('telegram')} />
            </Field>
            <Field label="Телефон">
              <input className={inputCls} value={form.phone} onChange={set('phone')} inputMode="tel" />
            </Field>
          </div>
          <Toggle
            checked={form.has_allergy}
            onChange={(v) => setForm({ ...form, has_allergy: v })}
            label="Есть аллергия"
          />
          {form.has_allergy && (
            <Field label="На что аллергия">
              <input className={inputCls} value={form.allergy_note} onChange={set('allergy_note')} placeholder="Например: на кошек" />
            </Field>
          )}
          <Field label="Заметки, предпочтения">
            <textarea className={`${inputCls} min-h-20`} value={form.notes} onChange={set('notes')} />
          </Field>
          {saveError && <p className="text-sm text-danger">{saveError}</p>}
          <div className="flex gap-2">
            <Btn onClick={save} className="flex-1">
              Сохранить
            </Btn>
            <Btn kind="ghost" onClick={() => setEdit(false)}>
              Отмена
            </Btn>
          </div>
          <Btn kind="danger" onClick={removeClient} className="w-full">
            Удалить клиента
          </Btn>
        </div>
      ) : (
        <div className="mt-4 space-y-1 text-sm text-cream-dim">
          {client.telegram && <div>Телеграм: <span className="text-gold">{client.telegram}</span></div>}
          {client.phone && <div>Телефон: <span className="text-cream">{client.phone}</span></div>}
          {client.notes && <div className="pt-1 text-cream">{client.notes}</div>}
          <div className="pt-2 text-base text-cream">
            Всего потрачено: <span className="font-display text-gold">{fmtMoney(totalSpent)}</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-display text-xl">История записей</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 && <Empty>Записей пока не было.</Empty>}
          {history.map((b) => (
            <Card key={b.id} onClick={() => setSelected(b)} className="flex items-center justify-between !py-3">
              <div>
                <span className="font-medium">
                  {fmtDate(b.date)}, {fmtTime(b.time)}
                </span>
                <div className="text-sm text-cream-dim">
                  {b.services?.name || 'услуга: на месте'}
                  {b.with_design ? ', дизайн' : ''}
                  {b.price ? `, ${fmtMoney(b.price)}` : ''}
                </div>
              </div>
              <StatusChip status={b.status} />
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center pb-2">
        <MinionPeek width={110} />
      </div>

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
