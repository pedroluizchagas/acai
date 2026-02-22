'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'

interface Invoice {
  id: string
  order_id: string | null
  customer_name: string | null
  customer_phone: string | null
  issue_date: string
  due_date: string
  amount: number
  status: 'open' | 'paid' | 'cancelled'
}

export default function ReceberPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<{ id: keyof Invoice; desc: boolean }>({ id: 'issue_date', desc: true })
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'overdue' | 'paid' | 'cancelled'>('all')

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  const loadInvoices = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from('invoices').select('*', { count: 'exact' })
      if (statusFilter === 'open') {
        query = query.eq('status', 'open')
      } else if (statusFilter === 'paid') {
        query = query.eq('status', 'paid')
      } else if (statusFilter === 'cancelled') {
        query = query.eq('status', 'cancelled')
      } else if (statusFilter === 'overdue') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.eq('status', 'open').lt('due_date', today.toISOString())
      }
      query = query.order(sortBy.id as string, { ascending: !sortBy.desc })
      const from = pageIndex * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
      const { data, error, count } = await query
      if (error) throw error
      setInvoices((data || []) as Invoice[])
      setTotalCount(count || 0)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Erro ao carregar faturas', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pageSize, sortBy, statusFilter])

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', invoice.id)
      if (error) throw error
      toast({ title: 'Fatura baixada', description: 'Status atualizado para pago' })
      loadInvoices()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Não foi possível baixar a fatura', variant: 'destructive' })
    }
  }

  const totalOpen = invoices
    .filter((i) => i.status === 'open')
    .reduce((sum, i) => sum + i.amount, 0)

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
      setSelectAll(false)
    } else {
      setSelectedIds(invoices.map((i) => i.id))
      setSelectAll(true)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const bulkMarkPaid = async () => {
    if (!selectedIds.length) return
    const supabase = createClient()
    await supabase.from('invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).in('id', selectedIds)
    setSelectedIds([])
    setSelectAll(false)
    loadInvoices()
  }

  const bulkDelete = async () => {
    if (!selectedIds.length) return
    const supabase = createClient()
    await supabase.from('invoices').delete().in('id', selectedIds)
    setSelectedIds([])
    setSelectAll(false)
    loadInvoices()
  }

  const exportInvoicesCSV = () => {
    const rows = [
      ['Cliente', 'Telefone', 'Emissão', 'Vencimento', 'Valor', 'Status'],
      ...invoices.map((i) => [
        i.customer_name || '',
        i.customer_phone || '',
        i.issue_date ? new Date(i.issue_date).toLocaleDateString('pt-BR') : '',
        i.due_date ? new Date(i.due_date).toLocaleDateString('pt-BR') : '',
        String(i.amount),
        i.status,
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = useMemo<ColumnDef<Invoice>[]>(() => {
    return [
      {
        id: 'select',
        header: () => (
          <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={() => toggleSelect(row.original.id)}
          />
        ),
        size: 36,
      },
      {
        accessorKey: 'customer_name',
        header: () => (
          <button
            className="text-left"
            onClick={() =>
              setSortBy((prev) => ({ id: 'customer_name', desc: prev.id === 'customer_name' ? !prev.desc : false }))
            }
          >
            Cliente
          </button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.customer_name || '-'}</span>,
      },
      {
        accessorKey: 'customer_phone',
        header: () => <span>Telefone</span>,
        cell: ({ row }) => <span>{row.original.customer_phone || '-'}</span>,
      },
      {
        accessorKey: 'issue_date',
        header: () => (
          <button
            className="text-left"
            onClick={() =>
              setSortBy((prev) => ({ id: 'issue_date', desc: prev.id === 'issue_date' ? !prev.desc : true }))
            }
          >
            Emissão
          </button>
        ),
        cell: ({ row }) => (
          <span>
            {row.original.issue_date
              ? new Date(row.original.issue_date).toLocaleDateString('pt-BR')
              : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: () => (
          <button
            className="text-left"
            onClick={() =>
              setSortBy((prev) => ({ id: 'due_date', desc: prev.id === 'due_date' ? !prev.desc : false }))
            }
          >
            Vencimento
          </button>
        ),
        cell: ({ row }) => (
          <span>
            {row.original.due_date
              ? new Date(row.original.due_date).toLocaleDateString('pt-BR')
              : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => (
          <button
            className="text-right w-full"
            onClick={() =>
              setSortBy((prev) => ({ id: 'amount', desc: prev.id === 'amount' ? !prev.desc : true }))
            }
          >
            Valor
          </button>
        ),
        cell: ({ row }) => <span className="text-right block">{formatPrice(row.original.amount)}</span>,
      },
      {
        accessorKey: 'status',
        header: () => <span>Status</span>,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === 'open'
                ? 'outline'
                : row.original.status === 'paid'
                ? 'default'
                : 'secondary'
            }
          >
            {row.original.status === 'open'
              ? 'Aberta'
              : row.original.status === 'paid'
              ? 'Paga'
              : 'Cancelada'}
          </Badge>
        ),
      },
      {
        id: 'action',
        header: () => <span className="block text-right">Ação</span>,
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.status === 'open' && (
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent gap-1"
                onClick={() => handleMarkPaid(row.original)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Baixar
              </Button>
            )}
          </div>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAll, selectedIds, sortBy])

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {},
  })

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize))

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Contas a Receber
          </h1>
          <p className="text-muted-foreground">
            Acompanhe faturas em aberto e registre recebimentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs text-muted-foreground">Total em Aberto</div>
            <div className="text-lg font-semibold text-foreground">
              {formatPrice(totalOpen)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => {
              setPageIndex(0)
              setStatusFilter(v as any)
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={exportInvoicesCSV}
          >
            Exportar CSV
          </Button>
          {!!selectedIds.length && (
            <>
              <Button variant="outline" className="bg-transparent" onClick={bulkMarkPaid}>
                Baixar Selecionadas ({selectedIds.length})
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={bulkDelete}>
                Excluir Selecionadas ({selectedIds.length})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="bg-transparent gap-2"
            onClick={loadInvoices}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} style={{ width: header.getSize() }}>
                        {header.isPlaceholder ? null : header.column.columnDef.header instanceof Function
                          ? header.column.columnDef.header(header.getContext() as any)
                          : header.column.columnDef.header as any}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {cell.column.columnDef.cell instanceof Function
                          ? cell.column.columnDef.cell(cell.getContext() as any)
                          : cell.getValue() as any}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Página {pageIndex + 1} de {totalPages} • {totalCount} registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0 || isLoading}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1 || isLoading}
              >
                Próxima
              </Button>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageIndex(0)
                  setPageSize(Number(v))
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="20 por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
