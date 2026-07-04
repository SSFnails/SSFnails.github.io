import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, uploadReference } from './lib/supabase'
import { fmtTime, todayISO } from './lib/format'
import { Btn, Field, Modal, Toggle, inputCls } from './ui'

// Быстрая запись от лица мастера: клиент, дата, окошко, услуга, цена сама
export default function BookingForm({ defaultDate, defaultSlotId, onClose, onSaved }) {
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState(null)
  const [newClient, setNewClient] = useState(null) // {name, telegram} или null
  const [date, setDate] = useState(defaultDate || todayISO())
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [slotId, setSlotId] = useState(defaultSlotId || null)
  const [newTime, setNewTime] = useState('')
  const [addingTime, setAddingTime] = useState(false)
  const [serviceId, setServiceId] = useState(null)
  const [withDesign, setWithDesign] = useState(false)
  // сколько ногтей с дизайном: до 5 включено в цену, дальше +100р за ноготь
  const [designNails, setDesignNails] = useState(5)
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [refFile, setRefFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const priceTouched = useRef(false)

  useEffect(() => {
    supabase.from('clients').select('*').order('name').then(({ data }) => setClients(data || []))
    supabase.from('services').select('*').eq('is_active', true).order('sort').then(({ data }) => setServices(data || []))
  }, [])

  useEffect(() => {
    // защита от гонки: при быстрой смене даты старый ответ не должен затирать новый
    let alive = true
    setSlotsLoading(true)
    supabase
      .from('slots')
      .select('*')
      .eq('date', date)
      .eq('status', 'free')
      .order('time')
      .then(({ data }) => {
        if (!alive) return
        const list = data || []
        setSlots(list)
        // выбор не сбрасываем, если выбранное окошко всё ещё в списке
        setSlotId((cur) => {
          if (cur && list.some((s) => s.id === cur)) return cur
          if (defaultSlotId && list.some((s) => s.id === defaultSlotId)) return defaultSlotId
          return null
        })
        setSlotsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [date, defaultSlotId])

  const later = serviceId === 'later' // услугу решат на месте
  const service = later ? null : services.find((s) => s.id === serviceId)

  const extraNails = withDesign ? Math.max(0, designNails - 5) : 0

  useEffect(() => {
    if (later) return
    if (!service) return
    if (priceTouched.current) return
    const base = withDesign ? (service.price_design ?? service.price_plain) : service.price_plain
    setPrice(String(base + extraNails * 100))
  }, [serviceId, withDesign, extraNails, services]) // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients.slice(0, 6)
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.label || '').toLowerCase().includes(q) ||
          (c.telegram || '').toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [clients, search])

  const chosenClient = clients.find((c) => c.id === clientId)

  async function addSlot() {
    if (!newTime || addingTime) return
    setAddingTime(true)
    setError('')
    const { data, error } = await supabase
      .from('slots')
      .insert({ date, time: newTime, status: 'free' })
      .select()
      .single()
    setAddingTime(false)
    if (error) {
      setError('Не получилось добавить время. Может, оно уже есть в этот день.')
      return
    }
    setSlots((s) => [...s, data].sort((a, b) => a.time.localeCompare(b.time)))
    setSlotId(data.id)
    setNewTime('')
  }

  async function save() {
    setError('')
    if (!clientId && !newClient?.name?.trim()) return setError('Выбери клиента или создай нового.')
    if (!slotId && !newTime) return setError('Выбери окошко или укажи время.')
    if (!serviceId) return setError('Выбери услугу.')
    setBusy(true)
    try {
      // окошко: либо выбранное, либо создаём сами из указанного времени
      let slot = slots.find((s) => s.id === slotId)
      if (!slot) {
        const { data, error } = await supabase
          .from('slots')
          .insert({ date, time: newTime, status: 'free' })
          .select()
          .single()
        if (error) {
          // время в этот день уже есть: если оно свободно, просто берём его
          const { data: existing } = await supabase
            .from('slots')
            .select('*')
            .eq('date', date)
            .eq('time', newTime)
            .maybeSingle()
          if (existing?.status === 'free') slot = existing
          else {
            setError('Это время в этот день уже занято, выбери другое.')
            setBusy(false)
            return
          }
        } else {
          slot = data
        }
      }
      let cid = clientId
      if (!cid) {
        const { data, error } = await supabase
          .from('clients')
          .insert({ name: newClient.name.trim(), telegram: newClient.telegram?.trim() || null })
          .select()
          .single()
        if (error) throw error
        cid = data.id
      }
      let refUrl = null
      if (refFile) refUrl = await uploadReference(refFile)
      const { data: booking, error: be } = await supabase
        .from('bookings')
        .insert({
          client_id: cid,
          slot_id: slot.id,
          date,
          time: slot.time,
          service_id: later ? null : serviceId,
          with_design: later ? false : withDesign,
          extra_design_nails: extraNails,
          price: Number(price) || 0,
          reference_url: refUrl,
          status: 'confirmed',
          notes: note.trim() || null,
        })
        .select()
        .single()
      if (be) throw be
      // занимаем окошко, только если оно всё ещё свободно (вдруг клиентка успела раньше)
      const { data: taken, error: se } = await supabase
        .from('slots')
        .update({ status: 'busy', booking_id: booking.id })
        .eq('id', slot.id)
        .eq('status', 'free')
        .select()
      if (se) throw se
      if (!taken || taken.length === 0) {
        await supabase.from('bookings').delete().eq('id', booking.id)
        setError('Ой, это окошко только что заняли. Выбери другое время.')
        setBusy(false)
        return
      }
      onSaved()
    } catch (e) {
      console.error(e)
      setError('Не сохранилось, проверь интернет и попробуй ещё раз. Данные формы на месте.')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Новая запись">
      <div className="space-y-5">
        {/* Клиент */}
        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-cream-dim">Клиент</span>
          {chosenClient ? (
            <div className="flex items-center justify-between rounded-lg bg-espresso px-3.5 py-3">
              <span>
                {chosenClient.name}
                {chosenClient.telegram && <span className="ml-2 text-sm text-cream-dim">{chosenClient.telegram}</span>}
                {chosenClient.has_allergy && <span className="ml-2 text-xs text-danger">аллергия</span>}
              </span>
              <button className="text-sm text-gold" onClick={() => setClientId(null)}>
                сменить
              </button>
            </div>
          ) : newClient ? (
            <div className="space-y-2">
              <input
                className={inputCls}
                placeholder="Имя"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                autoFocus
              />
              <input
                className={inputCls}
                placeholder="Телеграм, например @anna"
                value={newClient.telegram}
                onChange={(e) => setNewClient({ ...newClient, telegram: e.target.value })}
              />
              <button className="text-sm text-cream-dim" onClick={() => setNewClient(null)}>
                назад к поиску
              </button>
            </div>
          ) : (
            <div>
              <input
                className={inputCls}
                placeholder="Найти по имени или телеграму"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClientId(c.id)}
                    className="rounded-full bg-espresso px-3.5 py-2 text-sm active:bg-mocha-2"
                  >
                    {c.name}
                    {c.label && <span className="ml-1.5 text-xs text-gold">{c.label}</span>}
                    {c.has_allergy && <span className="ml-1.5 text-danger">●</span>}
                  </button>
                ))}
                <button
                  onClick={() => setNewClient({ name: search.trim(), telegram: '' })}
                  className="rounded-full border border-gold/50 px-3.5 py-2 text-sm text-gold"
                >
                  + новый клиент
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Дата и окошко */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дата">
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Добавить время">
            <div className="flex gap-2">
              <input className={inputCls} type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              <Btn kind="ghost" onClick={addSlot} disabled={addingTime || !newTime} className="shrink-0 px-3">
                {addingTime ? '...' : '+'}
              </Btn>
            </div>
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-cream-dim">Окошко</span>
          {slotsLoading ? (
            <p className="text-sm text-cream-dim">Смотрю окошки...</p>
          ) : (
            <>
              {slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSlotId(slotId === s.id ? null : s.id)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                        slotId === s.id ? 'bg-gold text-espresso' : 'bg-espresso text-cream'
                      }`}
                    >
                      {fmtTime(s.time)}
                    </button>
                  ))}
                </div>
              )}
              {slots.length === 0 && !newTime && (
                <p className="text-sm text-cream-dim">
                  На этот день свободных окошек нет. Укажи время выше, окошко создастся само.
                </p>
              )}
              {newTime && !slotId && (
                <p className={`text-sm text-gold ${slots.length > 0 ? 'mt-2' : ''}`}>
                  Запишем на {newTime}, окошко создастся само.
                </p>
              )}
            </>
          )}
        </div>

        {/* Услуга */}
        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-cream-dim">Услуга</span>
          <div className="space-y-1.5">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  priceTouched.current = false
                  setServiceId(s.id)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm ${
                  serviceId === s.id ? 'bg-gold text-espresso' : 'bg-espresso text-cream'
                }`}
              >
                <span>
                  <span className={`block text-[11px] uppercase tracking-wide ${serviceId === s.id ? 'text-espresso/60' : 'text-cream-dim'}`}>
                    {s.category}
                  </span>
                  {s.name}
                </span>
                <span className="shrink-0 pl-3 font-medium">
                  {s.price_plain}
                  {s.price_design ? ` / ${s.price_design}` : ''}
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                priceTouched.current = false
                setServiceId('later')
                setWithDesign(false)
                setPrice('')
              }}
              className={`w-full rounded-lg border border-dashed px-3.5 py-2.5 text-left text-sm ${
                later ? 'border-gold bg-gold/15 text-gold' : 'border-line text-cream-dim'
              }`}
            >
              Решим на месте
            </button>
          </div>
        </div>

        {service?.price_design != null && (
          <div>
            <div className="flex items-center justify-between">
              <Toggle checked={withDesign} onChange={(v) => { priceTouched.current = false; setWithDesign(v) }} label="С дизайном" />
              {withDesign && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-cream-dim">ногтей</span>
                  <button className="h-8 w-8 rounded-lg bg-espresso" onClick={() => { priceTouched.current = false; setDesignNails(Math.max(1, designNails - 1)) }}>−</button>
                  <span className="w-4 text-center">{designNails}</span>
                  <button className="h-8 w-8 rounded-lg bg-espresso" onClick={() => { priceTouched.current = false; setDesignNails(Math.min(10, designNails + 1)) }}>+</button>
                </div>
              )}
            </div>
            {withDesign && (
              <p className="mt-1.5 text-xs text-cream-dim">
                До 5 ногтей включено в цену.
                {extraNails > 0 ? ` Сверх пяти: ${extraNails} по 100р, итого +${extraNails * 100}р.` : ''}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена, р.">
            <input
              className={inputCls}
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                priceTouched.current = true
                setPrice(e.target.value)
              }}
            />
          </Field>
          <Field label="Референс">
            <label className={`${inputCls} block cursor-pointer truncate text-cream-dim`}>
              {refFile ? refFile.name : 'фото...'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setRefFile(e.target.files[0] || null)} />
            </label>
          </Field>
        </div>

        <Field label="Заметка">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Btn onClick={save} disabled={busy} className="w-full">
          {busy ? 'Сохраняю...' : 'Записать'}
        </Btn>
      </div>
    </Modal>
  )
}
