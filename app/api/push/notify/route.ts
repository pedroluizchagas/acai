import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle()
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const title: string = body?.title || 'Atualização'
  const message: string = body?.body || ''
  const url: string | undefined = body?.url
  const userIds: string[] | undefined = body?.user_ids

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'vapid_misconfigured' }, { status: 500 })
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  let subsQuery = supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
  if (userIds && userIds.length > 0) {
    subsQuery = subsQuery.in('user_id', userIds)
  } else {
    subsQuery = subsQuery
      .select('id, endpoint, p256dh, auth, user_id')
      .in(
        'user_id',
        (
          await supabase.from('couriers').select('id').eq('active', true)
        ).data?.map((r: any) => r.id) || [],
      )
  }
  const { data: subs } = await subsQuery

  const payload = JSON.stringify({
    title,
    body: message,
    data: { url },
  })

  const results: Array<{ id: string; ok: boolean }> = []
  if (subs && subs.length > 0) {
    for (const s of subs) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      } as any
      try {
        await webpush.sendNotification(subscription, payload)
        results.push({ id: s.id, ok: true })
      } catch (e: any) {
        results.push({ id: s.id, ok: false })
      }
    }
  }

  return NextResponse.json({ sent: results.filter((r) => r.ok).length, total: subs?.length || 0 })
}

