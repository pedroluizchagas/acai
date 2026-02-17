'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  onSelect: () => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-primary/10">
        {/* Açaí Illustration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-24 w-24 md:h-32 md:w-32">
            <div className="absolute inset-0 rounded-full bg-primary/70 transition-transform group-hover:scale-110" />
            <div className="absolute inset-3 rounded-full bg-primary/50" />
            <div className="absolute inset-6 rounded-full bg-primary/30" />
            {/* Size indicator */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-md">
              {product.name.split(' ')[1]}
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          <Button size="sm" className="gap-1" onClick={onSelect}>
            <Plus className="h-4 w-4" />
            Montar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
