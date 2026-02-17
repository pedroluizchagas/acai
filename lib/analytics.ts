declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
  }
}

const currency = 'BRL'

export function trackViewContent(params?: { value?: number; name?: string }) {
  if (typeof window === 'undefined') return
  const value = params?.value || 0
  const name = params?.name || 'view_content'
  if (window.fbq) {
    window.fbq('track', 'ViewContent', { value, currency })
  }
  if (window.gtag) {
    window.gtag('event', 'view_item', {
      value,
      currency,
      items: [{ item_name: name }],
    })
  }
}

export function trackAddToCart(value?: number) {
  if (typeof window === 'undefined') return
  const v = value || 0
  if (window.fbq) {
    window.fbq('track', 'AddToCart', { value: v, currency })
  }
  if (window.gtag) {
    window.gtag('event', 'add_to_cart', { value: v, currency })
  }
}

export function trackPurchase(value: number, transactionId?: string | number) {
  if (typeof window === 'undefined') return
  if (window.fbq) {
    window.fbq('track', 'Purchase', { value, currency })
  }
  if (window.gtag) {
    const params: Record<string, any> = { value, currency }
    if (transactionId) params.transaction_id = String(transactionId)
    window.gtag('event', 'purchase', params)
  }
}
