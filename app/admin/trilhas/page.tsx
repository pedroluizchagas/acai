'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

const MapContainer = dynamic(async () => (await import('react-leaflet')).MapContainer, { ssr: false })
const TileLayer = dynamic(async () => (await import('react-leaflet')).TileLayer, { ssr: false })
const Polyline = dynamic(async () => (await import('react-leaflet')).Polyline, { ssr: false })
const Marker = dynamic(async () => (await import('react-leaflet')).Marker, { ssr: false })

type TrailPoint = { lat: number; lng: number; recorded_at: string }
type OrderLite = { id: string; order_number: number; customer_name: string }

export default function TrilhasPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderLite[]>([])
  const [orderId, setOrderId] = useState<string | null>(null)
  const [points, setPoints] = useState<TrailPoint[]>([])

  useEffect(() => {
    const loadOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name')
        .in('status', ['out_for_delivery', 'completed'])
        .order('created_at', { ascending: false })
        .limit(100)
      setOrders((data || []) as any)
      if (!orderId && data && data[0]) setOrderId((data[0] as any).id)
    }
    loadOrders()
  }, [])

  useEffect(() => {
    if (!orderId) return
    const loadPoints = async () => {
      const { data } = await supabase
        .from('delivery_locations')
        .select('lat, lng, recorded_at')
        .eq('order_id', orderId)
        .order('recorded_at', { ascending: true })
      setPoints((data || []) as any)
    }
    loadPoints()
  }, [orderId])

  const center = useMemo(() => {
    if (points.length > 0) return [points[0].lat, points[0].lng] as [number, number]
    return [-23.55052, -46.633308] as [number, number]
  }, [points])

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Trilhas de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select onValueChange={setOrderId} value={orderId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um pedido" />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    #{o.order_number} — {o.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-[420px] overflow-hidden rounded border">
              <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {points.length > 0 && (
                  <>
                    <Polyline positions={points.map((p) => [p.lat, p.lng] as [number, number])} color="purple" />
                    <Marker position={[points[0].lat, points[0].lng]} />
                    <Marker position={[points[points.length - 1].lat, points[points.length - 1].lng]} />
                  </>
                )}
              </MapContainer>
            </div>
            <ScrollArea className="h-[420px] rounded border p-2">
              <div className="space-y-1">
                {points.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem pontos registrados para este pedido.</p>
                ) : (
                  points.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded p-2 hover:bg-muted">
                      <span className="text-sm">Lat {p.lat.toFixed(5)}, Lng {p.lng.toFixed(5)}</span>
                      <span className="text-xs text-muted-foreground">{new Date(p.recorded_at).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

