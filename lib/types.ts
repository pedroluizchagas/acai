export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'size' | 'base' | 'addon'
  image_url: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface StockItem {
  id: string
  item_name: string
  quantity: number
  min_quantity: number
  unit: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  name: string
  size: string
  base: string
  addons: string[]
  price: number
}

export interface Order {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_complement: string | null
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  discount_total?: number
  total: number
  coupon_code?: string | null
  payment_method: 'pix' | 'credit_card' | 'debit_card'
  status: 'pending' | 'preparing' | 'out_for_delivery' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  size: Product
  base: Product
  addons: Product[]
  totalPrice: number
}

export interface AcaiBuilderState {
  step: number
  size: Product | null
  base: Product | null
  addons: Product[]
}

export type CouponType = 'fixed' | 'percent' | 'free_shipping'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number | null
  min_order_value: number
  max_redemptions: number | null
  redemptions_count: number
  first_time_only: boolean
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
  updated_at: string
}
