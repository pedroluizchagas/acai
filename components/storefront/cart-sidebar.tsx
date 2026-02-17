'use client'

import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, Plus, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { trackAddToCart } from '@/lib/analytics'

export function CartSidebar() {
  const router = useRouter()
  const { items, isOpen, closeCart, removeItem, getSubtotal, getTotal, getEffectiveDeliveryFee, getDiscount, coupon } =
    useCartStore()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const handleCheckout = () => {
    closeCart()
    try {
      trackAddToCart(getSubtotal())
    } catch {}
    router.push('/checkout')
  }

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5" />
            Seu Carrinho
            {items.length > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {items.length}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                Seu carrinho está vazio
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione itens para fazer seu pedido
              </p>
            </div>
            <Button variant="outline" onClick={closeCart} className="gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Continuar Comprando
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-sm font-bold text-primary">
                            {item.size.name.split(' ')[1]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {item.size.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.base.name}
                          </p>
                          {item.addons.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              + {item.addons.map((a) => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm text-muted-foreground">
                        Subtotal
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    {formatPrice(getSubtotal())}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="text-foreground">
                    {formatPrice(getEffectiveDeliveryFee())}
                  </span>
                </div>
                {getDiscount() > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Desconto{coupon?.code ? ` (${coupon.code})` : ''}
                    </span>
                    <span className="text-foreground">
                      -{formatPrice(getDiscount())}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(getTotal())}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Finalizar Pedido
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={closeCart}
                >
                  Continuar Comprando
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
