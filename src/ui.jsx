import { useEffect, useId } from 'react'

// Миньон для дашборда мастера (она их любит). Клиентам не показываем.
export function Minion({ size = 80, arms = 'down', mood = 'happy', heart = false, polish = false, className = '' }) {
  const id = useId()
  const body = '#F5D03C'
  const dark = '#2b2115'
  const blue = '#3b6ea5'
  return (
    <svg
      width={size * (100 / 130)}
      height={size}
      viewBox={heart ? '0 -24 100 154' : '0 0 100 130'}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-b`}>
          <rect x="20" y="10" width="60" height="96" rx="30" />
        </clipPath>
      </defs>
      {heart && (
        <path
          d="M50 -10 C46 -20, 32 -20, 32 -9 C32 -1, 43 4, 50 11 C57 4, 68 -1, 68 -9 C68 -20, 54 -20, 50 -10 Z"
          fill="#d98f7e"
        />
      )}
      {/* волосинки */}
      <path d="M44 11 Q42 3 36 2" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      <path d="M50 10 Q50 2 50 1" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      <path d="M56 11 Q58 3 64 2" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      {/* руки */}
      {arms === 'up' ? (
        <>
          <path d="M24 72 Q8 62 10 46" fill="none" stroke={body} strokeWidth="8" strokeLinecap="round" />
          <path d="M76 72 Q92 62 90 46" fill="none" stroke={body} strokeWidth="8" strokeLinecap="round" />
          <circle cx="10" cy="44" r="5" fill={dark} />
          <circle cx="90" cy="44" r="5" fill={dark} />
        </>
      ) : (
        <>
          <path d="M23 74 Q14 82 16 92" fill="none" stroke={body} strokeWidth="8" strokeLinecap="round" />
          <path d="M77 74 Q86 82 84 92" fill="none" stroke={body} strokeWidth="8" strokeLinecap="round" />
          <circle cx="16" cy="94" r="5" fill={dark} />
          <circle cx="84" cy="94" r="5" fill={dark} />
        </>
      )}
      {/* тело */}
      <rect x="20" y="10" width="60" height="96" rx="30" fill={body} />
      {/* комбинезон */}
      <g clipPath={`url(#${id}-b)`}>
        <rect x="20" y="82" width="60" height="24" fill={blue} />
        <rect x="39" y="72" width="22" height="14" rx="2" fill={blue} />
        <path d="M20 66 L41 76" stroke={blue} strokeWidth="6" strokeLinecap="round" />
        <path d="M80 66 L59 76" stroke={blue} strokeWidth="6" strokeLinecap="round" />
      </g>
      {/* ремешок очков */}
      <rect x="20" y="37" width="60" height="7" fill={dark} />
      {/* очки и глаз */}
      <circle cx="50" cy="41" r="15" fill="#d9d9d9" stroke="#8f8f8f" strokeWidth="2" />
      <circle cx="50" cy="41" r="10" fill="#fff" />
      {mood === 'sleep' ? (
        <>
          {/* спит: веко закрыто, рядом сопелки */}
          <path d="M42 42 Q50 48 58 42" fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
          <text x="72" y="16" fill="#cfc2b0" fontSize="13" fontFamily="Georgia, serif" fontStyle="italic">z</text>
          <text x="80" y="6" fill="#cfc2b0" fontSize="10" fontFamily="Georgia, serif" fontStyle="italic">z</text>
        </>
      ) : (
        <>
          <circle cx="50" cy="41" r="5.5" fill="#8B5E3C" />
          <circle cx="50" cy="41" r="2.6" fill="#1a1a1a" />
          <circle cx="52" cy="39" r="1.3" fill="#fff" />
        </>
      )}
      {/* рот */}
      {mood === 'wow' ? (
        <ellipse cx="50" cy="66" rx="6" ry="7" fill={dark} />
      ) : mood === 'sleep' ? (
        <path d="M43 66 Q50 70 57 66" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M38 63 Q50 74 62 63" fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
      )}
      {/* лак для ногтей в правой лапке */}
      {polish && arms !== 'up' && (
        <g>
          <rect x="82" y="73" width="13" height="17" rx="3.5" fill="#d98f7e" />
          <rect x="85.5" y="65" width="6" height="9" rx="1.5" fill={dark} />
          <circle cx="88.5" cy="81" r="2.2" fill="#fff" opacity="0.35" />
        </g>
      )}
      {/* ножки и ботинки */}
      <rect x="37" y="104" width="10" height="13" fill={blue} />
      <rect x="53" y="104" width="10" height="13" fill={blue} />
      <ellipse cx="41" cy="120" rx="8" ry="5" fill={dark} />
      <ellipse cx="59" cy="120" rx="8" ry="5" fill={dark} />
    </svg>
  )
}

// Двуглазый миньон подглядывает из-за края
export function MinionPeek({ width = 140, className = '' }) {
  const dark = '#2b2115'
  const body = '#F5D03C'
  const bodyDim = '#e3bc2f'
  return (
    <svg width={width} height={width * (72 / 140)} viewBox="0 0 140 72" className={className} aria-hidden="true">
      {/* волосинки */}
      <path d="M62 18 Q59 8 52 6" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      <path d="M70 16 Q70 6 70 4" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      <path d="M78 18 Q81 8 88 6" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
      {/* макушка */}
      <rect x="38" y="16" width="64" height="60" rx="32" fill={body} />
      {/* ремешок */}
      <rect x="38" y="40" width="64" height="6" fill={dark} />
      {/* очки: два стекла в одной оправе */}
      <rect x="55" y="41" width="30" height="4" fill="#a8a8a8" />
      <circle cx="56" cy="43" r="13" fill="#d6d6d6" stroke="#8f8f8f" strokeWidth="2.5" />
      <circle cx="56" cy="43" r="9" fill="#fff" />
      <circle cx="52.5" cy="45" r="4.5" fill="#8B5E3C" />
      <circle cx="52.5" cy="45" r="2.2" fill="#1a1a1a" />
      <circle cx="54" cy="43.5" r="1.1" fill="#fff" />
      <circle cx="84" cy="43" r="13" fill="#d6d6d6" stroke="#8f8f8f" strokeWidth="2.5" />
      <circle cx="84" cy="43" r="9" fill="#fff" />
      <circle cx="80.5" cy="45" r="4.5" fill="#8B5E3C" />
      <circle cx="80.5" cy="45" r="2.2" fill="#1a1a1a" />
      <circle cx="82" cy="43.5" r="1.1" fill="#fff" />
      {/* румянец */}
      <ellipse cx="46" cy="57" rx="4" ry="2.4" fill="#e78a5e" opacity="0.45" />
      <ellipse cx="94" cy="57" rx="4" ry="2.4" fill="#e78a5e" opacity="0.45" />
      {/* край, за которым он прячется */}
      <rect x="0" y="62" width="140" height="10" rx="3.5" fill="#58402c" />
      {/* ручки держатся за край: ладошка и пальчики */}
      <g>
        <ellipse cx="34" cy="62" rx="9" ry="6" fill={bodyDim} />
        <circle cx="28" cy="59.5" r="3" fill={body} />
        <circle cx="34" cy="58.5" r="3.2" fill={body} />
        <circle cx="40" cy="59.5" r="3" fill={body} />
        <ellipse cx="106" cy="62" rx="9" ry="6" fill={bodyDim} />
        <circle cx="100" cy="59.5" r="3" fill={body} />
        <circle cx="106" cy="58.5" r="3.2" fill={body} />
        <circle cx="112" cy="59.5" r="3" fill={body} />
      </g>
    </svg>
  )
}

export function Plate({ children, className = '' }) {
  return <span className={`plate text-sm ${className}`}>{children}</span>
}

export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-mocha border border-line/40 p-4 ${onClick ? 'cursor-pointer active:bg-mocha-2' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function Btn({ children, onClick, kind = 'primary', className = '', disabled, type = 'button' }) {
  const kinds = {
    primary: 'bg-gold text-espresso font-semibold active:bg-gold-dim',
    ghost: 'bg-mocha-2 text-cream border border-line/60 active:bg-line/40',
    danger: 'bg-mocha-2 text-danger border border-danger/40 active:bg-line/40',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-4 py-3 text-sm transition disabled:opacity-40 ${kinds[kind]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-cream-dim">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg bg-espresso border border-line/60 px-3.5 py-3 text-[15px] text-cream outline-none focus:border-gold/70'

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 py-1"
    >
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-gold' : 'bg-line/60'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-cream transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
      {label && <span className="text-sm text-cream">{label}</span>}
    </button>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-gold" />
    </div>
  )
}

export function Empty({ children }) {
  return <p className="py-8 text-center text-sm text-cream-dim">{children}</p>
}

export function AllergyBadge({ note }) {
  return (
    <span
      title={note || 'Аллергия'}
      className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-semibold text-danger"
    >
      ● аллергия
    </span>
  )
}

export function StatusChip({ status }) {
  const map = {
    new: 'bg-gold/20 text-gold',
    confirmed: 'bg-ok/15 text-ok',
    done: 'bg-cream/10 text-cream-dim',
    cancelled: 'bg-line/40 text-cream-dim line-through',
    no_show: 'bg-danger/15 text-danger',
  }
  const label = {
    new: 'новая',
    confirmed: 'подтверждена',
    done: 'выполнена',
    cancelled: 'отменена',
    no_show: 'не пришла',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  )
}

export function Modal({ onClose, children, title }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => (document.body.style.overflow = '')
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-mocha p-5 pb-8 sm:max-w-lg sm:rounded-2xl scroll-thin"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-cream-dim active:text-cream">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
