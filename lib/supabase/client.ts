import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  try {
    const parsed = new URL(url)
    const protocolOk = parsed.protocol === 'https:' || parsed.protocol === 'http:'
    if (!protocolOk) {
      throw new Error('Protocolo inválido na URL do Supabase')
    }
    if (!parsed.hostname.endsWith('.supabase.co')) {
      console.warn('Hostname do Supabase parece inválido:', parsed.hostname)
    }
  } catch (e) {
    console.error('NEXT_PUBLIC_SUPABASE_URL inválida. Verifique .env e reinicie o servidor.', e)
  }
  return createBrowserClient(url, key)
}
