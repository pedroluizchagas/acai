'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  Smartphone,
} from 'lucide-react'
import type { Order } from '@/lib/types'

interface OrderCardProps {
  order: Order
  onMoveNext: (orderId: string, currentStatus: string) => void
  isLoading?: boolean
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800',
    nextAction: 'Preparar',
    nextStatus: 'preparing',
  },
  preparing: {
    label: 'Em Preparo',
    color: 'bg-blue-100 text-blue-800',
    nextAction: 'Enviar',
    nextStatus: 'out_for_delivery',
  },
  out_for_delivery: {
    label: 'Saiu para Entrega',
    color: 'bg-purple-100 text-purple-800',
    nextAction: 'Concluir',
    nextStatus: 'completed',
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-100 text-green-800',
    nextAction: null,
    nextStatus: null,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    nextAction: null,
    nextStatus: null,
  },
}

export function OrderCard({ order, onMoveNext, isLoading }: OrderCardProps) {
  const config = statusConfig[order.status]
  const createdAt = new Date(order.created_at)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000)

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const getItems = () => {
    if (!Array.isArray(order.items)) return []
    return order.items
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="font-bold text-foreground">#{order.order_number}</p>
            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Items */}
        <div className="mb-3 space-y-1">
          {getItems().map((item, index) => (
            <div key={index} className="rounded-lg bg-muted/50 p-2 text-sm">
              <p className="font-medium text-foreground">
                {item.size} - {item.base}
              </p>
              {item.addons && item.addons.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {item.addons.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mb-3 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{order.customer_address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>{order.customer_phone}</span>
          </div>
          <div className="flex items-center gap-2">
            {order.payment_method === 'pix' ? (
              <Smartphone className="h-3.5 w-3.5" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            <span>{order.payment_method === 'pix' ? 'PIX' : 'Cartão'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(diffMinutes)}</span>
          </div>
          <p className="font-bold text-primary">{formatPrice(order.total)}</p>
        </div>

        {/* Action */}
        {config.nextAction && (
          <Button
            size="sm"
            className="mt-3 w-full gap-1"
            onClick={() => onMoveNext(order.id, order.status)}
            disabled={isLoading}
          >
            {config.nextAction}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
