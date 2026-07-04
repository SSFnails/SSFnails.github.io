import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { downloadCSV } from '../lib/csv'
import { BOOKING_STATUS, todayISO } from '../lib/format'
import { Btn, Card, Field, Minion, Plate, Spinner, Toggle, inputCls } from '../ui'

export default function More() {
  const [services, setServices] = useState(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    const { data } = await supabase.from('services').select('*').order('sort')
    setServices(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function updateService(id, patch) {
    setServices((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    await supabase.from('services').update(patch).eq('id', id)
  }

  async function removeService(s) {
    const ok = window.confirm(
      `Удалить услугу "${s.name}"? В старых записях она перестанет показываться. Если хочешь просто убрать её со страницы записи, лучше выключи тумблер.`,
    )
    if (!ok) return
    await supabase.from('services').delete().eq('id', s.id)
    load()
  }

  async function exportBookings() {
    setExporting('bookings')
    const { data } = await supabase
      .from('bookings')
      .select('*, clients(name, telegram), services(category, name)')
      .order('date', { ascending: false })
    downloadCSV(
      `записи_${todayISO()}.csv`,
      ['Дата', 'Время', 'Клиент', 'Телеграм', 'Услуга', 'Дизайн', 'Доп. ногтей', 'Цена', 'Статус', 'Адрес отправлен', 'Заметки'],
      (data || []).map((b) => [
        b.date,
        (b.time || '').slice(0, 5),
        b.clients?.name || '',
        b.clients?.telegram || '',
        b.services ? `${b.services.category}: ${b.services.name}` : '',
        b.with_design ? 'да' : 'нет',
        b.extra_design_nails || 0,
        b.price,
        BOOKING_STATUS[b.status] || b.status,
        b.address_sent ? 'да' : 'нет',
        b.notes || '',
      ]),
    )
    setExporting('')
  }

  async function exportClients() {
    setExporting('clients')
    const { data } = await supabase.from('clients').select('*').order('name')
    downloadCSV(
      `клиенты_${todayISO()}.csv`,
      ['Имя', 'Подпись', 'Телеграм', 'Телефон', 'Аллергия', 'Про аллергию', 'Заметки'],
      (data || []).map((c) => [
        c.name,
        c.label || '',
        c.telegram || '',
        c.phone || '',
        c.has_allergy ? 'да' : 'нет',
        c.allergy_note || '',
        c.notes || '',
      ]),
    )
    setExporting('')
  }

  async function exportTransactions() {
    setExporting('transactions')
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    downloadCSV(
      `доходы_расходы_${todayISO()}.csv`,
      ['Дата', 'Тип', 'Сумма', 'Заметка'],
      (data || []).map((t) => [t.date, t.type === 'expense' ? 'расход' : 'доход', t.amount, t.note || '']),
    )
    setExporting('')
  }

  function copyLink() {
    navigator.clipboard.writeText(`${location.origin}/book`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!services) return <Spinner />

  return (
    <div className="space-y-7 pt-2">
      <section>
        <Plate>Ссылка для записи</Plate>
        <p className="mt-2 text-sm text-cream-dim">
          Отправь её клиентам или закрепи в телеграме. Они выберут окошко сами, а заявка придёт к тебе на подтверждение.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-mocha px-3.5 py-3 text-sm text-gold">{location.origin}/book</code>
          <Btn kind="ghost" onClick={copyLink}>
            {copied ? 'Готово' : 'Копировать'}
          </Btn>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <Plate>Услуги и цены</Plate>
          <Minion size={54} polish />
        </div>
        <p className="mt-2 text-sm text-cream-dim">Цены: однотон / дизайн. Меняются сразу, ничего сохранять не нужно.</p>
        <div className="mt-3 space-y-2">
          {services.map((s) => (
            <Card key={s.id} className={`!py-3 ${s.is_active ? '' : 'opacity-50'}`}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-cream-dim">{s.category}</div>
                <button onClick={() => removeService(s)} className="px-2 text-xs text-danger/70 active:text-danger">
                  удалить
                </button>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <NameInput value={s.name} onSave={(v) => updateService(s.id, { name: v })} />
                <div className="flex shrink-0 items-center gap-1.5">
                  <PriceInput value={s.price_plain} onSave={(v) => updateService(s.id, { price_plain: v })} />
                  {s.price_design != null && (
                    <>
                      <span className="text-cream-dim">/</span>
                      <PriceInput value={s.price_design} onSave={(v) => updateService(s.id, { price_design: v })} />
                    </>
                  )}
                  <Toggle checked={s.is_active} onChange={(v) => updateService(s.id, { is_active: v })} />
                </div>
              </div>
            </Card>
          ))}
        </div>
        {adding ? (
          <NewServiceForm
            categories={[...new Set(services.map((s) => s.category))]}
            nextSort={Math.max(0, ...services.map((s) => s.sort)) + 1}
            onDone={() => {
              setAdding(false)
              load()
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Btn kind="ghost" onClick={() => setAdding(true)} className="mt-3 w-full">
            + Добавить услугу
          </Btn>
        )}
        <p className="mt-3 text-xs leading-relaxed text-cream-dim">
          В стоимость включены: снятие, маникюр и укрепление, ремонт до 2х ногтей, дизайн до 5 ногтей. За каждый
          следующий ноготь с дизайном +100р.
        </p>
      </section>

      <section>
        <Plate>Выгрузка</Plate>
        <p className="mt-2 text-sm text-cream-dim">Скачает таблицу для Excel, на всякий случай.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn kind="ghost" onClick={exportBookings} disabled={exporting === 'bookings'}>
            {exporting === 'bookings' ? 'Готовлю...' : 'Записи в Excel'}
          </Btn>
          <Btn kind="ghost" onClick={exportClients} disabled={exporting === 'clients'}>
            {exporting === 'clients' ? 'Готовлю...' : 'Клиенты в Excel'}
          </Btn>
          <Btn kind="ghost" onClick={exportTransactions} disabled={exporting === 'transactions'} className="col-span-2">
            {exporting === 'transactions' ? 'Готовлю...' : 'Доходы и расходы в Excel'}
          </Btn>
        </div>
      </section>

      <section className="pb-4">
        <Btn kind="danger" onClick={() => supabase.auth.signOut()} className="w-full">
          Выйти
        </Btn>
      </section>
    </div>
  )
}

function NewServiceForm({ categories, nextSort, onDone, onCancel }) {
  const [category, setCategory] = useState(categories[0] || '')
  const [newCat, setNewCat] = useState(false)
  const [name, setName] = useState('')
  const [pricePlain, setPricePlain] = useState('')
  const [priceDesign, setPriceDesign] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!category.trim() || !name.trim()) return setError('Заполни категорию и название.')
    const plain = Number(pricePlain)
    if (!Number.isFinite(plain) || plain <= 0) return setError('Укажи цену за однотон.')
    const design = priceDesign === '' ? null : Number(priceDesign)
    if (design !== null && (!Number.isFinite(design) || design <= 0)) return setError('Цена за дизайн какая-то странная.')
    setBusy(true)
    const { error: e } = await supabase.from('services').insert({
      category: category.trim(),
      name: name.trim(),
      price_plain: plain,
      price_design: design,
      is_active: true,
      sort: nextSort,
    })
    if (e) {
      setError('Не сохранилось, попробуй ещё раз.')
      setBusy(false)
      return
    }
    onDone()
  }

  return (
    <Card className="mt-3 space-y-3">
      <div className="font-display text-lg">Новая услуга</div>
      <Field label="Категория">
        {newCat ? (
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Например: Педикюр" autoFocus />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-lg px-3.5 py-2 text-sm ${category === c ? 'bg-gold text-espresso' : 'bg-espresso text-cream'}`}
              >
                {c}
              </button>
            ))}
            <button
              onClick={() => {
                setNewCat(true)
                setCategory('')
              }}
              className="rounded-lg border border-gold/40 px-3.5 py-2 text-sm text-gold"
            >
              + новая
            </button>
          </div>
        )}
      </Field>
      <Field label="Название">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Длина до 3" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Цена однотон, р.">
          <input className={inputCls} type="number" inputMode="numeric" value={pricePlain} onChange={(e) => setPricePlain(e.target.value)} />
        </Field>
        <Field label="Цена дизайн, р.">
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            value={priceDesign}
            onChange={(e) => setPriceDesign(e.target.value)}
            placeholder="Пусто, если нет"
          />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Btn onClick={save} disabled={busy} className="flex-1">
          {busy ? 'Сохраняю...' : 'Добавить'}
        </Btn>
        <Btn kind="ghost" onClick={onCancel}>
          Отмена
        </Btn>
      </div>
    </Card>
  )
}

function NameInput({ value, onSave }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input
      className="w-full min-w-0 rounded-lg bg-transparent px-1 py-1 text-sm text-cream outline-none focus:bg-espresso"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const t = v.trim()
        if (t && t !== value) onSave(t)
        else setV(value)
      }}
    />
  )
}

function PriceInput({ value, onSave }) {
  const [v, setV] = useState(String(value))
  useEffect(() => setV(String(value)), [value])
  return (
    <input
      className={`${inputCls} !w-20 !px-2 !py-1.5 text-center text-sm`}
      type="number"
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v)
        if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n)
        else setV(String(value))
      }}
    />
  )
}
