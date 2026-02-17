'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, CouponType } from './types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (size: Product, base: Product, addons: Product[]) => void
  addAddonToItem: (id: string, addon: Product) => void
  removeItem: (id: string) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  applyCoupon: (coupon: { code: string; type: CouponType; value: number | null }) => void
  removeCoupon: () => void
  getDiscount: () => number
  getEffectiveDeliveryFee: () => number
  getTotal: () => number
  getSubtotal: () => number
  deliveryFee: number
  coupon: { code: string; type: CouponType; value: number | null } | null
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      deliveryFee: 5.0,
      coupon: null,

      addItem: (size: Product, base: Product, addons: Product[]) => {
        const totalPrice =
          size.price +
          base.price +
          addons.reduce((sum, addon) => sum + addon.price, 0)

        const newItem: CartItem = {
          id: crypto.randomUUID(),
          size,
          base,
          addons,
          totalPrice,
        }

        set((state) => ({
          items: [...state.items, newItem],
          isOpen: true,
        }))
      },

      addAddonToItem: (id, addon) => {
        set((state) => {
          const items = state.items.map((item) => {
            if (item.id !== id) return item
            const exists = item.addons.some((a) => a.id === addon.id)
            if (exists) return item
            const updated = {
              ...item,
              addons: [...item.addons, addon],
              totalPrice: item.totalPrice + addon.price,
            }
            return updated
          })
          return { items }
        })
      },

      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }))
      },

      clearCart: () => {
        set({ items: [], coupon: null })
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0)
      },

      applyCoupon: (coupon) => {
        set({ coupon })
      },

      removeCoupon: () => {
        set({ coupon: null })
      },

      getDiscount: () => {
        const subtotal = get().getSubtotal()
        const c = get().coupon
        if (!c) return 0
        if (c.type === 'fixed') {
          const v = Math.max(0, Math.min(subtotal, c.value || 0))
          return v
        }
        if (c.type === 'percent') {
          const pct = Math.max(0, Math.min(100, c.value || 0))
          return +(subtotal * (pct / 100)).toFixed(2)
        }
        if (c.type === 'free_shipping') {
          return get().deliveryFee
        }
        return 0
      },

      getEffectiveDeliveryFee: () => {
        const c = get().coupon
        if (c?.type === 'free_shipping') return 0
        return get().deliveryFee
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        if (subtotal <= 0) return 0
        const discount = get().getDiscount()
        const effectiveDelivery = get().getEffectiveDeliveryFee()
        const total = subtotal + effectiveDelivery - discount
        return total > 0 ? +total.toFixed(2) : 0
      },
    }),
    {
      name: 'acai-cart',
    }
  )
)
