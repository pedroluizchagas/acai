'use client'

import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { MapPin, Navigation, Route, User, RefreshCcw, Map } from 'lucide-react'
import { routeGeometryFromStore, minDistanceToPolylineMeters, type GeoPoint } from '@/lib/geo'

const MapContainer = dynamic(async () => (await import('react-leaflet')).MapContainer, { ssr: false })
const TileLayer = dynamic(async () => (await import('react-leaflet')).TileLayer, { ssr: false })
const Polyline = dynamic(async () => (await import('react-leaflet')).Polyline, { ssr: false })
const Marker = dynamic(async () => (await import('react-leaflet')).Marker, { ssr: false })

type Courier = { id: string; full_name: string | null; phone: string | null }
type LastPoint = { order_id: string; lat: number; lng: number; recorded_at: string }

export default function AdminEntregasPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [filterCourier, setFilterCourier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [routeCache, setRouteCache] = useState<Record<string, GeoPoint[]>>({})
  const [lastPoints, setLastPoints] = useState<Record<string, LastPoint | null>>({})
  const [mapOrderId, setMapOrderId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['out_for_delivery'])
        .order('created_at', { ascending: false })
      const list = (data || []) as Order[]
      setOrders(list)
      const courierIds = Array.from(new Set(list.map((o) => o.courier_id).filter(Boolean))) as string[]
      if (courierIds.length > 0) {
        const { data: crows } = await supabase.from('couriers').select('id, full_name, phone').in('id', courierIds)
        setCouriers((crows || []) as any)
      } else {
        setCouriers([])
      }
      const ids = list.map((o) => o.id)
      if (ids.length > 0) {
        const points: Record<string, LastPoint | null> = {}
        await Promise.all(
          ids.map(async (id) => {
            try {
              const { data: p } = await supabase
                .from('delivery_locations')
                .select('order_id, lat, lng, recorded_at')
                .eq('order_id', id)
                .order('recorded_at', { ascending: false })
                .limit(1)
              if (p && p[0]) {
                points[id] = p[0] as any
              } else {
                const o = list.find((x) => x.id === id)
                if (o?.driver_last_lat && o?.driver_last_lng) {
                  points[id] = {
                    order_id: id,
                    lat: Number(o.driver_last_lat),
                    lng: Number(o.driver_last_lng),
                    recorded_at: o.updated_at,
                  }
                } else {
                  points[id] = null
                }
              }
            } catch {
              points[id] = null
            }
          }),
        )
        setLastPoints(points)
      } else {
        setLastPoints({})
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchOrders()
    const ch = supabase
      .channel('admin-entregas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_locations' }, () => fetchOrders())
      .subscribe()
    const interval = window.setInterval(fetchOrders, 20000)
    return () => {
      supabase.removeChannel(ch)
      window.clearInterval(interval)
    }
  }, [fetchOrders, supabase])

  useEffect(() => {
    const run = async () => {
      const toFetch = orders.filter((o) => o.customer_lat && o.customer_lng && !routeCache[o.id])
      if (toFetch.length === 0) return
      const entries: Array<[string, GeoPoint[]]> = []
      for (const o of toFetch) {
        const geom = await routeGeometryFromStore({ lat: Number(o.customer_lat), lng: Number(o.customer_lng) })
        if (geom) entries.push([o.id, geom])
      }
      if (entries.length > 0) {
        setRouteCache((prev) => {
          const next = { ...prev }
          for (const [id, g] of entries) next[id] = g
          return next
        })
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  const view = useMemo(() => {
    const list = orders
      .filter((o) => (filterCourier ? o.courier_id === filterCourier : true))
      .map((o) => {
        const lp = lastPoints[o.id] || null
        const route = routeCache[o.id]
        let onRoute: boolean | null = null
        let deviationMeters: number | null = null
        if (lp && route && route.length > 1) {
          const d = minDistanceToPolylineMeters({ lat: Number(lp.lat), lng: Number(lp.lng) }, route)
          deviationMeters = typeof d === 'number' ? d : null
          onRoute = deviationMeters !== null ? deviationMeters <= 250 : null
        }
        return { order: o, last: lp, route, onRoute, deviationMeters }
      })
    // group by courier
    const groups: Record<string, typeof list> = {}
    for (const item of list) {
      const key = item.order.courier_id || 'sem'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [orders, filterCourier, lastPoints, routeCache])

  const courierName = (id: string | null | undefined) => {
    if (!id) return '—'
    const c = couriers.find((x) => x.id === id)
    return c?.full_name || c?.phone || '—'
  }

  const activeCount = orders.length

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Entregas em Andamento</h2>
          <p className="text-sm text-muted-foreground">{activeCount} entrega(s) ativas</p>
        </div>
        <div className="flex items-center gap-2">
          <Select onValueChange={(v) => setFilterCourier(v === 'all' ? null : v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por entregador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {couriers
                .filter((c) => typeof c.id === 'string' && c.id.trim().length > 0)
                .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name || c.phone || c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : activeCount === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nenhuma entrega ativa.</CardContent>
        </Card>
      ) : (
        <ScrollArea className="rounded border">
          <div className="divide-y">
            {Object.entries(view).map(([courierId, items]) => (
              <div key={courierId} className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{courierId === 'sem' ? 'Sem entregador' : courierName(courierId)}</span>
                  </div>
                  <Badge variant="secondary">{items.length} entrega(s)</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map(({ order: o, last, onRoute, deviationMeters }) => (
                    <Card key={o.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          #{o.order_number}{' '}
                          <span className="text-xs font-normal text-muted-foreground">{o.customer_name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          <div className="mb-1 flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{o.customer_address}</span>
                          </div>
                          <div className="mb-1 flex items-center gap-2">
                            <Navigation className="h-3.5 w-3.5" />
                            <span>
                              {onRoute === null ? 'Rota —' : onRoute ? 'Rota OK' : 'Desvio'}
                              {typeof deviationMeters === 'number' ? ` • ${Math.round(deviationMeters)} m` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Route className="h-3.5 w-3.5" />
                            <span>
                              {last
                                ? `Último ponto ${new Date(last.recorded_at).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`
                                : 'Sem localização'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="secondary" onClick={() => setMapOrderId(o.id)}>
                            <Map className="mr-1 h-4 w-4" />
                            Mapa
                          </Button>
                          <a
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.customer_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir rota
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      )}
      <Dialog open={Boolean(mapOrderId)} onOpenChange={(v) => !v && setMapOrderId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Mapa da Entrega</DialogTitle>
          </DialogHeader>
          {mapOrderId ? (
            <OrderMap
              order={orders.find((o) => o.id === mapOrderId)!}
              points={lastPoints[mapOrderId] ? [lastPoints[mapOrderId] as any] : []}
              route={routeCache[mapOrderId] || []}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrderMap({
  order,
  points,
  route,
}: {
  order: Order
  points: Array<{ lat: number; lng: number }>
  route: GeoPoint[]
}) {
  const center = useMemo<[number, number]>(() => {
    if (points && points.length > 0) return [points[0].lat, points[0].lng]
    if (order.customer_lat && order.customer_lng) return [Number(order.customer_lat), Number(order.customer_lng)]
    return [-23.55, -46.63]
  }, [points, order])
  return (
    <div className="h-[480px] overflow-hidden rounded border">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {route && route.length > 1 ? (
          <Polyline positions={route.map((p) => [p.lat, p.lng] as [number, number])} color="#6d28d9" />
        ) : null}
        {points && points[0] ? <Marker position={[points[0].lat, points[0].lng]} /> : null}
        {order.customer_lat && order.customer_lng ? (
          <Marker position={[Number(order.customer_lat), Number(order.customer_lng)]} />
        ) : null}
      </MapContainer>
    </div>
  )
}
