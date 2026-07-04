import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { fmtDateFull, fmtTime } from './lib/format'
import { AllergyBadge, Btn, Modal, StatusChip, Toggle, inputCls } from './ui'

// Карточка записи: детали, референс, смена статуса, тумблер адреса
export default function BookingDetails({ booking, onClose, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const b = booking
  const client = b.clients
  const service = b.services
  const [priceText, setPriceText] = useState(String(b.price ?? 0))
  const savedPrice = useRef(b.price ?? 0)
  const dirty = useRef(false)

  // цена сохраняется тихо, карточка не закрывается; списки обновятся при закрытии
  async function savePrice() {
    const n = Number(priceText)
    if (!Number.isFinite(n) || n < 0) {
      setPriceText(String(savedPrice.current))
      return
    }
    if (n === savedPrice.current) return
    const { error: e } = await supabase.from('bookings').update({ price: n }).eq('id', b.id)
    if (e) {
      setError('Цена не сохранилась, попробуй ещё раз.')
      return
    }
    savedPrice.current = n
    dirty.current = true
  }

  function close() {
    if (dirty.current) onChanged()
    else onClose()
  }

  async function setStatus(status) {
    if (status === 'done' && savedPrice.current === 0 && !(Number(priceText) > 0)) {
      const ok = window.confirm('Цена стоит 0 р. Записать в доход как бесплатную? Если цена другая, сначала впиши её выше.')
      if (!ok) return
    }
    setBusy(true)
    setError('')
    await savePrice()
    const { error: e1 } = await supabase.from('bookings').update({ status }).eq('id', b.id)
    if (e1) {
      setError('Не сохранилось, попробуй ещё раз.')
      setBusy(false)
      return
    }
    // отмена освобождает окошко, как её "разчеркивание"
    if (status === 'cancelled' && b.slot_id) {
      await supabase.from('slots').update({ status: 'free', booking_id: null }).eq('id', b.slot_id)
    }
    onChanged()
  }

  async function toggleAddress(v) {
    const { error: e } = await supabase.from('bookings').update({ address_sent: v }).eq('id', b.id)
    if (!e) onChanged()
  }

  // полное удаление, для ошибочных и тестовых записей
  async function removeBooking() {
    const ok = window.confirm(
      'Удалить запись насовсем? Она исчезнет из истории и из дохода, окошко снова станет свободным. Вернуть будет нельзя.',
    )
    if (!ok) return
    setBusy(true)
    if (b.slot_id) {
      await supabase.from('slots').update({ status: 'free', booking_id: null }).eq('id', b.slot_id)
    }
    const { error: e } = await supabase.from('bookings').delete().eq('id', b.id)
    if (e) {
      setError('Не получилось удалить, попробуй ещё раз.')
      setBusy(false)
      return
    }
    onChanged()
  }

  return (
    <Modal onClose={close} title={`${fmtDateFull(b.date)}, ${fmtTime(b.time)}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={b.status} />
          {client?.has_allergy && <AllergyBadge note={client.allergy_note} />}
        </div>

        {client?.has_allergy && (
          <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            У клиентки аллергия{client.allergy_note ? `: ${client.allergy_note}` : ''}. У тебя дома кот, предупреди её заранее.
          </p>
        )}

        <div className="rounded-lg bg-espresso p-4">
          {client ? (
            <span className="flex flex-wrap items-center gap-2">
              <Link to={`/clients/${client.id}`} className="font-display text-lg text-cream underline decoration-gold/40 underline-offset-4">
                {client.name}
              </Link>
              {client.label && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">{client.label}</span>
              )}
            </span>
          ) : (
            <span className="text-cream-dim">Клиент удалён</span>
          )}
          {client?.telegram && <div className="mt-0.5 text-sm text-gold">{client.telegram}</div>}
          {client?.phone && (
            <a href={`tel:${client.phone}`} className="mt-0.5 block text-sm text-cream">
              {client.phone}
            </a>
          )}
          <div className="mt-3 text-sm text-cream-dim">
            {service ? `${service.category}: ${service.name}` : 'Услуга: решим на месте'}
            {b.with_design
              ? b.extra_design_nails > 0
                ? `, дизайн на ${5 + b.extra_design_nails} ногтей (+${b.extra_design_nails * 100}р)`
                : ', с дизайном'
              : ''}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              className={`${inputCls} !w-28 !py-2 font-display text-lg !text-gold`}
              type="number"
              inputMode="numeric"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              onBlur={savePrice}
            />
            <span className="text-sm text-cream-dim">р. (можно поправить)</span>
          </div>
          {!service && savedPrice.current === 0 && b.status !== 'cancelled' && (
            <p className="mt-1.5 text-xs text-gold">
              Услугу решали на месте: не забудь вписать цену, она пойдёт в доход.
            </p>
          )}
          {b.notes && <div className="mt-2 text-sm text-cream-dim">Заметка: {b.notes}</div>}
        </div>

        {b.reference_url && (
          <a href={b.reference_url} target="_blank" rel="noreferrer" className="block">
            <img src={b.reference_url} alt="Референс" className="max-h-64 w-full rounded-lg object-cover" />
          </a>
        )}

        {(b.status === 'new' || b.status === 'confirmed') && (
          <Toggle checked={b.address_sent} onChange={toggleAddress} label="Адрес отправлен" />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          {b.status === 'new' && (
            <Btn onClick={() => setStatus('confirmed')} disabled={busy} className="col-span-2">
              Подтвердить запись
            </Btn>
          )}
          {(b.status === 'new' || b.status === 'confirmed') && (
            <>
              <Btn kind="ghost" onClick={() => setStatus('done')} disabled={busy}>
                Выполнена
              </Btn>
              <Btn kind="ghost" onClick={() => setStatus('no_show')} disabled={busy}>
                Не пришла
              </Btn>
              <Btn kind="danger" onClick={() => setStatus('cancelled')} disabled={busy} className="col-span-2">
                Отменить, окошко снова свободно
              </Btn>
            </>
          )}
          {(b.status === 'done' || b.status === 'no_show' || b.status === 'cancelled') && (
            <Btn kind="ghost" onClick={() => setStatus('confirmed')} disabled={busy} className="col-span-2">
              Вернуть в подтверждённые
            </Btn>
          )}
        </div>

        <button
          onClick={removeBooking}
          disabled={busy}
          className="w-full pt-1 text-center text-xs text-danger/60 active:text-danger"
        >
          Удалить запись насовсем
        </button>
      </div>
    </Modal>
  )
}
