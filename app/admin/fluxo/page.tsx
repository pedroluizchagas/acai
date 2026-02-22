'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface CF {
  month: string
  net_cash: number
}

export default function FluxoPage() {
  const [rows, setRows] = useState<CF[]>([])
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase.from('view_cashflow_monthly_direct').select('*').order('month', { ascending: false }).limit(12)
    setRows((data || []) as CF[])
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

  const acumulado = useMemo(() => {
    let sum = 0
    return rows
      .slice()
      .reverse()
      .map((r) => {
        sum += Number(r.net_cash || 0)
        return { month: r.month, value: sum }
      })
      .reverse()
  }, [rows])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Fluxo de Caixa (Direto)</h1>
        <p className="text-muted-foreground">Variação mensal de caixa</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Variação de Caixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell>{fdate(r.month)}</TableCell>
                      <TableCell className="text-right">{fmt(r.net_cash)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Saldo Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acumulado.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell>{fdate(r.month)}</TableCell>
                      <TableCell className="text-right">{fmt(r.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

