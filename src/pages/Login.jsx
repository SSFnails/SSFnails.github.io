import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Field, Minion, inputCls } from '../ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    // можно входить по простому логину: без @ он превращается в служебную почту
    const login = email.trim().includes('@') ? email.trim() : `${email.trim().toLowerCase()}@ssfnails.local`
    const { error } = await supabase.auth.signInWithPassword({ email: login, password })
    if (error) setError('Не получилось войти. Проверь логин и пароль.')
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="font-display mb-2 text-center leading-none">
        <div className="text-4xl font-semibold tracking-wide">SSF</div>
        <div className="mt-1 text-2xl italic text-gold">nails</div>
      </div>
      <p className="mb-8 text-center text-sm text-cream-dim">Твоё личное пространство для записей</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Логин">
          <input
            className={inputCls}
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </Field>
        <Field label="Пароль">
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Btn type="submit" disabled={busy} className="w-full">
          {busy ? 'Секунду...' : 'Войти'}
        </Btn>
      </form>
      <div className="mt-10 flex flex-col items-center gap-1">
        <Minion size={72} arms="up" className="bob" />
        <p className="text-sm text-cream-dim">Bello!</p>
      </div>
    </div>
  )
}
