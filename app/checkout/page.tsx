'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  MapPin,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { trackPurchase } from '@/lib/analytics'
import type { Coupon, Product } from '@/lib/types'

export default function CheckoutPage() {
  const router = useRouter()
  const {
    items,
    getSubtotal,
    getTotal,
    deliveryFee,
    clearCart,
    getEffectiveDeliveryFee,
    getDiscount,
    applyCoupon,
    removeCoupon,
    coupon,
    addAddonToItem,
  } = useCartStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [addons, setAddons] = useState<Product[]>([])
  const [intentId, setIntentId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    complement: '',
    notes: '',
    paymentMethod: 'pix',
  })

  const supabase = createClient()

  const loadAddons = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .eq('category', 'addon')
      .order('price', { ascending: true })
    setAddons((data || []) as Product[])
  }

  React.useEffect(() => {
    loadAddons()
  }, [])

  React.useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('acai-intent-id') : null
      if (stored) setIntentId(stored)
    } catch {}
  }, [])

  React.useEffect(() => {
    const shouldTrack =
      formData.name.trim().length > 1 &&
      formData.phone.trim().length > 8 &&
      items.length > 0
    if (!shouldTrack) return

    const trackIntent = async () => {
      try {
        const orderItems = items.map((item) => ({
          name: item.size.name,
          size: item.size.name.split(' ')[1],
          base: item.base.name,
          addons: item.addons.map((a) => a.name),
          price: item.totalPrice,
        }))
        if (!intentId) {
          const { data, error } = await supabase
            .from('checkout_intents')
            .insert({
              customer_name: formData.name,
              customer_phone: formData.phone,
              items: orderItems,
              subtotal: getSubtotal(),
              delivery_fee: getEffectiveDeliveryFee(),
              discount_total: getDiscount(),
              total: getTotal(),
              coupon_code: coupon?.code || null,
              status: 'pending',
            })
            .select('id')
            .single()
          if (!error && data?.id) {
            setIntentId(data.id as string)
            try {
              window.localStorage.setItem('acai-intent-id', String(data.id))
            } catch {}
          }
        } else {
          await supabase
            .from('checkout_intents')
            .update({
              items: orderItems,
              subtotal: getSubtotal(),
              delivery_fee: getEffectiveDeliveryFee(),
              discount_total: getDiscount(),
              total: getTotal(),
              coupon_code: coupon?.code || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', intentId)
        }
      } catch {}
    }
    trackIntent()
  }, [formData.name, formData.phone, items, coupon])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const validateCoupon = async (code: string): Promise<Coupon | null> => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return null
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', normalized)
      .eq('active', true)
      .limit(1)
      .single()
    if (error || !data) return null
    const now = new Date().toISOString()
    if (data.starts_at && data.starts_at > now) return null
    if (data.ends_at && data.ends_at < now) return null
    if (data.min_order_value && getSubtotal() < Number(data.min_order_value)) return null
    if (data.max_redemptions && data.redemptions_count >= data.max_redemptions) return null
    if (data.first_time_only) {
      if (!formData.phone) return null
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_phone', formData.phone)
      if ((count || 0) > 0) return null
    }
    return data as Coupon
  }

  const handleApplyCoupon = async () => {
    const c = await validateCoupon(couponInput)
    if (!c) {
      toast({ title: 'Cupom inválido', description: 'Verifique regras e valor mínimo', variant: 'destructive' })
      return
    }
    applyCoupon({ code: c.code, type: c.type, value: c.value })
    toast({ title: 'Cupom aplicado', description: `${c.code} aplicado ao pedido` })
  }

  const handleRemoveCoupon = () => {
    removeCoupon()
    toast({ title: 'Cupom removido' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone || !formData.address) {
      toast({ title: 'Erro', description: 'Por favor, preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    if (items.length === 0) {
      toast({ title: 'Erro', description: 'Seu carrinho está vazio', variant: 'destructive' })
      return
    }

    setIsLoading(true)

    try {
      const orderItems = items.map((item) => ({
        name: item.size.name,
        size: item.size.name.split(' ')[1],
        base: item.base.name,
        addons: item.addons.map((a) => a.name),
        price: item.totalPrice,
      }))

      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_address: formData.address,
          customer_complement: formData.complement || null,
          items: orderItems,
          subtotal: getSubtotal(),
          delivery_fee: getEffectiveDeliveryFee(),
          discount_total: getDiscount(),
          total: getTotal(),
          coupon_code: coupon?.code || null,
          payment_method: formData.paymentMethod,
          status: 'pending',
          notes: formData.notes || null,
        })
        .select('order_number')
        .single()

      if (error) throw error

      if (coupon?.code) {
        const { data: cdata } = await supabase
          .from('coupons')
          .select('id, redemptions_count')
          .eq('code', coupon.code)
          .limit(1)
          .single()
        if (cdata?.id) {
          await supabase
            .from('coupons')
            .update({ redemptions_count: Number(cdata.redemptions_count || 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', cdata.id)
        }
      }

      setOrderNumber(data.order_number)
      setOrderComplete(true)
      clearCart()
      try {
        trackPurchase(getTotal(), data.order_number)
      } catch {}
      try {
        if (intentId) {
          await supabase
            .from('checkout_intents')
            .update({
              status: 'converted',
              converted_at: new Date().toISOString(),
              order_number: data.order_number,
            })
            .eq('id', intentId)
          try {
            window.localStorage.removeItem('acai-intent-id')
          } catch {}
          setIntentId(null)
        }
      } catch {}
      toast({ title: 'Sucesso', description: 'Pedido realizado com sucesso!' })
    } catch (error) {
      console.error('Error creating order:', error)
      toast({ title: 'Erro', description: 'Erro ao processar pedido. Tente novamente.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-lg px-4 py-12">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/20">
                <CheckCircle className="h-10 w-10 text-accent" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Pedido Confirmado!
              </h1>
              <p className="mb-6 text-muted-foreground">
                Seu pedido #{orderNumber} foi recebido e está sendo preparado
              </p>

              <div className="mb-6 rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  {formData.paymentMethod === 'pix' ? (
                    <>
                      Aguarde o entregador com o{' '}
                      <span className="font-medium text-foreground">QR Code do PIX</span>
                    </>
                  ) : (
                    <>
                      Tenha seu cartão pronto para o pagamento na entrega
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <Button className="w-full" onClick={() => router.push('/')}>
                  Voltar ao Início
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => router.push('/admin')}
                >
                  Acompanhar Pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-lg px-4 py-12">
          <Card className="text-center">
            <CardContent className="p-8">
              <h1 className="mb-2 text-xl font-semibold text-foreground">
                Carrinho Vazio
              </h1>
              <p className="mb-6 text-muted-foreground">
                Adicione itens ao carrinho para continuar
              </p>
              <Link href="/">
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Cardápio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            Finalizar Pedido
          </h1>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {item.size.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.base.name}
                      {item.addons.length > 0 &&
                        ` + ${item.addons.map((a) => a.name).join(', ')}`}
                    </p>
                  </div>
                  <span className="font-medium text-foreground">
                    {formatPrice(item.totalPrice)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex gap-2">
                <Input
                  placeholder="Código do cupom"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                {coupon ? (
                  <Button variant="outline" className="bg-transparent" onClick={handleRemoveCoupon}>
                    Remover
                  </Button>
                ) : (
                  <Button onClick={handleApplyCoupon}>Aplicar</Button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatPrice(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrega</span>
                  <span className="text-foreground">{formatPrice(getEffectiveDeliveryFee())}</span>
                </div>
                {getDiscount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-foreground">-{formatPrice(getDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatPrice(getTotal())}</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Sugestões para completar seu pedido</p>
                <div className="grid grid-cols-2 gap-3">
                  {addons.slice(0, 4).map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="text-sm">
                        <p className="font-medium text-foreground">{addon.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(addon.price)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => addAddonToItem(items[items.length - 1].id, addon)}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                Dados de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço completo *</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Rua, número, bairro"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  name="complement"
                  placeholder="Apto, bloco, referência..."
                  value={formData.complement}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Alguma observação sobre o pedido?"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Forma de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
                className="space-y-3"
              >
                <label
                  htmlFor="pix"
                  className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-border p-4 transition-colors hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="pix" id="pix" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                    <Smartphone className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">PIX</p>
                    <p className="text-sm text-muted-foreground">
                      Pagamento instantâneo
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="credit_card"
                  className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-border p-4 transition-colors hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Cartão de Crédito
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pague na entrega
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              `Confirmar Pedido • ${formatPrice(getTotal())}`
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
