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
    </div>
  )
}
