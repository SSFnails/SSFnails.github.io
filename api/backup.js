// Еженедельный автобэкап: складывает снимок всех таблиц в закрытое хранилище Supabase
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  const tables = ['clients', 'services', 'slots', 'bookings', 'transactions']
  const dump = { created_at: new Date().toISOString() }
  for (const t of tables) {
    const r = await fetch(`${url}/rest/v1/${t}?select=*`, { headers })
    if (!r.ok) return res.status(500).json({ ok: false, table: t, status: r.status })
    dump[t] = await r.json()
  }

  const name = `backup-${new Date().toISOString().slice(0, 10)}.json`
  const up = await fetch(`${url}/storage/v1/object/backups/${name}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(dump),
  })
  if (!up.ok) return res.status(500).json({ ok: false, upload: await up.text() })

  res.status(200).json({ ok: true, file: name, bookings: dump.bookings.length, clients: dump.clients.length })
}
