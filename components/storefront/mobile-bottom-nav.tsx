'use client'

import Link from 'next/link'
import { Home, Menu, Phone, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

export function MobileBottomNav() {
  const { items, openCart } = useCartStore()
  const count = items.length

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-6 py-2">
        <Link href="/" className="flex flex-1 flex-col items-center gap-1 py-1 text-xs text-muted-foreground">
          <Home className="h-5 w-5" />
          <span>Início</span>
        </Link>
        <a href="#cardapio-mobile" className="flex flex-1 flex-col items-center gap-1 py-1 text-xs text-muted-foreground">
          <Menu className="h-5 w-5" />
          <span>Cardápio</span>
        </a>
        <a href="#contato" className="flex flex-1 flex-col items-center gap-1 py-1 text-xs text-muted-foreground">
          <Phone className="h-5 w-5" />
          <span>Contato</span>
        </a>
        <button
          onClick={openCart}
          className="relative flex flex-1 flex-col items-center gap-1 py-1 text-xs text-muted-foreground"
          aria-label="Abrir carrinho"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Carrinho</span>
          {count > 0 && (
            <span className="absolute right-[18px] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {count}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}

