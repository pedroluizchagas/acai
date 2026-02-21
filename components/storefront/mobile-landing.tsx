'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Clock, Truck, Star, Plus } from 'lucide-react'
import type { Product } from '@/lib/types'

interface MobileLandingProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onOrderClick: () => void
  couponCode?: string | null
}

export function MobileLanding({
  products,
  onSelectProduct,
  onOrderClick,
  couponCode,
}: MobileLandingProps) {
  const sizes = products.filter((p) => p.category === 'size')

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

  return (
    <div className="md:hidden">
      <section className="relative px-4 pt-6 pb-4">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="mx-auto max-w-md">
          <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            O melhor açaí da região
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground">
            Açaí fresquinho,
            <br />
            <span className="italic text-primary">do seu jeito</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monte seu copo perfeito com os melhores ingredientes. Entrega rápida e sabor incomparável.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button className="h-11" onClick={onOrderClick}>
              Fazer Pedido
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href="#cardapio-mobile">Ver Cardápio</a>
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card p-3 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Clock className="h-4 w-4" />
                <span className="text-base font-bold">30min</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Tempo médio</p>
            </div>
            <div className="rounded-xl bg-card p-3 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Truck className="h-4 w-4" />
                <span className="text-base font-bold">R$ 5</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Entrega</p>
            </div>
            <div className="rounded-xl bg-card p-3 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Star className="h-4 w-4 fill-primary" />
                <span className="text-base font-bold">4.9</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Avaliação</p>
            </div>
          </div>
        </div>
      </section>
      <section className="px-4">
        <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl bg-primary/10 p-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src="/img/Gemini_Generated_Image_dxaztbdxaztbdxaz.png"
              alt="Açaí com frutas e granola"
              fill
              className="object-cover"
              priority
            />
          </div>
          {couponCode && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-card/90 px-2 py-1 text-xs font-semibold text-foreground shadow">
              Cupom {couponCode}
            </div>
          )}
        </div>
      </section>
      <section id="cardapio-mobile" className="mt-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mais Pedidos</h2>
            <p className="text-xs text-muted-foreground">As escolhas favoritas da galera</p>
          </div>
          <a href="/cardapio" className="text-xs font-medium text-primary">
            Ver tudo
          </a>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-3">
            {sizes.map((p) => (
              <Card
                key={p.id}
                className="w-52 flex-shrink-0 overflow-hidden rounded-2xl p-3 shadow-sm"
              >
                <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl bg-primary/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-primary/60" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                </div>
                <Button
                  size="sm"
                  className="mt-3 h-9 w-full gap-1"
                  onClick={() => onSelectProduct(p)}
                >
                  <Plus className="h-4 w-4" />
                  Montar
                </Button>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
      <section className="px-4 py-6">
        <div className="mx-auto max-w-md rounded-3xl bg-primary p-5 text-primary-foreground shadow">
          <h3 className="text-lg font-bold">Monte seu Copo</h3>
          <p className="mt-1 text-sm opacity-90">
            Personalize cada camada do seu açaí com mais de 30 acompanhamentos.
          </p>
          <Button
            variant="secondary"
            className="mt-4 h-11 w-full"
            onClick={onOrderClick}
          >
            Começar agora
          </Button>
        </div>
      </section>
      <div className="h-16" />
    </div>
  )
}

