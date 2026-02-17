'use client'

import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'

interface ProductsSectionProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
}

export function ProductsSection({
  products,
  onSelectProduct,
}: ProductsSectionProps) {
  const sizes = products.filter((p) => p.category === 'size')

  return (
    <section id="cardapio" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            Monte seu Açaí
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Escolha o tamanho do seu copo e personalize com seus ingredientes
            favoritos
          </p>
        </div>

        {/* Products Grid */}
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sizes.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={() => onSelectProduct(product)}
            />
          ))}
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">🍇</span>
            </div>
            <h3 className="mb-2 font-semibold text-foreground">100% Natural</h3>
            <p className="text-sm text-muted-foreground">
              Açaí puro da Amazônia, sem conservantes ou corantes artificiais
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              Entrega Rápida
            </h3>
            <p className="text-sm text-muted-foreground">
              Seu pedido chega quentinho (ou geladinho!) em até 30 minutos
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              Personalizado
            </h3>
            <p className="text-sm text-muted-foreground">
              Monte do seu jeito com mais de 12 opções de toppings
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
