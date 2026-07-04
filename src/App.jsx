import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { supabase, configured } from './lib/supabase'
import { Minion } from './ui'
import Login from './pages/Login'
import Today from './pages/Today'
import Calendar from './pages/Calendar'
import Clients from './pages/Clients'
import ClientCard from './pages/ClientCard'
import Income from './pages/Income'
import More from './pages/More'
import Book from './pages/Book'

function Logo({ className = '' }) {
  return (
    <div className={`font-display leading-none ${className}`}>
      <span className="text-2xl font-semibold tracking-wide">SSF</span>
      <span className="ml-1.5 text-xl italic text-gold">nails</span>
    </div>
  )
}

function Setup() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Logo className="mb-8" />
      <h1 className="font-display mb-4 text-2xl">Осталось подключить базу</h1>
      <p className="mb-3 text-sm leading-relaxed text-cream-dim">
        Создай файл <code className="text-gold">.env</code> в корне проекта и добавь ключи из
        Supabase (Settings, API):
      </p>
      <pre className="rounded-lg bg-mocha p-4 text-xs text-cream-dim">
        {'VITE_SUPABASE_URL=https://xxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ...'}
      </pre>
      <p className="mt-3 text-sm text-cream-dim">
        Подробная инструкция в файле README.md.
      </p>
    </div>
  )
}

const tabs = [
  { to: '/', label: 'Сегодня', icon: '☀' },
  { to: '/calendar', label: 'Календарь', icon: '▦' },
  { to: '/clients', label: 'Клиенты', icon: '♥' },
  { to: '/income', label: 'Доход', icon: '₽' },
  { to: '/more', label: 'Ещё', icon: '⋯' },
]

function Shell({ children }) {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-24 sm:pb-6">
      <header className="flex items-center justify-between px-5 pb-2 pt-5 sm:pt-8">
        <Logo />
        <nav className="hidden gap-1 sm:flex">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-mocha text-gold' : 'text-cream-dim hover:text-cream'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="px-5 pt-3">{children}</main>
      <footer className="mt-10 flex flex-col items-center gap-1 px-5 pb-4">
        <Minion size={60} arms="up" heart className="bob" />
        <p className="text-xs text-cream-dim">SSF nails, сделано с любовью Марком</p>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/40 bg-espresso/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl justify-around pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] ${
                  isActive ? 'text-gold' : 'text-cream-dim'
                }`
              }
            >
              <span className="text-base leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (location.pathname.startsWith('/book')) {
    return <Book />
  }

  if (!configured) return <Setup />
  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientCard />} />
        <Route path="/income" element={<Income />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
