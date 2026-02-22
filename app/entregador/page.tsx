'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Phone,
  MapPin,
  LogOut,
  CheckCircle2,
  Truck,
  PackageCheck,
  ChevronRight,
  Home,
  User,
  Power,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'

type QueueAction = {
  id: string
  orderId: string
  patch: Record<string, any>
  createdAt: number
}

function useActionQueue() {
  const key = 'courier-action-queue'
  const read = (): QueueAction[] => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as QueueAction[]) : []
    } catch {
      return []
    }
  }
  const write = (list: QueueAction[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(list))
    } catch {}
  }
  const enqueue = (orderId: string, patch: Record<string, any>) => {
    const q = read()
    q.push({ id: crypto.randomUUID(), orderId, patch, createdAt: Date.now() })
    write(q)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        // @ts-ignore
        if (reg.sync && reg.sync.register) {
          // @ts-ignore
          reg.sync.register('flush-courier-queue').catch(() => {})
        }
      })
    }
  }
  const dequeue = (id: string) => {
    const q = read().filter((i) => i.id !== id)
    write(q)
  }
  return { read, enqueue, dequeue }
}

export default function CourierAppPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [section, setSection] = useState<'home' | 'entregas' | 'perfil'>('home')
  const [tab, setTab] = useState<'mine' | 'available'>('mine')
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const queue = useActionQueue()

  const [courierName, setCourierName] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [todayEarnings, setTodayEarnings] = useState<number>(0)
  const [todayDeliveries, setTodayDeliveries] = useState<number>(0)
  const [onlineSeconds, setOnlineSeconds] = useState<number>(0)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [highlightEndsAt, setHighlightEndsAt] = useState<number | null>(null)
  const [feeRule, setFeeRule] = useState<{ flat_amount: number; per_km_amount: number; percent_order: number } | null>(
    null,
  )
  const [routeCache, setRouteCache] = useState<Record<string, { distanceKm: number; etaMin: number }>>({})

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
    }
    init()
  }, [supabase])

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const loadCourier = async () => {
      const { data } = await supabase.from('couriers').select('full_name, active').eq('id', userId).maybeSingle()
      if (mounted) {
        setCourierName((data?.full_name as string) || null)
        setIsOnline(Boolean(data?.active ?? true))
      }
    }
    const loadRule = async () => {
      const { data } = await supabase.from('courier_fee_rules').select('flat_amount, per_km_amount, percent_order').eq('active', true).limit(1).maybeSingle()
      if (mounted && data) {
        setFeeRule({
          flat_amount: Number(data.flat_amount || 0),
          per_km_amount: Number(data.per_km_amount || 0),
          percent_order: Number(data.percent_order || 0),
        })
      }
    }
    loadCourier()
    loadRule()
    return () => {
      mounted = false
    }
  }, [userId, supabase])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast({ title: 'Erro de login', description: error.message, variant: 'destructive' })
        return
      }
      setUserId(data.user?.id ?? null)
      setEmail('')
      setPassword('')
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserId(null)
  }

  const fetchOrders = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: mine } = await supabase
        .from('orders')
        .select('*')
        .eq('courier_id', userId)
        .in('status', ['preparing', 'out_for_delivery'])
        .order('created_at', { ascending: false })
      const { data: avail } = await supabase
        .from('orders')
        .select('*')
        .is('courier_id', null)
        .eq('status', 'out_for_delivery')
        .order('created_at', { ascending: false })
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const { data: completedToday } = await supabase
        .from('orders')
        .select('*')
        .eq('courier_id', userId)
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .eq('courier_id', userId)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(5)
      setMyOrders((mine || []) as Order[])
      setAvailableOrders((avail || []) as Order[])
      setRecentOrders((recent || []) as Order[])
      const gains = (completedToday || []).reduce((sum: number, o: any) => {
        if (!feeRule) return sum + Number(o.delivery_fee || 0)
        const dist = Number(o.distance_km || 0)
        const flat = feeRule.flat_amount || 0
        const perKm = (feeRule.per_km_amount || 0) * dist
        const pct = ((feeRule.percent_order || 0) / 100) * Number(o.total || 0)
        return sum + flat + perKm + pct
      }, 0)
      setTodayEarnings(gains > 0 ? +Number(gains).toFixed(2) : 0)
      setTodayDeliveries((completedToday || []).length)
      if (avail && avail.length > 0) {
        const first = (avail as any)[0]
        if (!highlightId || highlightId !== first.id) {
          setHighlightId(first.id)
          setHighlightEndsAt(Date.now() + 24000)
        }
      } else {
        setHighlightId(null)
        setHighlightEndsAt(null)
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao carregar pedidos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, toast, feeRule])

  useEffect(() => {
    if (!userId) return
    fetchOrders()
    const i = setInterval(fetchOrders, 15000)
    const handleOnline = () => flushQueue()
    const handleMessage = (e: MessageEvent) => {
      if ((e.data as any)?.type === 'courier-sync') {
        flushQueue()
      }
    }
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleMessage as any)
    }
    window.addEventListener('online', handleOnline)
    const channel = supabase
      .channel('orders-available')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const rec: any = (payload as any).new || {}
        if (rec && rec.status === 'out_for_delivery' && !rec.courier_id) {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            navigator.serviceWorker?.getRegistration().then((reg) => {
              reg?.showNotification('Nova entrega disponível', {
                body: `Pedido #${rec.order_number}`,
                data: { url: '/entregador' },
              })
            })
          } else {
            toast({ title: 'Nova entrega disponível', description: `Pedido #${rec.order_number}` })
          }
        }
      })
      .subscribe()
    return () => {
      clearInterval(i)
      window.removeEventListener('online', handleOnline)
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleMessage as any)
      }
      supabase.removeChannel(channel)
    }
  }, [userId, fetchOrders, supabase, toast])

  const captureLocation = (): Promise<{ lat?: number; lng?: number }> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: false, timeout: 3000 }
      )
    })
  }

  const computeRouteTo = useCallback(
    async (order: Order) => {
      if (!order?.customer_lat || !order?.customer_lng) return
      const { lat, lng } = await captureLocation()
      if (typeof lat !== 'number' || typeof lng !== 'number') return
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${order.customer_lng},${order.customer_lat}?overview=false`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const r = data?.routes?.[0]
        if (!r) return
        setRouteCache((prev) => ({
          ...prev,
          [order.id]: { distanceKm: r.distance / 1000, etaMin: r.duration / 60 },
        }))
      } catch {}
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setRouteCache],
  )

  useEffect(() => {
    if (!highlightId) return
    const o = availableOrders.find((x) => x.id === highlightId)
    if (o && !routeCache[o.id]) {
      computeRouteTo(o)
    }
  }, [highlightId, availableOrders, computeRouteTo, routeCache])

  const flushQueue = async () => {
    const list = queue.read()
    if (list.length === 0) return
    for (const item of list) {
      try {
        const { error } = await supabase.from('orders').update(item.patch).eq('id', item.orderId)
        if (!error) {
          queue.dequeue(item.id)
        }
      } catch {
      }
    }
    fetchOrders()
  }

  const doUpdate = async (orderId: string, patch: Record<string, any>) => {
    setUpdatingId(orderId)
    const apply = async () => {
      const { error } = await supabase.from('orders').update(patch).eq('id', orderId)
      if (error) throw error
    }
    try {
      if (!navigator.onLine) {
        queue.enqueue(orderId, patch)
        toast({ title: 'Offline', description: 'Ação salva e será sincronizada ao voltar a conexão.' })
      } else {
        await apply()
        toast({ title: 'Sucesso', description: 'Pedido atualizado.' })
      }
      await fetchOrders()
    } catch (e: any) {
      queue.enqueue(orderId, patch)
      toast({ title: 'Sem conexão', description: 'Guardamos a ação para sincronizar depois.' })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleTake = async (orderId: string) => {
    if (!userId) return
    await doUpdate(orderId, { courier_id: userId, delivery_status: 'accepted', updated_at: new Date().toISOString() })
  }

  const handlePickup = async (orderId: string) => {
    const { lat, lng } = await captureLocation()
    const order = myOrders.find((o) => o.id === orderId) || availableOrders.find((o) => o.id === orderId)
    let distance_km: number | undefined
    let eta_min: number | undefined
    if (order?.customer_lat && order?.customer_lng && typeof lat === 'number' && typeof lng === 'number') {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${order.customer_lng},${order.customer_lat}?overview=false`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const r = data?.routes?.[0]
          if (r) {
            distance_km = r.distance / 1000
            eta_min = r.duration / 60
          }
        }
      } catch {}
    }
    await doUpdate(orderId, {
      delivery_status: 'picked_up',
      picked_up_at: new Date().toISOString(),
      driver_last_lat: lat ?? null,
      driver_last_lng: lng ?? null,
      distance_km: typeof distance_km === 'number' ? Number(distance_km.toFixed(3)) : null,
      eta_min: typeof eta_min === 'number' ? Number(eta_min.toFixed(1)) : null,
      updated_at: new Date().toISOString(),
    })
  }

  const handleDeliver = async (orderId: string, phone?: string | null) => {
    const { lat, lng } = await captureLocation()
    await doUpdate(orderId, {
      delivery_status: 'delivered',
      delivered_at: new Date().toISOString(),
      status: 'completed',
      driver_last_lat: lat ?? null,
      driver_last_lng: lng ?? null,
      updated_at: new Date().toISOString(),
    })
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

  useEffect(() => {
    const key = `courier-online-seconds-${new Date().toISOString().slice(0, 10)}`
    const stored = Number(localStorage.getItem(key) || '0')
    setOnlineSeconds(stored)
    let timer: any
    if (isOnline) {
      timer = setInterval(() => {
        setOnlineSeconds((s) => {
          const next = s + 60
          try {
            localStorage.setItem(key, String(next))
          } catch {}
          return next
        })
      }, 60000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOnline])

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('courier_sessions')
        .select('started_at, ended_at, day')
        .eq('courier_id', userId)
        .eq('day', today)
      let total = 0
      const now = Date.now()
      for (const r of data || []) {
        const s = new Date(r.started_at as any).getTime()
        const e = r.ended_at ? new Date(r.ended_at as any).getTime() : now
        if (e > s) total += Math.floor((e - s) / 1000)
      }
      if (total > 0) {
        setOnlineSeconds(Math.max(onlineSeconds, Math.floor(total / 60) * 60))
      }
    }
    load()
  }, [userId, supabase])

  const toggleOnline = async (v: boolean) => {
    setIsOnline(v)
    try {
      if (v && typeof Notification !== 'undefined') {
        try {
          await Notification.requestPermission()
        } catch {}
      }
      if (userId) {
        await supabase
          .from('couriers')
          .upsert({ id: userId, active: v, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        const key = `courier-session-open-${new Date().toISOString().slice(0, 10)}`
        if (v) {
          try {
            const existing = localStorage.getItem(key)
            if (!existing) {
              const { data } = await supabase
                .from('courier_sessions')
                .insert({ courier_id: userId })
                .select('id')
                .single()
              if (data?.id) {
                localStorage.setItem(key, data.id as string)
              }
            }
          } catch {}
        } else {
          try {
            const id = localStorage.getItem(key)
            if (id) {
              await supabase
                .from('courier_sessions')
                .update({ ended_at: new Date().toISOString() })
                .eq('id', id)
              localStorage.removeItem(key)
            }
          } catch {}
        }
      }
    } catch {}
  }

  useEffect(() => {
    const onBeforeUnload = async () => {
      if (!userId) return
      const key = `courier-session-open-${new Date().toISOString().slice(0, 10)}`
      try {
        const id = localStorage.getItem(key)
        if (id) {
          await supabase.from('courier_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id)
          localStorage.removeItem(key)
        }
      } catch {}
    }
    window.addEventListener('beforeunload', onBeforeUnload as any)
    return () => window.removeEventListener('beforeunload', onBeforeUnload as any)
  }, [userId, supabase])

  useEffect(() => {
    if (!highlightEndsAt) return
    const t = setInterval(() => {
      if (highlightEndsAt && Date.now() >= highlightEndsAt) {
        setHighlightId(null)
        setHighlightEndsAt(null)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [highlightEndsAt])

  useEffect(() => {
    if (!userId) return
    const tick = () => {
      const active = myOrders.filter((o) => o.delivery_status === 'picked_up' && o.status !== 'completed')
      if (active.length === 0) return
      if (!navigator.onLine) return
      if (!('geolocation' in navigator)) return
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const rows = active.map((o) => ({
            order_id: o.id,
            lat,
            lng,
            recorded_at: new Date().toISOString(),
          }))
          try {
            await supabase.from('delivery_locations').insert(rows as any)
          } catch {}
        },
        () => {},
        { enableHighAccuracy: false, timeout: 3000 }
      )
    }
    const id = window.setInterval(tick, 30000)
    tick()
    return () => window.clearInterval(id)
  }, [userId, myOrders, supabase])

  if (!userId) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-2xl font-bold">App do Entregador</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Faça login com seu email e senha para ver suas entregas.
        </p>
        <form className="space-y-3" onSubmit={signIn}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={authLoading}>
            Entrar
          </Button>
        </form>
      </div>
    )
  }

  const renderOrder = (o: Order, actions: React.ReactNode) => {
    const items = Array.isArray(o.items) ? o.items : []
    const statusBadge = (() => {
      const map: Record<string, { label: string; className: string }> = {
        preparing: { label: 'Em preparo', className: 'bg-blue-100 text-blue-800' },
        out_for_delivery: { label: 'Saiu p/ entrega', className: 'bg-purple-100 text-purple-800' },
        completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
        pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
        cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
      }
      const s = map[o.status] || map.pending
      return <Badge variant="outline" className={s.className}>{s.label}</Badge>
    })()
    return (
      <Card key={o.id} className="transition-shadow hover:shadow-sm">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="font-bold">#{o.order_number}</p>
              <p className="text-sm text-muted-foreground">{o.customer_name}</p>
            </div>
            {statusBadge}
          </div>
          <div className="mb-2 space-y-1">
            {items.map((it, idx) => (
              <div key={idx} className="rounded bg-muted/50 p-2 text-sm">
                <p className="font-medium">
                  {it.size} - {it.base}
                </p>
                {it.addons?.length ? (
                  <p className="text-xs text-muted-foreground">+ {it.addons.join(', ')}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mb-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{o.customer_address}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {(() => {
                  const rc = routeCache[o.id]
                  const dist = rc?.distanceKm ?? (o.distance_km ? Number(o.distance_km) : null)
                  const eta = rc?.etaMin ?? (o.eta_min ? Number(o.eta_min) : null)
                  if (!dist && !eta) return null
                  const parts = []
                  if (dist) parts.push(`${dist.toFixed(1)} km`)
                  if (eta) parts.push(`${Math.round(eta)} min`)
                  return parts.join(' • ')
                })()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <a
                className="underline"
                href={`https://wa.me/${String(o.customer_phone).replace(/\D/g, '').replace(/^55?/, '55')}`}
                target="_blank"
              >
                WhatsApp
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {actions}
            <Link
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              href={`/entregador/pedido/${o.id}`}
            >
              Acompanhar
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-gradient-to-b from-primary to-primary/70 pb-4 pt-8 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-2">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs opacity-80">Bem-vindo de volta,</p>
              <p className="text-lg font-semibold">{courierName ? `Olá, ${courierName.split(' ')[0]}!` : 'Olá!'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1">
            <span className="text-xs">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            <Power className="h-4 w-4" />
            <Switch checked={isOnline} onCheckedChange={toggleOnline} />
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-4">
        {section === 'home' ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3">
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ganhos de Hoje</p>
                    <p className="text-3xl font-bold">{formatPrice(todayEarnings)}</p>
                    <div className="mt-2 flex gap-5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" />
                        <span>{todayDeliveries} entregas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon />
                        <span>
                          {Math.floor(onlineSeconds / 3600)}h {Math.floor((onlineSeconds % 3600) / 60)}m online
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {highlightId && availableOrders.find((o) => o.id === highlightId) ? (
                <Card className="border-primary/20">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Nova Entrega
                      </div>
                      <p className="text-sm text-muted-foreground">Retirada em Açaí da Serra – Centro</p>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Distância total</p>
                          <p className="text-lg font-semibold">
                            {(() => {
                              const o = availableOrders.find((x) => x.id === highlightId)
                              const rc = o ? routeCache[o.id] : undefined
                              if (rc?.distanceKm) return `${rc.distanceKm.toFixed(1)} km`
                              return o?.distance_km ? `${Number(o.distance_km).toFixed(1)} km` : '—'
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor estimado</p>
                          <p className="text-lg font-semibold">
                            {formatPrice(
                              Number(availableOrders.find((o) => o.id === highlightId)?.delivery_fee || 0),
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {(() => {
                          const o = availableOrders.find((x) => x.id === highlightId)
                          const rc = o ? routeCache[o.id] : undefined
                          const mins = rc?.etaMin || o?.eta_min
                          return mins ? `${Math.round(Number(mins))} min estimados` : ''
                        })()}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setHighlightId(null)}>
                          Recusar
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            const id = String(highlightId)
                            handleTake(id)
                            setHighlightId(null)
                          }}
                        >
                          Aceitar Corrida <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      {highlightEndsAt ? (
                        <div className="mt-2 px-1 pb-3 text-center text-xs text-muted-foreground">
                          Expira em {Math.max(0, Math.ceil((highlightEndsAt - Date.now()) / 1000))}s
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <div className="mt-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-base font-semibold">Histórico Recente</p>
                  <button className="text-xs text-primary" onClick={() => setSection('entregas')}>
                    Ver tudo
                  </button>
                </div>
                <div className="space-y-2">
                  {recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma entrega recente.</p>
                  ) : (
                    recentOrders.slice(0, 3).map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              'inline-flex size-5 items-center justify-center rounded-full ' +
                              (o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')
                            }
                          >
                            {o.status === 'completed' ? '✓' : '×'}
                          </span>
                          <div>
                            <p className="font-medium">Entrega #{o.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.customer_name} •{' '}
                              {new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={o.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}>
                            {formatPrice(o.delivery_fee || 0)}
                          </p>
                          <p
                            className={
                              'text-xs ' + (o.status === 'completed' ? 'text-emerald-600' : 'text-rose-600')
                            }
                          >
                            {o.status === 'completed' ? 'Concluída' : 'Cancelada'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : section === 'entregas' ? (
          <>
            <div className="mb-3 flex gap-2">
              <Button
                variant={tab === 'mine' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab('mine')}
              >
                Minhas Entregas
              </Button>
              <Button
                variant={tab === 'available' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab('available')}
              >
                Disponíveis
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : tab === 'mine' ? (
              myOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não tem entregas.</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="space-y-3">
                    {myOrders.map((o) => {
                      const canPickup = o.delivery_status !== 'picked_up' && o.status !== 'completed'
                      const canDeliver = o.status !== 'completed'
                      return renderOrder(
                        o,
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePickup(o.id)}
                            disabled={updatingId === o.id || !canPickup}
                          >
                            <PackageCheck className="mr-1 h-4 w-4" />
                            Retirar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeliver(o.id, o.customer_phone)}
                            disabled={updatingId === o.id || !canDeliver}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Entregue
                          </Button>
                          <a
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                              o.customer_address,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Rota
                          </a>
                        </>,
                      )
                    })}
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              )
            ) : availableOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido disponível no momento.</p>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((o) =>
                  renderOrder(
                    o,
                    <Button size="sm" className="w-full" onClick={() => handleTake(o.id)} disabled={updatingId === o.id}>
                      Assumir entrega
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>,
                  ),
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold">{isOnline ? 'Online' : 'Offline'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isOnline} onCheckedChange={toggleOnline} />
                  <Power className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{courierName || '-'}</p>
                </div>
                <Button variant="destructive" onClick={signOut}>
                  <LogOut className="mr-1 h-4 w-4" />
                  Sair da conta
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-3xl border-t bg-background/95 px-6 py-2">
        <div className="grid grid-cols-3">
          <button
            className={`flex flex-col items-center gap-1 py-1 ${section === 'home' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setSection('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Início</span>
          </button>
          <button
            className={`flex flex-col items-center gap-1 py-1 ${section === 'entregas' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setSection('entregas')}
          >
            <Truck className="h-5 w-5" />
            <span className="text-xs">Entregas</span>
          </button>
          <button
            className={`flex flex-col items-center gap-1 py-1 ${section === 'perfil' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setSection('perfil')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.75a10.25 10.25 0 1 0 0 20.5 10.25 10.25 0 0 0 0-20.5ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h5a.75.75 0 0 0 0-1.5H12.75V6Z" />
    </svg>
  )
}
