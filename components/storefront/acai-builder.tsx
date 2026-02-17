'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Check, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
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
]

export function AcaiBuilder({
  isOpen,
  onClose,
  products,
  initialSize,
}: AcaiBuilderProps) {
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
    if (state.step < 3) {
      setState((prev) => ({ ...prev, step: prev.step + 1 }))
    }
  }

  const handleBack = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: prev.step - 1 }))
    }
  }

  const handleAddToCart = () => {
    if (state.size && state.base) {
      addItem(state.size, state.base, state.addons)
      toast({ title: 'Sucesso', description: 'Açaí adicionado ao carrinho!' })
      handleClose()
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle className="text-xl font-bold text-foreground">
            Monte seu Açaí
          </DialogTitle>
          {/* Steps Indicator */}
          <div className="mt-4 flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                      state.step >= step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {state.step > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-12 transition-colors',
                      state.step > step.id ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Step 1: Size Selection */}
          {state.step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escolha o tamanho do seu açaí
              </p>
              <div className="grid gap-3">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => handleSizeSelect(size)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all',
                      state.size?.id === size.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full',
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
            </div>
          )}

          {/* Step 2: Base Selection */}
          {state.step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escolha o sabor da base do seu açaí
              </p>
              <div className="grid gap-3">
                {bases.map((base) => (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => handleBaseSelect(base)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all',
                      state.base?.id === base.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full text-xl',
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

          {/* Step 3: Addons Selection */}
          {state.step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione seus toppings favoritos (opcional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {addons.map((addon) => {
                  const isSelected = state.addons.some((a) => a.id === addon.id)
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => handleAddonToggle(addon)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
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
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 rounded-xl bg-muted/50 p-4">
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border p-6 pt-4">
          <Button
            variant="ghost"
            onClick={state.step === 1 ? handleClose : handleBack}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {state.step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {state.step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleAddToCart}
              disabled={!state.size || !state.base}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Adicionar ao Carrinho
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
