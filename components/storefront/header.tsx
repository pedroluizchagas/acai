'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

export function Header() {
  const { items, openCart } = useCartStore()
  const itemCount = items.length

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <span className="text-lg font-bold text-primary-foreground">A</span>
          </div>
          <span className="text-xl font-bold text-foreground">
            Açaí da Serra
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#cardapio"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Cardápio
          </Link>
          <Link
            href="#sobre"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Sobre
          </Link>
          <Link
            href="#contato"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Contato
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative hidden md:inline-flex"
            onClick={openCart}
            aria-label="Abrir carrinho"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
