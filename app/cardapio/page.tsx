'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  Star,
  Leaf,
  Cherry,
  Plus,
  Sparkles,
  Clock,
  Truck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

export default function CardapioPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('price')

      setProducts(data || [])
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const sizes = products.filter((p) => p.category === 'size')
  const bases = products.filter((p) => p.category === 'base')
  const addons = products.filter((p) => p.category === 'addon')

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Açaí da Serra
            </span>
          </div>
          <Link href="/">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Fazer Pedido</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 text-center">
          <Badge className="mb-4 bg-accent/20 text-accent-foreground hover:bg-accent/30">
            <Sparkles className="mr-1 h-3 w-3" />
            Cardápio Completo
          </Badge>
          <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Nosso Cardápio
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-primary-foreground/80">
            Descubra todas as opções para montar o açaí perfeito. Escolha o
            tamanho, o sabor da base e adicione seus complementos favoritos.
          </p>
          {/* Quick Info */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Clock className="h-5 w-5" />
              <span>Entrega em 30min</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Truck className="h-5 w-5" />
              <span>Taxa fixa R$5,00</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Star className="h-5 w-5 fill-current" />
              <span>4.9 estrelas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tamanhos */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3">
              Passo 1
            </Badge>
            <h2 className="mb-2 text-3xl font-bold text-foreground">
              Escolha o Tamanho
            </h2>
            <p className="text-muted-foreground">
              Selecione o tamanho ideal para sua fome
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {sizes.map((size, index) => (
              <Card
                key={size.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  index === 1
                    ? 'border-2 border-primary md:scale-105'
                    : 'border-border'
                }`}
              >
                {index === 1 && (
                  <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Mais Vendido
                  </div>
                )}
                <CardContent className="flex flex-col items-center p-6 text-center">
                  {/* Bowl Illustration */}
                  <div
                    className={`mb-4 flex items-center justify-center rounded-full bg-primary/10 ${
                      index === 0
                        ? 'h-20 w-20'
                        : index === 1
                          ? 'h-28 w-28'
                          : 'h-32 w-32'
                    }`}
                  >
                    <div
                      className={`rounded-full bg-primary/80 ${
                        index === 0
                          ? 'h-14 w-14'
                          : index === 1
                            ? 'h-20 w-20'
                            : 'h-24 w-24'
                      }`}
                    />
                  </div>
                  <h3 className="mb-1 text-xl font-bold text-foreground">
                    {size.name}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {size.description}
                  </p>
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(size.price)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Bases */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3">
              Passo 2
            </Badge>
            <h2 className="mb-2 text-3xl font-bold text-foreground">
              Sabor da Base
            </h2>
            <p className="text-muted-foreground">
              Escolha o sabor que combina com seu açaí
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bases.map((base) => (
              <Card
                key={base.id}
                className="transition-all hover:border-primary hover:shadow-md"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Leaf className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {base.name}
                    </h3>
                    {base.description && (
                      <p className="text-sm text-muted-foreground">
                        {base.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {base.price > 0 ? (
                      <span className="font-bold text-primary">
                        +{formatPrice(base.price)}
                      </span>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-accent/20 text-accent-foreground"
                      >
                        Incluso
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Adicionais */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3">
              Passo 3
            </Badge>
            <h2 className="mb-2 text-3xl font-bold text-foreground">
              Adicionais
            </h2>
            <p className="text-muted-foreground">
              Turbine seu açaí com complementos especiais
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((addon) => (
              <Card
                key={addon.id}
                className="transition-all hover:border-accent hover:shadow-md"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Cherry className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">
                      {addon.name}
                    </h3>
                    {addon.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {addon.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-bold text-primary">
                    +{formatPrice(addon.price)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
            Pronto para montar seu açaí?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Faça seu pedido agora e receba em até 30 minutos
          </p>
          <Link href="/">
            <Button size="lg" className="gap-2 text-base">
              <Plus className="h-5 w-5" />
              Fazer Meu Pedido
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Açaí da Serra</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            O melhor açaí da região, direto para sua casa.
          </p>
        </div>
      </footer>
    </div>
  )
}
