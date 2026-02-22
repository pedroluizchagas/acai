'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { StockItem } from '@/lib/types'

interface Movement {
  id: string
  stock_item_id: string
  type: 'in' | 'out' | 'adjust'
  qty: number
  unit_cost: number
  total_cost: number
  ref_type: string | null
  ref_id: string | null
  created_at: string
}

export default function MovimentosEstoquePage() {
  const supabase = createClient()
  const [stock, setStock] = useState<StockItem[]>([])
  const [movs, setMovs] = useState<Movement[]>([])
  const [type, setType] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  const loadStock = async () => {
    const { data } = await supabase.from('stock').select('*')
    setStock((data || []) as StockItem[])
  }

  const loadMovs = async () => {
    let query = supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(500)
    if (type) query = query.eq('type', type)
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString())
    if (dateTo) {
      const dt = new Date(dateTo)
      dt.setHours(23, 59, 59, 999)
      query = query.lte('created_at', dt.toISOString())
    }
    const { data } = await query
    setMovs((data || []) as Movement[])
  }

  const refresh = async () => {
    await loadStock()
    await loadMovs()
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nameOfStock = (id: string) => stock.find((s) => s.id === id)?.item_name || id

  const filtered = useMemo(() => {
    if (!search.trim()) return movs
    const s = search.trim().toLowerCase()
    return movs.filter((m) => {
      const name = nameOfStock(m.stock_item_id).toLowerCase()
      const ref = (m.ref_type || '').toLowerCase()
      return name.includes(s) || ref.includes(s)
    })
  }, [movs, search, stock])

  const exportCSV = () => {
    const rows = [
      ['Data', 'Item', 'Tipo', 'Qtd', 'Unitário', 'Total', 'Ref'],
      ...filtered.map((m) => [
        new Date(m.created_at).toLocaleString('pt-BR'),
        nameOfStock(m.stock_item_id),
        m.type,
        String(m.qty),
        String(m.unit_cost),
        String(m.total_cost),
        m.ref_type || '',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'movimentos_estoque.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Movimentos de Estoque</h1>
          <p className="text-muted-foreground">Auditoria de entradas e saídas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-transparent" onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <Label>Tipo</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
                <option value="adjust">Ajuste</option>
              </select>
            </div>
            <div>
              <Label>De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Buscar</Label>
              <Input placeholder="Item ou referência" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="md:col-span-5">
              <Button onClick={loadMovs}>Aplicar</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Unitário</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.created_at).toLocaleString('pt-BR')}</TableCell>
                <TableCell>{nameOfStock(m.stock_item_id)}</TableCell>
                <TableCell>{m.type}</TableCell>
                <TableCell className="text-right">{m.qty}</TableCell>
                <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.unit_cost)}</TableCell>
                <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.total_cost)}</TableCell>
                <TableCell>{m.ref_type || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

