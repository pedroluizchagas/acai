'use client'

import { useState, useEffect, useCallback } from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { OrderCard } from './order-card'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea as UIScrollArea } from '@/components/ui/scroll-area'

const columns = [
  { id: 'pending', title: 'Pendente', color: 'bg-yellow-500' },
  { id: 'preparing', title: 'Em Preparo', color: 'bg-blue-500' },
  { id: 'out_for_delivery', title: 'Saiu p/ Entrega', color: 'bg-purple-500' },
  { id: 'completed', title: 'Concluído', color: 'bg-green-500' },
]

const statusTransitions: Record<string, string> = {
  pending: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'completed',
}

export function OrdersKanban() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const { toast } = useToast()
  const [bulkOpen, setBulkOpen] = useState(false)
  const [couriers, setCouriers] = useState<Array<{ id: string; full_name: string | null; phone: string | null }>>([])
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()

    // Set up realtime subscription
    const supabase = createClient()
    supabase
      .from('couriers')
      .select('id, full_name, phone')
      .eq('active', true)
      .then(({ data }) => setCouriers((data || []) as any))
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders])

  const handleMoveNext = async (orderId: string, currentStatus: string) => {
    const nextStatus = statusTransitions[currentStatus]
    if (!nextStatus) return

    setUpdatingOrderId(orderId)

    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single()

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar pedido', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Pedido atualizado!' })
      fetchOrders()
      if (nextStatus === 'out_for_delivery') {
        try {
          await fetch('/api/push/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Nova entrega disponível',
              body: `Pedido #${updated?.order_number}`,
              url: '/entregador',
            }),
          })
        } catch {}
      }
      if (nextStatus === 'completed' && updated?.customer_phone) {
        const { data: ms } = await supabase
          .from('marketing_settings')
          .select('google_review_link')
          .limit(1)
          .single()
        const link: string = (ms?.google_review_link as string) || ''
        const digits = String(updated.customer_phone).replace(/\D/g, '')
        const phone = digits.startsWith('55') ? digits : `55${digits}`
        const text = link
          ? `Oi! Seu pedido chegou bem? Pode nos avaliar no Google? ${link}`
          : `Oi! Seu pedido chegou bem? Sua opinião nos ajuda muito. Obrigado!`
        try {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
        } catch {}
      }
    }

    setUpdatingOrderId(null)
  }

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order) => order.status === status)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Pedidos de Hoje
          </h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} pedido(s) no total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsLoading(true)
            fetchOrders()
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-4 pb-4">
          <div className="w-full">
            <div className="mb-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                Atribuir em massa
              </Button>
            </div>
          </div>
          {columns.map((column) => {
            const columnOrders = getOrdersByStatus(column.id)
            return (
              <div
                key={column.id}
                className="w-80 flex-shrink-0 rounded-xl bg-muted/30 p-4"
              >
                {/* Column Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${column.color}`} />
                    <h3 className="font-medium text-foreground">
                      {column.title}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnOrders.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {columnOrders.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum pedido
                      </p>
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onMoveNext={handleMoveNext}
                        isLoading={updatingOrderId === order.id}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atribuir em massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select onValueChange={setSelectedCourier} value={selectedCourier ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o entregador" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || 'Sem nome'} {c.phone ? `(${c.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Pedidos elegíveis (sem entregador)</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedIds(
                    orders
                      .filter(
                        (o) =>
                          (o.status === 'preparing' || o.status === 'out_for_delivery') && !o.courier_id,
                      )
                      .map((o) => o.id),
                  )
                }
              >
                Selecionar todos
              </Button>
            </div>
            <UIScrollArea className="h-64 rounded border p-2">
              <div className="space-y-2">
                {orders
                  .filter(
                    (o) => (o.status === 'preparing' || o.status === 'out_for_delivery') && !o.courier_id,
                  )
                  .map((o) => {
                    const checked = selectedIds.includes(o.id)
                    return (
                      <label key={o.id} className="flex items-center justify-between rounded p-2 hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => {
                              setSelectedIds((prev) =>
                                val ? [...prev, o.id] : prev.filter((id) => id !== o.id),
                              )
                            }}
                          />
                          <span className="text-sm">#{o.order_number} — {o.customer_name}</span>
                        </div>
                        <span className="truncate text-xs text-muted-foreground">{o.customer_address}</span>
                      </label>
                    )
                  })}
              </div>
            </UIScrollArea>
            <div className="flex justify-end gap-2">
              <Button
                onClick={async () => {
                  if (!selectedCourier || selectedIds.length === 0) return
                  setAssigning(true)
                  const supabase = createClient()
                  const patch: any = { courier_id: selectedCourier, updated_at: new Date().toISOString() }
                  const { error } = await supabase.from('orders').update(patch).in('id', selectedIds)
                  if (!error) {
                    toast({ title: 'Atribuição concluída', description: `${selectedIds.length} pedido(s)` })
                    setBulkOpen(false)
                    setSelectedIds([])
                    fetchOrders()
                    try {
                      await fetch('/api/push/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: 'Nova entrega atribuída',
                          body: `${selectedIds.length} pedido(s) atribuídos`,
                          url: '/entregador',
                          user_ids: [selectedCourier],
                        }),
                      })
                    } catch {}
                  }
                  setAssigning(false)
                }}
                disabled={!selectedCourier || selectedIds.length === 0 || assigning}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
