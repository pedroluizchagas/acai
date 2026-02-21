'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import type { Product, AcaiBuilderState } from '@/lib/types'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'

interface AcaiBuilderProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  initialSize?: Product | null
}

const steps = [
  { id: 1, title: 'Tamanho', description: 'Escolha o tamanho do copo' },
  { id: 2, title: 'Base', description: 'Selecione o sabor da base' },
  { id: 3, title: 'Adicionais', description: 'Personalize com toppings' },
  { id: 4, title: 'Revisão', description: 'Confira e continue' },
]

export function AcaiBuilder({
  isOpen,
  onClose,
  products,
  initialSize,
}: AcaiBuilderProps) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const { toast } = useToast()
  const [state, setState] = useState<AcaiBuilderState>({
    step: 1,
    size: initialSize || null,
    base: null,
    addons: [],
  })

  useEffect(() => {
    if (initialSize) {
      setState((prev) => ({ ...prev, size: initialSize, step: 2 }))
    }
  }, [initialSize])

  const sizes = products.filter((p) => p.category === 'size')
  const bases = products.filter((p) => p.category === 'base')
  const addons = products.filter((p) => p.category === 'addon')

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const calculateTotal = () => {
    let total = 0
    if (state.size) total += state.size.price
    if (state.base) total += state.base.price
    total += state.addons.reduce((sum, addon) => sum + addon.price, 0)
    return total
  }

  const handleSizeSelect = (size: Product) => {
    setState((prev) => ({ ...prev, size }))
  }

  const handleBaseSelect = (base: Product) => {
    setState((prev) => ({ ...prev, base }))
  }

  const handleAddonToggle = (addon: Product) => {
    setState((prev) => {
      const exists = prev.addons.find((a) => a.id === addon.id)
      if (exists) {
        return { ...prev, addons: prev.addons.filter((a) => a.id !== addon.id) }
      }
      return { ...prev, addons: [...prev.addons, addon] }
    })
  }

  const handleNext = () => {
    if (state.step < 4) {
      setState((prev) => ({ ...prev, step: prev.step + 1 }))
    }
  }

  const handleBack = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: prev.step - 1 }))
    }
  }

  const handleFinish = () => {
    if (state.size && state.base) {
      addItem(state.size, state.base, state.addons)
      toast({ title: 'Sucesso', description: 'Açaí adicionado ao carrinho!' })
      handleClose()
      router.push('/checkout')
    }
  }

  const handleClose = () => {
    setState({ step: 1, size: null, base: null, addons: [] })
    onClose()
  }

  const canProceed = () => {
    if (state.step === 1) return !!state.size
    if (state.step === 2) return !!state.base
    return true
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto p-0 rounded-none sm:h-auto sm:w-auto sm:max-w-lg sm:rounded-xl">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="text-center text-xs font-semibold tracking-widest text-muted-foreground">
            {`PASSO ${String(state.step).padStart(2, '0')} DE 04`}
          </DialogTitle>
          <div className="mt-4 flex items-center gap-2">
            {steps.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  state.step >= s.id ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="p-5">
          {state.step === 1 && (
            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-foreground">
                Qual o <span className="text-primary">tamanho</span> da sua fome?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha a quantidade ideal para sua fome.
              </p>
            </div>
          )}
          {state.step === 2 && (
            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-foreground">
                Qual o <span className="text-primary">sabor</span> da base?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha o sabor principal para sua montagem.
              </p>
            </div>
          )}
          {state.step === 3 && (
            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-foreground">
                Escolha seus <span className="text-primary">adicionais</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Personalize com nossos acompanhamentos.
              </p>
            </div>
          )}
          {state.step === 4 && (
            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-foreground">
                Revise seu <span className="text-primary">pedido</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confira os itens antes de continuar.
              </p>
            </div>
          )}
          {/* Step 1: Size Selection */}
          {state.step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => handleSizeSelect(size)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all',
                      state.size?.id === size.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl',
                          state.size?.id === size.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <span className="text-sm font-bold">
                          {size.name.split(' ')[1]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {size.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {size.description}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">
                      {formatPrice(size.price)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-4 text-primary-foreground shadow">
                <p className="text-sm font-semibold">Dica Premium</p>
                <div className="mt-1 flex items-center justify-between text-xs opacity-90">
                  <span>O copo de 500ml é o nosso mais pedido!</span>
                  <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold">
                    Mais vendido
                  </span>
                </div>
              </div>
            </div>
          )}

          {state.step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {bases.map((base) => (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => handleBaseSelect(base)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all',
                      state.base?.id === base.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl text-xl',
                          state.base?.id === base.id
                            ? 'bg-primary'
                            : 'bg-primary/20'
                        )}
                      >
                        {base.name.includes('Banana')
                          ? '🍌'
                          : base.name.includes('Morango')
                            ? '🍓'
                            : '🍇'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {base.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {base.description}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">
                      {base.price > 0 ? `+${formatPrice(base.price)}` : 'Grátis'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {addons.map((addon) => {
                  const isSelected = state.addons.some((a) => a.id === addon.id)
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => handleAddonToggle(addon)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {addon.name}
                        </p>
                        <p className="text-xs text-primary">
                          +{formatPrice(addon.price)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-4 text-primary-foreground shadow">
                <p className="text-sm font-semibold">Dica Premium</p>
                <p className="text-xs opacity-90 mt-1">
                  Leite em pó + confete + creme de avelã é a escolha favorita dos nossos clientes.
                </p>
              </div>
            </div>
          )}

          {state.step === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card p-4 shadow-sm border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total do Pedido</span>
                  <span className="text-xl font-extrabold text-primary">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
                <div className="mt-3 text-sm">
                  {state.size && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tamanho</span>
                      <span className="font-medium">{state.size.name}</span>
                    </div>
                  )}
                  {state.base && (
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">Base</span>
                      <span className="font-medium">{state.base.name}</span>
                    </div>
                  )}
                  {state.addons.length > 0 && (
                    <div className="mt-2">
                      <span className="text-muted-foreground">Adicionais</span>
                      <ul className="mt-1 list-disc pl-4 text-xs">
                        {state.addons.map((a) => (
                          <li key={a.id}>{a.name} (+{formatPrice(a.price)})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total do pedido
              </span>
              <span className="text-xl font-bold text-primary">
                {formatPrice(calculateTotal())}
              </span>
            </div>
            {state.size && (
              <div className="mt-2 text-xs text-muted-foreground">
                {state.size.name}
                {state.base && ` • ${state.base.name}`}
                {state.addons.length > 0 &&
                  ` • ${state.addons.length} adicional(is)`}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-background p-5">
          <Button
            variant="ghost"
            onClick={state.step === 1 ? handleClose : handleBack}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {state.step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {state.step < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Próximo passo
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!state.size || !state.base}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Confirmar e Pagar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
