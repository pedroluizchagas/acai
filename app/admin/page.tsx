 'use client'
 
import { useEffect, useMemo, useState } from 'react'
import { OrdersKanban } from '@/components/admin/orders-kanban'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [intents, setIntents] = useState<any[]>([])

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      setOrders((data || []) as Order[])
    }
    const fetchIntents = async () => {
      const { data } = await supabase
        .from('checkout_intents')
        .select('*')
        .order('created_at', { ascending: false })
      setIntents(data || [])
    }
    fetchOrders()
    fetchIntents()
    const interval = setInterval(() => {
      fetchIntents()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const customers = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; count: number; last: Date; first: Date }>()
    for (const o of orders) {
      const phone = (o.customer_phone || '').trim()
      if (!phone) continue
      const prev = map.get(phone)
      const d = new Date(o.created_at)
      if (!prev) {
        map.set(phone, { phone, name: o.customer_name, count: 1, last: d, first: d })
      } else {
        prev.count += 1
        if (d > prev.last) prev.last = d
        if (d < prev.first) prev.first = d
      }
    }
    const arr = Array.from(map.values())
    const filtered = arr.filter((c) => {
      const s = search.trim().toLowerCase()
      if (!s) return true
      return c.phone.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
    })
    return filtered.sort((a, b) => b.last.getTime() - a.last.getTime())
  }, [orders, search])

  const getSegment = (c: { count: number; last: Date; first: Date }) => {
    const now = new Date()
    const days = Math.floor((now.getTime() - c.last.getTime()) / (1000 * 60 * 60 * 24))
    if (days > 30) return 'Ausentes'
    if (c.count >= 2) return 'Recorrentes'
    return 'Novos'
  }

  const normalizePhone = (phone: string) => {
    const digits = (phone || '').replace(/\D/g, '')
    if (digits.startsWith('55')) return digits
    return `55${digits}`
  }

  const abandoned = useMemo(() => {
    const now = new Date().getTime()
    return intents
      .filter((i) => i.status === 'pending')
      .filter((i) => now - new Date(i.created_at).getTime() >= 30 * 60 * 1000)
  }, [intents])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Admin
        </h1>
        <p className="text-muted-foreground">
          Gestão de pedidos, clientes e recuperação
        </p>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="recovery">Recuperação</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <OrdersKanban />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes por Telefone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Buscar por nome ou telefone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="space-y-2">
                {customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cliente</p>
                ) : (
                  customers.map((c) => {
                    const segment = getSegment(c)
                    const badgeColor =
                      segment === 'Ausentes'
                        ? 'bg-red-100 text-red-800'
                        : segment === 'Recorrentes'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    return (
                      <div key={c.phone} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-sm text-muted-foreground">{c.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.count} pedido(s) • Último: {new Date(c.last).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={badgeColor}>{segment}</Badge>
                          <a
                            href={`https://wa.me/${normalizePhone(c.phone)}?text=${encodeURIComponent('Oi! Temos uma promoção especial hoje para você. Quer montar um açaí? 😋')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" className="bg-transparent">WhatsApp</Button>
                          </a>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carrinhos Abandonados (30+ min)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {abandoned.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum carrinho abandonado no período</p>
              ) : (
                abandoned.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{i.customer_name || 'Cliente'}</p>
                      <p className="text-sm text-muted-foreground">{i.customer_phone}</p>
                      <p className="text-xs text-muted-foreground">
                        Total previsto: R$ {Number(i.total || 0).toFixed(2)} • Iniciado: {new Date(i.created_at).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${normalizePhone(i.customer_phone)}?text=${encodeURIComponent('Oi, vimos que você começou a montar seu açaí mas não concluiu. Posso ajudar? 😊')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button>Enviar WhatsApp</Button>
                      </a>
                      <Button
                        variant="outline"
                        className="bg-transparent"
                        onClick={async () => {
                          await supabase
                            .from('checkout_intents')
                            .update({ status: 'dismissed', updated_at: new Date().toISOString() })
                            .eq('id', i.id)
                          const { data } = await supabase
                            .from('checkout_intents')
                            .select('*')
                            .order('created_at', { ascending: false })
                          setIntents(data || [])
                        }}
                      >
                        Ignorar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
