'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface SummaryRow {
  id: string
  item_name: string
  unit: string
  min_quantity: number
  qty_on_hand: number
}

interface MovementRow {
  stock_item_id: string
  qty: number
}

export default function CoberturaEstoquePage() {
  const supabase = createClient()
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [movements, setMovements] = useState<Record<string, number>>({})
  const [days, setDays] = useState('30')
  const [search, setSearch] = useState('')

  const load = async () => {
    const { data: summary } = await supabase.from('view_stock_summary').select('id,item_name,unit,min_quantity,qty_on_hand')
    setRows((summary || []) as SummaryRow[])
    const win = Math.max(1, parseInt(days || '30', 10))
    const since = new Date()
    since.setDate(since.getDate() - win + 1)
    since.setHours(0, 0, 0, 0)
    const { data: outs } = await supabase
      .from('stock_movements')
      .select('stock_item_id,qty')
      .eq('type', 'out')
      .gte('created_at', since.toISOString())
    const agg: Record<string, number> = {}
    ;(outs || []).forEach((o: MovementRow) => {
      agg[o.stock_item_id] = (agg[o.stock_item_id] || 0) + Number(o.qty || 0)
    })
    setMovements(agg)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => r.item_name.toLowerCase().includes(s))
  }, [rows, search])

  const win = Math.max(1, parseInt(days || '30', 10))

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n)

  const totalValor = 0

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Cobertura de Estoque</h1>
          <p className="text-muted-foreground">Dias de cobertura com base no consumo médio</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label>Janela (dias)</Label>
            <Input value={days} onChange={(e) => setDays(e.target.value)} className="w-24" />
          </div>
          <div>
            <Label>Buscar</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item" />
          </div>
          <div>
            <button
              className="inline-flex h-9 items-center justify-center rounded-md border bg-card px-3 text-sm"
              onClick={load}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qtd Calc</TableHead>
                  <TableHead className="text-center">Consumo {win}d</TableHead>
                  <TableHead className="text-center">Média/Dia</TableHead>
                  <TableHead className="text-center">Cobertura (dias)</TableHead>
                  <TableHead className="text-center">Mínima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const sumOut = movements[r.id] || 0
                  const avgDay = sumOut / win
                  const coverage = avgDay > 0 ? r.qty_on_hand / avgDay : Infinity
                  const minDays = avgDay > 0 ? r.min_quantity / avgDay : Infinity
                  const isCritical = isFinite(coverage) && coverage < minDays
                  const isWarning = isFinite(coverage) && coverage >= minDays && coverage < minDays * 1.5
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.item_name}</TableCell>
                      <TableCell className="text-center">{fmt(r.qty_on_hand)}</TableCell>
                      <TableCell className="text-center">{fmt(sumOut)}</TableCell>
                      <TableCell className="text-center">{fmt(avgDay)}</TableCell>
                      <TableCell className="text-center">
                        {isFinite(coverage) ? (
                          <Badge
                            className={
                              isCritical
                                ? 'bg-red-500 text-white'
                                : isWarning
                                ? 'bg-yellow-500 text-black'
                                : 'bg-emerald-500 text-white'
                            }
                          >
                            {fmt(coverage)} d
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-center">{fmt(r.min_quantity)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
