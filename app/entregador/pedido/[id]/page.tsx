'use client'

import 'leaflet/dist/leaflet.css'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Phone, MessageCircle, MapPin, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

const MapContainer = dynamic(async () => (await import('react-leaflet')).MapContainer, { ssr: false })
const TileLayer = dynamic(async () => (await import('react-leaflet')).TileLayer, { ssr: false })
const Polyline = dynamic(async () => (await import('react-leaflet')).Polyline, { ssr: false })
const Marker = dynamic(async () => (await import('react-leaflet')).Marker, { ssr: false })

type TrailPoint = { lat: number; lng: number; recorded_at: string }

export default function PedidoDetalhePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [trail, setTrail] = useState<TrailPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [slide, setSlide] = useState<number[]>([0])
  const id = params?.id

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
        if (o) setOrder(o as any)
        const { data: t } = await supabase
          .from('delivery_locations')
          .select('lat,lng,recorded_at')
          .eq('order_id', id)
          .order('recorded_at', { ascending: true })
        setTrail(((t || []) as any).map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng), recorded_at: p.recorded_at })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, supabase])

  const lastPoint = useMemo(() => {
    if (trail.length > 0) return trail[trail.length - 1]
    if (order?.driver_last_lat && order?.driver_last_lng)
      return { lat: Number(order.driver_last_lat), lng: Number(order.driver_last_lng), recorded_at: '' }
    return null
  }, [trail, order])

  const handleDeliver = async () => {
    if (!order) return
    try {
      await supabase
        .from('orders')
        .update({
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
      toast({ title: 'Entrega concluída' })
      router.push('/entregador')
    } catch {
      toast({ title: 'Erro', description: 'Falha ao concluir entrega', variant: 'destructive' })
    }
  }

  useEffect(() => {
    if ((slide?.[0] || 0) >= 95) {
      handleDeliver()
    }
  }, [slide])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
  }
  if (!order) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Pedido não encontrado.</p>
      </div>
    )
  }

  const phoneDigits = String(order.customer_phone).replace(/\D/g, '').replace(/^55?/, '55')

  return (
    <div className="relative h-dvh w-full">
      <div className="absolute left-3 top-3 z-[1000] flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button variant="secondary" size="sm">
          <HelpCircle className="mr-1 h-4 w-4" />
          Ajuda
        </Button>
      </div>
      <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 transform">
        <Card>
          <CardContent className="flex items-center gap-2 p-2">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">A caminho</span>
            <span className="text-sm font-medium">Pedido #{order.order_number}</span>
          </CardContent>
        </Card>
      </div>
      <div className="h-full w-full">
        <MapContainer center={[lastPoint?.lat || -30.03, lastPoint?.lng || -51.23]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {trail.length > 1 ? <Polyline positions={trail.map((p) => [p.lat, p.lng] as [number, number])} color="#6d28d9" /> : null}
          {lastPoint ? <Marker position={[lastPoint.lat, lastPoint.lng]} /> : null}
        </MapContainer>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-background p-4 shadow-2xl">
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-full bg-muted p-2">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">{order.customer_address}</p>
          </div>
          <div className="flex gap-2">
            <a
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              href={`tel:${phoneDigits}`}
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="mb-4 text-xs">
          <a
            className="underline"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customer_address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir rota no Google Maps
          </a>
        </div>
        <div className="select-none">
          <div className="mb-2 text-center text-xs text-muted-foreground">Deslize para entregar</div>
          <Slider value={slide} onValueChange={setSlide} max={100} min={0} />
        </div>
      </div>
    </div>
  )
}
