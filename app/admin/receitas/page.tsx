'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import type { Product, StockItem } from '@/lib/types'

interface RecipeItem {
  id: string
  product_id: string
  stock_item_id: string
  qty: number
}

export default function ReceitasPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<RecipeItem[]>([])
  const [newRow, setNewRow] = useState<{ stock_item_id: string; qty: string }>({ stock_item_id: '', qty: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return products
    return products.filter((p) => p.name.toLowerCase().includes(s))
  }, [products, search])

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true })
    setProducts((data || []) as Product[])
    if (!selectedProductId && data && data[0]?.id) setSelectedProductId(data[0].id as string)
  }

  const loadStock = async () => {
    const { data } = await supabase.from('stock').select('*').order('item_name', { ascending: true })
    setStock((data || []) as StockItem[])
  }

  const loadRecipe = async (productId: string) => {
    const { data } = await supabase.from('recipe_items').select('*').eq('product_id', productId)
    setRecipe((data || []) as RecipeItem[])
  }

  const refreshAll = async () => {
    setIsLoading(true)
    await loadProducts()
    await loadStock()
    if (selectedProductId) await loadRecipe(selectedProductId)
    setIsLoading(false)
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedProductId) loadRecipe(selectedProductId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  const product = useMemo(() => products.find((p) => p.id === selectedProductId) || null, [products, selectedProductId])

  const addRow = async () => {
    if (!selectedProductId || !newRow.stock_item_id || !newRow.qty) return
    const qty = Number(newRow.qty)
    if (!qty || qty <= 0) return
    const { error } = await supabase.from('recipe_items').insert({
      product_id: selectedProductId,
      stock_item_id: newRow.stock_item_id,
      qty,
    })
    if (!error) {
      setNewRow({ stock_item_id: '', qty: '' })
      loadRecipe(selectedProductId)
    }
  }

  const removeRow = async (id: string) => {
    await supabase.from('recipe_items').delete().eq('id', id)
    if (selectedProductId) loadRecipe(selectedProductId)
  }

  const nameOfStock = (id: string) => stock.find((s) => s.id === id)?.item_name || id

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Receitas de Produtos</h1>
          <p className="text-muted-foreground">Mapeie insumos por produto para custo e estoque</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline" className="bg-transparent gap-2" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => {
                    const active = selectedProductId === p.id
                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className={active ? 'bg-accent/30' : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.category}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {product ? (
              <>
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground">Produto Selecionado</div>
                  <div className="font-semibold text-foreground">{product.name}</div>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label>Insumo</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={newRow.stock_item_id}
                      onChange={(e) => setNewRow((r) => ({ ...r, stock_item_id: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {stock.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.item_name} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      placeholder="0"
                      value={newRow.qty}
                      onChange={(e) => setNewRow((r) => ({ ...r, qty: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" onClick={addRow}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipe.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{nameOfStock(r.stock_item_id)}</TableCell>
                          <TableCell className="text-right">{r.qty}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => removeRow(r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Selecione um produto</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

