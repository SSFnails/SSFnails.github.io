// Ежедневный пинг базы, чтобы бесплатный Supabase не засыпал от неактивности
export default async function handler(req, res) {
  const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/services?select=id&limit=1`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY },
  })
  res.status(200).json({ ok: r.ok, at: new Date().toISOString() })
}
