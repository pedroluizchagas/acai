'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Clock, Truck, Star } from 'lucide-react'
import Image from 'next/image'

interface HeroSectionProps {
  onOrderClick: () => void
}

export function HeroSection({ onOrderClick }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-primary/5 py-12 md:py-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
          {/* Content */}
          <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            {/* Badge */}
            <div className="mb-4 inline-flex items-center rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 px-4 py-1.5 text-sm font-medium text-white">
              <span>O melhor açaí da região</span>
            </div>

            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Açaí fresquinho,{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">do seu jeito</span>
            </h1>

            <p className="mb-8 max-w-xl text-pretty text-lg text-muted-foreground">
              Monte seu copo perfeito com os melhores ingredientes. Entrega
              rápida e sabor incomparável direto na sua casa.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="gap-2 text-base"
                onClick={onOrderClick}
              >
                Fazer Pedido
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-base bg-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Ver Cardápio
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-6">
              <div className="flex flex-col items-center lg:items-start">
                <div className="flex items-center gap-2 text-primary">
                  <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">30min</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Tempo médio
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="flex items-center gap-2 text-primary">
                  <Truck className="h-5 w-5" />
                <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">R$5</span>
                </div>
                <span className="text-sm text-muted-foreground">Entrega</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <div className="flex items-center gap-2 text-primary">
                  <Star className="h-5 w-5 fill-primary" />
                <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">4.9</span>
                </div>
                <span className="text-sm text-muted-foreground">Avaliação</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative flex-1">
            <div className="relative mx-auto aspect-square max-w-md overflow-hidden rounded-3xl bg-primary/10 p-8">
              <Image
                src="/img/Gemini_Generated_Image_dxaztbdxaztbdxaz.png"
                alt="Açaí com frutas e granola"
                fill
                className="object-cover"
                priority
              />
              {/* Floating Elements */}
              <div className="absolute -right-4 top-8 rounded-xl bg-card p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-accent/20" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Granola
                    </p>
                    <p className="text-xs text-muted-foreground">+R$3,00</p>
                  </div>
                </div>
              </div>
              <div className="absolute -left-4 bottom-12 rounded-xl bg-card p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-red-100" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Morango
                    </p>
                    <p className="text-xs text-muted-foreground">+R$4,00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
