import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dedupe = (rows: Product[]) => {
    const byKey = new Map<string, Product>()
    for (const p of rows) {
      let key = ''
      if (p.category === 'size') {
        const m = /(\d+)\s*ml/i.exec(p.name || '')
        if (m) {
          key = `size|${m[1]}ml`
        } else {
          key = `size|${(p.name || '').trim().toLowerCase()}`
        }
      } else {
        key = `${p.category}|${(p.name || '').trim().toLowerCase()}`
      }
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, p)
      } else {
        const a = new Date(existing.updated_at || existing.created_at || '').getTime() || 0
        const b = new Date(p.updated_at || p.created_at || '').getTime() || 0
        byKey.set(key, b >= a ? p : existing)
      }
    }
    const out = Array.from(byKey.values())
    out.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      if (a.category === 'size') return a.price - b.price
      return (a.name || '').localeCompare(b.name || '')
    })
    return out
  }

  useEffect(() => {
    const supabase = createClient()

    const fetchAll = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_available', true)
          .order('category', { ascending: true })
          .order('price', { ascending: true })
        if (error) {
          setError(error.message || 'Falha ao carregar produtos')
          setProducts([])
        } else {
          const rows = (data || []) as Product[]
          setProducts(dedupe(rows))
          setError(null)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAll()

    const channel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchAll()
        }
      )
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {}
    }
  }, [])

  return { products, loading, error }
}

