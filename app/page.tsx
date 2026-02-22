'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/storefront/header'
import { HeroSection } from '@/components/storefront/hero-section'
import { ProductsSection } from '@/components/storefront/products-section'
import { AcaiBuilder } from '@/components/storefront/acai-builder'
import { CartSidebar } from '@/components/storefront/cart-sidebar'
import { MobileLanding } from '@/components/storefront/mobile-landing'
import { MobileBottomNav } from '@/components/storefront/mobile-bottom-nav'
import type { Product } from '@/lib/types'
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react'
import { trackViewContent } from '@/lib/analytics'
import { useProducts } from '@/hooks/use-products'

export default function HomePage() {
  const { products, loading: isLoading } = useProducts()
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedSize, setSelectedSize] = useState<Product | null>(null)
  const [banner, setBanner] = useState<{ enabled: boolean; text: string; code: string | null }>({ enabled: false, text: '', code: null })

  useEffect(() => {
    async function fetchBanner() {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase
        .from('marketing_settings')
        .select('first_order_banner_enabled, first_order_banner_text, first_order_coupon_code')
        .limit(1)
        .single()
      if (data) {
        setBanner({
          enabled: Boolean(data.first_order_banner_enabled),
          text: (data.first_order_banner_text as string) || '',
          code: (data.first_order_coupon_code as string) || null,
        })
      }
    }
    fetchBanner()
  }, [])

  const handleOpenBuilder = (product?: Product) => {
    if (product) {
      setSelectedSize(product)
    }
    setIsBuilderOpen(true)
    trackViewContent({ name: product ? product.name : 'builder' })
  }

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false)
    setSelectedSize(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {banner.enabled && (
          <div className="bg-accent/20 py-3">
            <div className="container mx-auto px-4 text-center">
              <span className="font-semibold text-accent-foreground">
                {banner.text || '10% OFF no seu primeiro pedido'}
              </span>
              {banner.code && (
                <span className="ml-2 rounded bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                  {banner.code}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mobile layout */}
        <div className="md:hidden">
          <MobileLanding
            products={products}
            onSelectProduct={(p) => handleOpenBuilder(p)}
            onOrderClick={() => handleOpenBuilder()}
            couponCode={banner.code}
          />
        </div>

        {/* Desktop/tablet layout */}
        <div className="hidden md:block">
          <HeroSection onOrderClick={() => handleOpenBuilder()} />

          {isLoading ? (
            <section className="py-20">
              <div className="container mx-auto px-4 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando cardápio...</p>
              </div>
            </section>
          ) : (
            <ProductsSection
              products={products}
              onSelectProduct={handleOpenBuilder}
            />
          )}
        </div>

        {/* About Section */}
        <section id="sobre" className="bg-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Sobre o Açaí da Serra
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Desde 2018, levando o melhor açaí da Amazônia para sua casa. 
                Trabalhamos apenas com polpa 100% natural, sem conservantes, 
                garantindo o sabor autêntico que você merece.
              </p>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl bg-card p-6 shadow-sm">
                  <p className="text-4xl font-bold text-primary">5000+</p>
                  <p className="text-muted-foreground">Pedidos entregues</p>
                </div>
                <div className="rounded-2xl bg-card p-6 shadow-sm">
                  <p className="text-4xl font-bold text-primary">4.9</p>
                  <p className="text-muted-foreground">Avaliação média</p>
                </div>
                <div className="rounded-2xl bg-card p-6 shadow-sm">
                  <p className="text-4xl font-bold text-primary">30min</p>
                  <p className="text-muted-foreground">Tempo médio</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contato" className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-8 text-center text-3xl font-bold text-foreground md:text-4xl">
                Fale Conosco
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col items-center rounded-2xl bg-card p-6 text-center shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">Endereço</h3>
                  <p className="text-sm text-muted-foreground">
                    Rua das Palmeiras, 123
                    <br />
                    Centro - São Paulo/SP
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-card p-6 text-center shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">Telefone</h3>
                  <p className="text-sm text-muted-foreground">
                    (11) 99999-9999
                    <br />
                    WhatsApp disponível
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-card p-6 text-center shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">Horário</h3>
                  <p className="text-sm text-muted-foreground">
                    Seg a Sex: 10h - 22h
                    <br />
                    Sab e Dom: 11h - 23h
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card pt-8 pb-20 md:py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <span className="text-sm font-bold text-primary-foreground">A</span>
              </div>
              <span className="font-semibold text-foreground">Açaí da Serra</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Açaí da Serra. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AcaiBuilder
        isOpen={isBuilderOpen}
        onClose={handleCloseBuilder}
        products={products}
        initialSize={selectedSize}
      />
      <CartSidebar />
      <MobileBottomNav />
    </div>
  )
}
