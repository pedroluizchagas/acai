'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  RefreshCw,
  Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { StockItem } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export default function StockPage() {
  const { toast } = useToast()
  const [stock, setStock] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [replenishItem, setReplenishItem] = useState<StockItem | null>(null)
  const [replenishQty, setReplenishQty] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newMinQty, setNewMinQty] = useState('')
  const [newUnit, setNewUnit] = useState('unidade')
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const [editItem, setEditItem] = useState<StockItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editMinQty, setEditMinQty] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [summary, setSummary] = useState<Record<string, { qty_on_hand: number; avg_cost: number; total_value: number }>>({})

  useEffect(() => {
    fetchStock()
  }, [])

  const getErrorMessage = (err: unknown) => {
    if (!err) return 'Erro desconhecido'
    if (typeof err === 'string') return err
    if (err instanceof Error) {
      if (err.message === 'Failed to fetch') {
        return 'Falha de rede ao acessar o banco. Verifique a URL do Supabase e sua conexão.'
      }
      return err.message
    }
    const e = err as any
    if (typeof e?.message === 'string') return e.message
    const parts = [e?.code, e?.details, e?.hint, e?.error].filter(Boolean)
    if (parts.length) return parts.join(' | ')
    try {
      const json = JSON.stringify(e)
      return json !== '{}' ? json : 'Erro desconhecido'
    } catch {
      return 'Erro desconhecido'
    }
  }

  const fetchStock = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('item_name', { ascending: true })
      if (error) {
        const msg = getErrorMessage(error)
        console.error('Error fetching stock:', msg)
        toast({ title: 'Erro', description: msg, variant: 'destructive' })
        return
      }
      setStock(data || [])
      const { data: sum } = await supabase.from('view_stock_summary').select('*')
      const map: Record<string, { qty_on_hand: number; avg_cost: number; total_value: number }> = {}
      ;(sum || []).forEach((row: any) => {
        map[row.id] = {
          qty_on_hand: Number(row.qty_on_hand || 0),
          avg_cost: Number(row.avg_cost || 0),
          total_value: Number(row.total_value || 0),
        }
      })
      setSummary(map)
    } catch (err) {
      const msg = getErrorMessage(err)
      console.error('Error fetching stock:', msg)
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReplenish = async () => {
    if (!replenishItem || !replenishQty) return

    setIsUpdating(true)
    const supabase = createClient()
    const newQty = replenishItem.quantity + parseInt(replenishQty, 10)

    const { error } = await supabase
      .from('stock')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', replenishItem.id)

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar estoque', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Estoque atualizado!' })
      try {
        await supabase.from('stock_movements').insert({
          stock_item_id: replenishItem.id,
          type: 'in',
          qty: parseInt(replenishQty, 10),
          unit_cost: 0,
          total_cost: 0,
          ref_type: 'manual',
          ref_id: replenishItem.id,
        })
      } catch {}
      fetchStock()
    }

    setReplenishItem(null)
    setReplenishQty('')
    setIsUpdating(false)
  }

  const handleAddItem = async () => {
    if (!newName.trim() || !newUnit.trim() || !newQty || !newMinQty) return
    const qty = parseInt(newQty, 10)
    const minQty = parseInt(newMinQty, 10)
    if (isNaN(qty) || qty < 0 || isNaN(minQty) || minQty < 0) return
    setIsSavingAdd(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('stock')
        .insert({
          item_name: newName.trim(),
          quantity: qty,
          min_quantity: minQty,
          unit: newUnit.trim(),
          updated_at: new Date().toISOString(),
        })
      if (error) {
        const msg = getErrorMessage(error)
        toast({ title: 'Erro', description: msg || 'Erro ao adicionar item', variant: 'destructive' })
      } else {
        toast({ title: 'Sucesso', description: 'Item adicionado ao estoque!' })
        setIsAddOpen(false)
        setNewName('')
        setNewQty('')
        setNewMinQty('')
        setNewUnit('unidade')
        fetchStock()
      }
    } catch (err) {
      const msg = getErrorMessage(err)
      toast({ title: 'Erro', description: msg || 'Erro ao adicionar item', variant: 'destructive' })
    } finally {
      setIsSavingAdd(false)
    }
  }

  const handleEditItem = async () => {
    if (!editItem) return
    if (!editName.trim() || !editUnit.trim() || !editMinQty) return
    const minQty = parseInt(editMinQty, 10)
    if (isNaN(minQty) || minQty < 0) return
    setIsSavingEdit(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('stock')
        .update({
          item_name: editName.trim(),
          min_quantity: minQty,
          unit: editUnit.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editItem.id)
      if (error) {
        const msg = getErrorMessage(error)
        toast({ title: 'Erro', description: msg || 'Erro ao editar item', variant: 'destructive' })
      } else {
        toast({ title: 'Sucesso', description: 'Item atualizado!' })
        setEditItem(null)
        setEditName('')
        setEditMinQty('')
        setEditUnit('')
        fetchStock()
      }
    } catch (err) {
      const msg = getErrorMessage(err)
      toast({ title: 'Erro', description: msg || 'Erro ao editar item', variant: 'destructive' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const getCalcQty = (item: StockItem) => {
    const v = summary[item.id]?.qty_on_hand
    if (v === undefined || v === null || isNaN(v)) return item.quantity
    if (v > 0) return v
    return item.quantity
  }

  const getStatus = (item: StockItem) => {
    const q = getCalcQty(item)
    if (q <= item.min_quantity * 0.5) {
      return { label: 'Crítico', variant: 'destructive' as const, icon: AlertTriangle }
    }
    if (q <= item.min_quantity) {
      return { label: 'Baixo', variant: 'secondary' as const, icon: AlertTriangle }
    }
    return { label: 'Normal', variant: 'outline' as const, icon: CheckCircle }
  }

  const filteredStock = stock.filter((item) =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = stock.filter((item) => getCalcQty(item) <= item.min_quantity).length

  const criticalCount = stock.filter((item) => getCalcQty(item) <= item.min_quantity * 0.5).length

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Controle de Estoque
        </h1>
        <p className="text-muted-foreground">
          Monitore e gerencie o estoque de ingredientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stock.length}</p>
              <p className="text-sm text-muted-foreground">Total de Itens</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  Object.values(summary).reduce((s, v) => s + Number(v.total_value || 0), 0),
                )}
              </p>
              <p className="text-sm text-muted-foreground">Valor do Estoque</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
              <p className="text-sm text-muted-foreground">Estoque Baixo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">Estoque Crítico</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Inventário</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setIsLoading(true)
                  fetchStock()
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={async () => {
                  try {
                    const supabase = createClient()
                    const { data } = await supabase.from('view_stock_summary').select('*')
                    const rows = [
                      ['Item', 'Unidade', 'Qtd Inicial', 'Qtd Saída', 'Qtd Calc', 'Custo Médio', 'Valor'],
                      ...(data || []).map((r: any) => [
                        r.item_name,
                        r.unit,
                        String(r.qty_in || 0),
                        String(r.qty_out || 0),
                        String(r.qty_on_hand || 0),
                        String(r.avg_cost || 0),
                        String(r.total_value || 0),
                      ]),
                    ]
                    const csv = rows.map((row) => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'estoque.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {}
                }}
              >
                Exportar CSV
              </Button>
              <Button onClick={() => setIsAddOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qtd Atual</TableHead>
                  <TableHead className="text-center">Qtd Mínima</TableHead>
                  <TableHead className="text-center">Qtd Calc</TableHead>
                  <TableHead className="text-center">Custo Médio</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Unidade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((item) => {
                  const status = getStatus(item)
                  const sum = summary[item.id]
                  const calcQty = getCalcQty(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.item_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            item.quantity <= item.min_quantity
                              ? 'font-bold text-red-600'
                              : ''
                          }
                        >
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.min_quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {calcQty}
                      </TableCell>
                      <TableCell className="text-center">
                        {sum ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sum.avg_cost || 0) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {sum ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sum.total_value || 0) : '-'}
                      </TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant} className="gap-1">
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 bg-transparent"
                            onClick={() => setReplenishItem(item)}
                          >
                            <Plus className="h-3 w-3" />
                            Repor
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 bg-transparent"
                            onClick={() => {
                              setEditItem(item)
                              setEditName(item.item_name)
                              setEditMinQty(String(item.min_quantity))
                              setEditUnit(item.unit)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Item de Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome do item</Label>
              <Input
                id="new-name"
                placeholder="Ex: Granola"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="new-qty">Quantidade inicial</Label>
                <Input
                  id="new-qty"
                  type="number"
                  min="0"
                  placeholder="Ex: 100"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-min">Qtd mínima</Label>
                <Input
                  id="new-min"
                  type="number"
                  min="0"
                  placeholder="Ex: 20"
                  value={newMinQty}
                  onChange={(e) => setNewMinQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-unit">Unidade</Label>
                <Input
                  id="new-unit"
                  placeholder="Ex: unidade, kg, ml"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSavingAdd}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={
                isSavingAdd ||
                !newName.trim() ||
                !newUnit.trim() ||
                !newQty ||
                !newMinQty
              }
            >
              {isSavingAdd ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replenish Dialog */}
      <Dialog
        open={!!replenishItem}
        onOpenChange={() => setReplenishItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repor Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="font-medium text-foreground">
                {replenishItem?.item_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Quantidade atual: {replenishItem?.quantity}{' '}
                {replenishItem?.unit}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantidade a adicionar</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                placeholder="Ex: 50"
                value={replenishQty}
                onChange={(e) => setReplenishQty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplenishItem(null)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReplenish}
              disabled={!replenishQty || isUpdating}
            >
              {isUpdating ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editItem}
        onOpenChange={() => setEditItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do item</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-min">Qtd mínima</Label>
                <Input
                  id="edit-min"
                  type="number"
                  min="0"
                  value={editMinQty}
                  onChange={(e) => setEditMinQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unidade</Label>
                <Input
                  id="edit-unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditItem(null)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditItem}
              disabled={
                isSavingEdit ||
                !editName.trim() ||
                !editUnit.trim() ||
                !editMinQty
              }
            >
              {isSavingEdit ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
