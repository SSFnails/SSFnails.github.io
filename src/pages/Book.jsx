import { useEffect, useMemo, useState } from 'react'
import { supabase, configured, uploadReference } from '../lib/supabase'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { fmtDateFull, fmtTime, todayISO } from '../lib/format'
import { Btn, Field, Plate, Spinner, Toggle, inputCls } from '../ui'
import MonthSheet from '../MonthSheet'

// Публичная страница самозаписи: только свободные окошки, заявка уходит мастеру
export default function Book() {
  const [slots, setSlots] = useState(null)
  const [services, setServices] = useState([])
  const [date, setDate] = useState(null)
  const [slotId, setSlotId] = useState(null)
  const [serviceId, setServiceId] = useState(null)
  const [withDesign, setWithDesign] = useState(false)
  const [name, setName] = useState('')
  const [telegram, setTelegram] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [refFile, setRefFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [slotLost, setSlotLost] = useState(false)

  async function loadSlots() {
    // берём и занятые: они показываются перечёркнутыми, как на картинках мастера
    const { data } = await supabase
      .from('slots')
      .select('id, date, time, status')
      .gte('date', todayISO())
      .order('date')
      .order('time')
    setSlots(data || [])
  }

  useEffect(() => {
    if (!configured) return
    loadSlots()
    supabase.from('services').select('*').eq('is_active', true).order('sort').then(({ data }) => setServices(data || []))
  }, []) // eslint-disable-line

  // окошки обновляются сами, чтобы нельзя было выбрать уже занятое
  useAutoRefresh(loadSlots, 30000)

  // если выбранное время только что заняли, честно скажем сразу
  useEffect(() => {
    if (slots !== null && slotId && !slots.some((s) => s.id === slotId && s.status === 'free')) {
      setSlotId(null)
      setSlotLost(true)
    }
  }, [slots, slotId])

  const byDate = useMemo(() => {
    const m = {}
    for (const s of slots || []) (m[s.date] ||= []).push(s)
    return m
  }, [slots])

  const freeByDate = useMemo(() => {
    const m = {}
    for (const s of slots || []) if (s.status === 'free') (m[s.date] ||= []).push(s)
    return m
  }, [slots])

  const dates = Object.keys(freeByDate).sort()

  // месяц календаря: открываемся на первом месяце со свободными окошками
  const [cursor, setCursor] = useState(null)
  useEffect(() => {
    if (cursor !== null || slots === null) return
    const first = dates[0] || Object.keys(byDate).sort()[0]
    const d = first ? new Date(first + 'T12:00:00') : new Date()
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [slots]) // eslint-disable-line

  const monthKeys = useMemo(() => {
    const keys = new Set(Object.keys(byDate).map((d) => d.slice(0, 7)))
    keys.add(todayISO().slice(0, 7))
    return [...keys].sort()
  }, [byDate])
  const cursorKey = cursor ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}` : ''
  const later = serviceId === 'later' // услугу решат на месте
  const service = later ? null : services.find((s) => s.id === serviceId)
  const price = service ? (withDesign ? (service.price_design ?? service.price_plain) : service.price_plain) : null

  async function submit() {
    setError('')
    if (!slotId) return setError('Выберите дату и время.')
    if (!serviceId) return setError('Выберите услугу.')
    if (!name.trim() || !telegram.trim() || !phone.trim())
      return setError('Напишите имя, телеграм и телефон, чтобы мастер могла с вами связаться.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Проверьте телефон, в нём не хватает цифр.')
    setBusy(true)
    try {
      let refUrl = null
      if (refFile) refUrl = await uploadReference(refFile)
      const { error: e } = await supabase.rpc('create_public_booking', {
        p_slot_id: slotId,
        p_service_id: later ? null : serviceId,
        p_with_design: later ? false : withDesign,
        p_name: name.trim(),
        p_telegram: telegram.trim(),
        p_phone: phone.trim(),
        p_reference_url: refUrl,
        p_note: note.trim(),
      })
      if (e) {
        if ((e.message || '').includes('SLOT_TAKEN')) {
          setError('Ой, это окошко только что заняли. Выберите, пожалуйста, другое.')
          await loadSlots()
          setSlotId(null)
        } else {
          setError('Что-то пошло не так. Проверьте интернет и попробуйте ещё раз, всё введённое сохранилось.')
        }
        setBusy(false)
        return
      }
      setSent(true)
    } catch {
      setError('Что-то пошло не так. Проверьте интернет и попробуйте ещё раз, всё введённое сохранилось.')
      setBusy(false)
    }
  }

  if (!configured) return null

  if (sent) {
    return (
      <Wrap>
        <div className="py-16 text-center">
          <div className="font-display text-3xl">Заявка отправлена</div>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
            Мастер посмотрит её и напишет вам в телеграм, чтобы подтвердить запись. Адрес пришлёт за сутки до визита.
          </p>
        </div>
      </Wrap>
    )
  }

  return (
    <Wrap>
      {slots === null ? (
        <Spinner />
      ) : (
        <div className="space-y-8 pb-16">
          <section>
            <Plate>Свободные окошки</Plate>
            {Object.keys(byDate).length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Свободных окошек сейчас нет. Загляните позже или напишите мастеру в телеграм.
              </p>
            ) : (
              <div className="mt-4">
                {cursor && (
                  <MonthSheet
                    dense
                    cursor={cursor}
                    onShift={(n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))}
                    byDate={byDate}
                    selected={date}
                    onPickDay={(d) => {
                      setDate(d)
                      setSlotId(null)
                    }}
                    canPrev={cursorKey > monthKeys[0]}
                    canNext={cursorKey < monthKeys[monthKeys.length - 1]}
                  />
                )}
                {dates.length === 0 && (
                  <p className="mt-3 text-sm text-cream-dim">
                    Всё занято. Загляните позже, окошки открываются регулярно.
                  </p>
                )}
              </div>
            )}
            {slotLost && (
              <p className="mt-3 rounded-lg bg-gold/10 px-3.5 py-2.5 text-sm text-gold">
                Ой, это время только что заняли. Выберите, пожалуйста, другое.
              </p>
            )}
            {date && freeByDate[date] && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-cream-dim">{fmtDateFull(date)}, время:</p>
                <div className="flex flex-wrap gap-2">
                  {freeByDate[date].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSlotId(s.id)
                        setSlotLost(false)
                      }}
                      className={`rounded-lg px-5 py-2.5 text-sm font-medium ${
                        slotId === s.id ? 'bg-gold text-espresso' : 'bg-mocha text-cream'
                      }`}
                    >
                      {fmtTime(s.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <Plate>Услуга</Plate>
            <p className="mt-2 text-xs text-cream-dim">Цены: однотон / дизайн.</p>
            <div className="mt-3 space-y-1.5">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm ${
                    serviceId === s.id ? 'bg-gold text-espresso' : 'bg-mocha text-cream'
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
                onClick={() => setServiceId('later')}
                className={`w-full rounded-lg border border-dashed px-4 py-3 text-left text-sm ${
                  later ? 'border-gold bg-gold/15 text-gold' : 'border-line text-cream-dim'
                }`}
              >
                Пока не знаю, решим на месте
              </button>
            </div>
            {later && (
              <p className="mt-2 text-sm text-cream-dim">
                Хорошо, определитесь с мастером на месте. Стоимость будет по прайсу выше.
              </p>
            )}
            {service?.price_design != null && (
              <div className="mt-3">
                <Toggle checked={withDesign} onChange={setWithDesign} label="Хочу с дизайном" />
              </div>
            )}
            {price != null && (
              <p className="mt-2 text-sm text-cream-dim">
                Стоимость: <span className="font-display text-lg text-gold">{price} р.</span>
                {withDesign && ' (дизайн до 5 ногтей, дальше +100р за ноготь)'}
              </p>
            )}
          </section>

          <section>
            <Plate>О вас</Plate>
            <div className="mt-3 space-y-4">
              <Field label="Имя">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Телеграм">
                <input className={inputCls} value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@ваш_ник" />
              </Field>
              <Field label="Телефон">
                <input
                  className={inputCls}
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 900 000 00 00"
                />
              </Field>
              <Field label="Референс, если есть">
                <label className={`${inputCls} block cursor-pointer truncate text-cream-dim`}>
                  {refFile ? refFile.name : 'Прикрепить фото желаемого дизайна'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setRefFile(e.target.files[0] || null)} />
                </label>
              </Field>
              <Field label="Комментарий">
                <textarea className={`${inputCls} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Пожелания, вопросы. Если у вас аллергия, обязательно напишите: у мастера дома живёт кот." />
              </Field>
            </div>
          </section>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Btn onClick={submit} disabled={busy} className="w-full !py-4 text-base">
            {busy ? 'Отправляю...' : 'Записаться'}
          </Btn>

          <p className="text-center text-xs leading-relaxed text-cream-dim">
            Запись подтверждает мастер, она напишет вам в телеграм.
            <br />
            Адрес высылается за сутки до визита.
          </p>
        </div>
      )}
    </Wrap>
  )
}

function Wrap({ children }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-5">
      <header className="py-10 text-center">
        <div className="font-display leading-none">
          <div className="text-4xl font-semibold tracking-wide">SSF</div>
          <div className="mt-1 text-2xl italic text-gold">nails</div>
        </div>
        <p className="mt-4 text-sm text-cream-dim">Запись на маникюр</p>
      </header>
      {children}
    </div>
  )
}
