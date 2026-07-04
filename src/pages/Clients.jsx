import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtMoney } from '../lib/format'
import { AllergyBadge, Btn, Card, Empty, Field, MinionPeek, Modal, Spinner, Toggle, inputCls } from '../ui'

export default function Clients() {
  const [clients, setClients] = useState(null)
  const [totals, setTotals] = useState({})
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  async function load() {
    const [{ data: cs }, { data: bs }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('bookings').select('client_id, price').eq('status', 'done'),
    ])
    const t = {}
    for (const b of bs || []) t[b.client_id] = (t[b.client_id] || 0) + (b.price || 0)
    setClients(cs || [])
    setTotals(t)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!clients) return []
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.label || '').toLowerCase().includes(q) ||
        (c.telegram || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q),
    )
  }, [clients, search])

  if (!clients) return <Spinner />

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Клиенты</h1>
        <Btn onClick={() => setShowNew(true)} className="!py-2">
          + Добавить
        </Btn>
      </div>
      <input
        className={`${inputCls} mt-4`}
        placeholder="Поиск по имени, телеграму, телефону"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-4 space-y-2">
        {filtered.length === 0 && <Empty>Пока никого не нашлось.</Empty>}
        {filtered.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}`} className="block">
            <Card className="flex items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {c.name}
                  {c.label && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-normal text-gold">{c.label}</span>
                  )}
                  {c.has_allergy && <AllergyBadge note={c.allergy_note} />}
                </div>
                <div className="mt-0.5 text-sm text-cream-dim">
                  {[c.telegram, c.phone].filter(Boolean).join(', ') || 'без контактов'}
                </div>
              </div>
              {totals[c.id] > 0 && <span className="text-sm text-gold">{fmtMoney(totals[c.id])}</span>}
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex justify-center pb-2">
        <MinionPeek width={140} />
      </div>

      {showNew && (
        <NewClientModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function NewClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', label: '', telegram: '', phone: '', has_allergy: false, allergy_note: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!form.name.trim()) return setError('Нужно хотя бы имя.')
    setBusy(true)
    const { error: e } = await supabase.from('clients').insert({
      name: form.name.trim(),
      label: form.label.trim() || null,
      telegram: form.telegram.trim() || null,
      phone: form.phone.trim() || null,
      has_allergy: form.has_allergy,
      allergy_note: form.allergy_note.trim() || null,
      notes: form.notes.trim() || null,
    })
    if (e) {
      setError('Не сохранилось, попробуй ещё раз.')
      setBusy(false)
      return
    }
    onSaved()
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal onClose={onClose} title="Новый клиент">
      <div className="space-y-4">
        <Field label="Имя">
          <input className={inputCls} value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Подпись для себя">
          <input className={inputCls} value={form.label} onChange={set('label')} placeholder="Например: Аня с работы" />
        </Field>
        <Field label="Телеграм">
          <input className={inputCls} value={form.telegram} onChange={set('telegram')} placeholder="@anna" />
        </Field>
        <Field label="Телефон">
          <input className={inputCls} value={form.phone} onChange={set('phone')} inputMode="tel" />
        </Field>
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <Btn onClick={save} disabled={busy} className="w-full">
          {busy ? 'Сохраняю...' : 'Сохранить'}
        </Btn>
      </div>
    </Modal>
  )
}
