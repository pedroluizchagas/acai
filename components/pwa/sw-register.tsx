'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]'
    )

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        if (isLocalhost) {
          console.info('Service worker registrado em:', reg.scope)
        }
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (vapid && 'pushManager' in reg) {
          const sub = await reg.pushManager.getSubscription()
          if (!sub) {
            const perm = await Notification.requestPermission()
            if (perm === 'granted') {
              const key = urlBase64ToUint8Array(vapid)
              const newSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: key,
              })
              const supabase = createClient()
              const { data: userData } = await supabase.auth.getUser()
              const uid = userData.user?.id
              if (uid) {
                const info = newSub.toJSON() as any
                await supabase.from('push_subscriptions').insert({
                  user_id: uid,
                  endpoint: info.endpoint,
                  p256dh: info.keys.p256dh,
                  auth: info.keys.auth,
                })
              }
            }
          }
        }
      } catch (e) {
        if (isLocalhost) {
          console.warn('Falha ao registrar SW:', e)
        }
      }
    }
    register()
  }, [])

  return null
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
