import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MONTHS, fmtDate, fmtMoney, monthBoundsISO, todayISO, weekBoundsISO } from '../lib/format'
import { Btn, Card, Field, Minion, Modal, Spinner, inputCls } from '../ui'

export default function Income() {
  const [data, setData] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const historyFrom = new Date()
    historyFrom.setMonth(historyFrom.getMonth() - 5, 1)
    const from = `${historyFrom.getFullYear()}-${String(historyFrom.getMonth() + 1).padStart(2, '0')}-01`

    const [{ data: bs }, { data: ts }] = await Promise.all([
      supabase.from('bookings').select('date, price').eq('status', 'done').gte('date', from),
      supabase.from('transactions').select('*').gte('date', from).order('date', { ascending: false }).order('created_at', { ascending: false }),
    ])

    const [wFrom, wTo] = weekBoundsISO()
    const [mFrom] = monthBoundsISO()
    const zero = () => ({ income: 0, expense: 0, count: 0 })
    const week = zero()
    const month = zero()
    const byMonth = {}

    const add = (date, kind, amount, isBooking) => {
      const m = (byMonth[date.slice(0, 7)] ||= zero())
      for (const bucket of [
        m,
        date >= wFrom && date <= wTo ? week : null,
        date >= mFrom ? month : null,
      ]) {
        if (!bucket) continue
        bucket[kind] += amount
        if (isBooking) bucket.count++
      }
    }

    for (const b of bs || []) add(b.date, 'income', b.price || 0, true)
    for (const t of ts || []) add(t.date, t.type, t.amount || 0, false)

    const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]))
    setData({ week, month, months, transactions: (ts || []).slice(0, 20) })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function removeTransaction(t) {
    const ok = window.confirm(`Удалить операцию "${t.note || fmtMoney(t.amount)}"?`)
    if (!ok) return
    await supabase.from('transactions').delete().eq('id', t.id)
    load()
  }

  if (!data) return <Spinner />

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Доход</h1>
        <Btn onClick={() => setShowAdd(true)} className="!py-2">
          + Добавить
        </Btn>
      </div>
      <p className="mt-1 text-sm text-cream-dim">
        Доход: выполненные записи плюс то, что добавишь сама. Расходы: материалы и всё остальное.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <PeriodCard title="Эта неделя" d={data.week} />
        <PeriodCard title="Этот месяц" d={data.month} />
      </div>

      <div className="mt-6 space-y-2">
        <span className="block text-xs uppercase tracking-wider text-cream-dim">По месяцам</span>
        {data.months.length === 0 && <p className="text-sm text-cream-dim">Пока пусто, всё впереди.</p>}
        {data.months.map(([key, m]) => (
          <Card key={key} className="!py-3">
            <div className="flex items-center justify-between">
              <span className="capitalize">
                {MONTHS[Number(key.slice(5)) - 1]} {key.slice(0, 4)}
              </span>
              <span className="font-display text-lg text-gold">{fmtMoney(m.income - m.expense)}</span>
            </div>
            <div className="mt-0.5 text-sm text-cream-dim">
              {plural(m.count)}, доход {fmtMoney(m.income)}
              {m.expense > 0 ? `, расходы ${fmtMoney(m.expense)}` : ''}
            </div>
          </Card>
        ))}
      </div>

      {data.transactions.length > 0 && (
        <div className="mt-6 space-y-2">
          <span className="block text-xs uppercase tracking-wider text-cream-dim">Твои операции</span>
          {data.transactions.map((t) => (
            <Card key={t.id} className="flex items-center justify-between !py-3">
              <div>
                <span className={t.type === 'expense' ? 'text-danger' : 'text-ok'}>
                  {t.type === 'expense' ? '−' : '+'}
                  {fmtMoney(t.amount)}
                </span>
                <span className="ml-2 text-sm text-cream-dim">
                  {t.note || (t.type === 'expense' ? 'расход' : 'доход')}, {fmtDate(t.date)}
                </span>
              </div>
              <button onClick={() => removeTransaction(t)} className="px-2 text-xs text-danger/70 active:text-danger">
                удалить
              </button>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-2 pb-4">
        <Minion
          size={80}
          arms={data.month.income > 0 ? 'up' : 'down'}
          mood={data.month.income - data.month.expense > 0 ? 'wow' : 'happy'}
        />
        <p className="text-sm text-cream-dim">
          {data.month.income > 0 ? 'Ты большая молодец!' : 'Всё ещё впереди!'}
        </p>
      </div>

      {showAdd && (
        <AddTransaction
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function PeriodCard({ title, d }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-cream-dim">{title}</div>
      <div className="font-display mt-2 text-2xl text-gold">{fmtMoney(d.income - d.expense)}</div>
      <div className="mt-1 space-y-0.5 text-sm text-cream-dim">
        <div>{plural(d.count)}</div>
        <div>доход {fmtMoney(d.income)}</div>
        {d.expense > 0 && <div>расходы {fmtMoney(d.expense)}</div>}
      </div>
    </Card>
  )
}

function AddTransaction({ onClose, onSaved }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return setError('Укажи сумму.')
    setBusy(true)
    const { error: e } = await supabase.from('transactions').insert({
      type,
      amount: n,
      note: note.trim() || null,
      date,
    })
    if (e) {
      setError('Не сохранилось, попробуй ещё раз.')
      setBusy(false)
      return
    }
    onSaved()
  }

  return (
    <Modal onClose={onClose} title="Доход или расход">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setType('expense')}
            className={`rounded-lg px-4 py-3 text-sm font-medium ${type === 'expense' ? 'bg-gold text-espresso' : 'bg-espresso text-cream'}`}
          >
            Расход
          </button>
          <button
            onClick={() => setType('income')}
            className={`rounded-lg px-4 py-3 text-sm font-medium ${type === 'income' ? 'bg-gold text-espresso' : 'bg-espresso text-cream'}`}
          >
            Доход
          </button>
        </div>
        <Field label="Сумма, р.">
          <input className={inputCls} type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="На что / за что">
          <input
            className={inputCls}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === 'expense' ? 'Например: гель-лаки, фрезы' : 'Например: обучение, чаевые'}
          />
        </Field>
        <Field label="Дата">
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Btn onClick={save} disabled={busy} className="w-full">
          {busy ? 'Сохраняю...' : 'Сохранить'}
        </Btn>
      </div>
    </Modal>
  )
}

function plural(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} запись`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} записи`
  return `${n} записей`
}
