'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DRE {
  month: string
  revenue: number
  cogs: number
  gross_margin: number
  other_expenses: number
  net_result: number
}

export default function DREPage() {
  const [rows, setRows] = useState<DRE[]>([])
  const [open, setOpen] = useState(false)
  const [detailMonth, setDetailMonth] = useState<string | null>(null)
  const [details, setDetails] = useState<Array<{ id: string; date: string; description: string | null; amount: number }>>([])
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('view_dre_monthly')
      .select('*')
      .order('month', { ascending: false })
      .limit(12)
    setRows((data || []) as DRE[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  const fdate = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
  }

  const monthsAsc = [...rows].reverse()
  const monthKeys = monthsAsc.map((r) => r.month)

  const openCogsDetails = async (month: string) => {
    const dt = new Date(month)
    const start = new Date(dt.getFullYear(), dt.getMonth(), 1)
    const end = new Date(dt.getFullYear(), dt.getMonth() + 1, 1)
    const { data } = await supabase
      .from('journal_entries')
      .select(
        'id,debit,credit,journals!inner(id,date,description),chart_of_accounts!inner(code)'
      )
      .eq('chart_of_accounts.code', '5.1.1')
      .gte('journals.date', start.toISOString())
      .lt('journals.date', end.toISOString())
    const items =
      (data || []).map((row: any) => ({
        id: row.id,
        date: row.journals?.date || row.date,
        description: row.journals?.description || null,
        amount: Number(row.debit || 0) - Number(row.credit || 0),
      })) ?? []
    setDetails(items)
    setDetailMonth(month)
    setOpen(true)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">DRE</h1>
        <p className="text-muted-foreground">Resumo mensal de resultado</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  {monthKeys.map((m) => (
                    <TableHead key={m} className="text-right">
                      {fdate(m)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Receita</TableCell>
                  {monthsAsc.map((r) => (
                    <TableCell key={`rev-${r.month}`} className="text-right">
                      {fmt(r.revenue)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Custo das Vendas</TableCell>
                  {monthsAsc.map((r) => (
                    <TableCell key={`cogs-${r.month}`} className="text-right">
                      <Button
                        variant="link"
                        className="p-0 text-foreground"
                        onClick={() => openCogsDetails(r.month)}
                      >
                        {fmt(r.cogs)}
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Margem Bruta</TableCell>
                  {monthsAsc.map((r) => (
                    <TableCell key={`gm-${r.month}`} className="text-right">
                      {fmt(r.gross_margin)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Despesas</TableCell>
                  {monthsAsc.map((r) => (
                    <TableCell key={`exp-${r.month}`} className="text-right">
                      {fmt(r.other_expenses)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Resultado</TableCell>
                  {monthsAsc.map((r) => (
                    <TableCell key={`res-${r.month}`} className="text-right">
                      {fmt(r.net_result)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Custo das Vendas {detailMonth ? `(${fdate(detailMonth)})` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      {d.date ? new Date(d.date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>{d.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      {fmt(d.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {!details.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sem lançamentos de COGS no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
