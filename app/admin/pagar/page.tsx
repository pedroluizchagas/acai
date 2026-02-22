'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StockItem } from '@/lib/types'

interface Bill {
  id: string
  vendor_id: string | null
  issue_date: string
  due_date: string
  total: number
  category: string | null
  status: 'open' | 'paid' | 'cancelled'
}

interface Vendor {
  id: string
  name: string
}

export default function PagarPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [vendors, setVendors] = useState<Record<string, string>>({})
  const [vendorsList, setVendorsList] = useState<Vendor[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [isVendorOpen, setIsVendorOpen] = useState(false)
  const [vendorForm, setVendorForm] = useState({ name: '', document: '', contact: '' })
  const [isBillOpen, setIsBillOpen] = useState(false)
  const [billForm, setBillForm] = useState<{ vendor_id: string; issue_date: string; due_date: string; total: string; category: string }>({
    vendor_id: '',
    issue_date: '',
    due_date: '',
    total: '',
    category: '',
  })
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [billItems, setBillItems] = useState<Array<{ id: string; stock_item_id: string; qty: number; unit_cost: number; total_cost: number }>>([])
  const [newItem, setNewItem] = useState({ stock_item_id: '', qty: '', unit_cost: '' })
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingQty, setEditingQty] = useState<string>('')
  const [editingUnitCost, setEditingUnitCost] = useState<string>('')
  const [isVendorManageOpen, setIsVendorManageOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  const supabase = createClient()

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  const loadVendors = async () => {
    const { data } = await supabase.from('vendors').select('id,name')
    const map: Record<string, string> = {}
    ;(data || []).forEach((v: Vendor) => (map[v.id] = v.name))
    setVendors(map)
    setVendorsList((data || []) as Vendor[])
  }

  const loadBills = async () => {
    setIsLoading(true)
    try {
      await loadVendors()
      const { data: stockData } = await supabase.from('stock').select('*').order('item_name', { ascending: true })
      setStock((stockData || []) as StockItem[])
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('due_date', { ascending: true })
      if (error) throw error
      setBills((data || []) as Bill[])
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Erro ao carregar contas', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [])

  const handlePay = async (bill: Bill) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', bill.id)
      if (error) throw error
      toast({ title: 'Conta paga', description: 'Baixa registrada com sucesso' })
      loadBills()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Não foi possível pagar a conta', variant: 'destructive' })
    }
  }

  const totalOpen = bills.filter((b) => b.status === 'open').reduce((s, b) => s + b.total, 0)

  const addVendor = async () => {
    if (!vendorForm.name.trim()) return
    const { error } = await supabase.from('vendors').insert({
      name: vendorForm.name.trim(),
      document: vendorForm.document || null,
      contact: vendorForm.contact || null,
    })
    if (!error) {
      setIsVendorOpen(false)
      setVendorForm({ name: '', document: '', contact: '' })
      loadBills()
    }
  }

  const addBill = async () => {
    if (!billForm.vendor_id || !billForm.due_date) return
    const { error } = await supabase.from('bills').insert({
      vendor_id: billForm.vendor_id,
      issue_date: billForm.issue_date || billForm.due_date,
      due_date: billForm.due_date,
      total: Number(billForm.total || 0),
      category: billForm.category || null,
    })
    if (!error) {
      setIsBillOpen(false)
      setBillForm({ vendor_id: '', issue_date: '', due_date: '', total: '', category: '' })
      loadBills()
    }
  }

  const loadBillItems = async (billId: string) => {
    const { data } = await supabase.from('bill_items').select('*').eq('bill_id', billId).order('created_at', { ascending: true })
    setBillItems((data || []) as any)
  }

  const addBillItem = async () => {
    if (!selectedBillId || !newItem.stock_item_id || !newItem.qty || !newItem.unit_cost) return
    const qty = Number(newItem.qty)
    const unit_cost = Number(newItem.unit_cost)
    if (!qty || !unit_cost) return
    const { error } = await supabase.from('bill_items').insert({
      bill_id: selectedBillId,
      stock_item_id: newItem.stock_item_id,
      qty,
      unit_cost,
    })
    if (!error) {
      setNewItem({ stock_item_id: '', qty: '', unit_cost: '' })
      loadBillItems(selectedBillId)
      loadBills()
    }
  }

  const nameOfStock = (id: string) => stock.find((s) => s.id === id)?.item_name || id

  const startEditItem = (it: { id: string; qty: number; unit_cost: number }) => {
    setEditingItemId(it.id)
    setEditingQty(String(it.qty))
    setEditingUnitCost(String(it.unit_cost))
  }

  const saveEditItem = async () => {
    if (!editingItemId || !selectedBillId) return
    const qty = Number(editingQty)
    const unit_cost = Number(editingUnitCost)
    if (!qty || !unit_cost) return
    const { error } = await supabase.from('bill_items').update({ qty, unit_cost }).eq('id', editingItemId)
    if (!error) {
      setEditingItemId(null)
      setEditingQty('')
      setEditingUnitCost('')
      loadBillItems(selectedBillId)
      loadBills()
    }
  }

  const deleteBillItem = async (id: string) => {
    if (!selectedBillId) return
    const { error } = await supabase.from('bill_items').delete().eq('id', id)
    if (!error) {
      loadBillItems(selectedBillId)
      loadBills()
    }
  }

  const deleteBill = async () => {
    if (!selectedBillId) return
    const { error } = await supabase.from('bills').delete().eq('id', selectedBillId)
    if (!error) {
      setSelectedBillId(null)
      setBillItems([])
      loadBills()
      toast({ title: 'Conta excluída' })
    }
  }

  const deleteVendor = async (id: string) => {
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (!error) {
      loadBills()
      toast({ title: 'Fornecedor excluído' })
    }
  }

  const exportBillsCSV = async () => {
    const rows = [
      ['Fornecedor', 'Categoria', 'Emissão', 'Vencimento', 'Valor', 'Status'],
      ...bills.map((b) => [
        b.vendor_id ? vendors[b.vendor_id] || b.vendor_id : '',
        b.category || '',
        b.issue_date ? new Date(b.issue_date).toLocaleDateString('pt-BR') : '',
        b.due_date ? new Date(b.due_date).toLocaleDateString('pt-BR') : '',
        String(b.total),
        b.status,
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bills.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportBillsDetailedCSV = async () => {
    const { data: items } = await supabase.from('bill_items').select('*')
    const rows = [
      ['Fornecedor', 'Conta', 'Emissão', 'Vencimento', 'Categoria', 'Status', 'Item', 'Qtd', 'Unitário', 'Total'],
      ...bills.flatMap((b) => {
        const its = (items || []).filter((it: any) => it.bill_id === b.id)
        if (!its.length) {
          return [[vendors[b.vendor_id || ''] || b.vendor_id || '', b.id, b.issue_date || '', b.due_date || '', b.category || '', b.status, '', '', '', '']]
        }
        return its.map((it: any) => [
          vendors[b.vendor_id || ''] || b.vendor_id || '',
          b.id,
          b.issue_date || '',
          b.due_date || '',
          b.category || '',
          b.status,
          stock.find((s) => s.id === it.stock_item_id)?.item_name || it.stock_item_id,
          String(it.qty),
          String(it.unit_cost),
          String(it.total_cost),
        ])
      }),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bills_detalhado.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
      setSelectAll(false)
    } else {
      setSelectedIds(bills.map((b) => b.id))
      setSelectAll(true)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const bulkPay = async () => {
    if (!selectedIds.length) return
    await supabase.from('bills').update({ status: 'paid', updated_at: new Date().toISOString() }).in('id', selectedIds)
    setSelectedIds([])
    setSelectAll(false)
    loadBills()
  }

  const bulkDelete = async () => {
    if (!selectedIds.length) return
    await supabase.from('bills').delete().in('id', selectedIds)
    setSelectedIds([])
    setSelectAll(false)
    loadBills()
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Contas a Pagar
          </h1>
          <p className="text-muted-foreground">
            Gerencie contas, vencimentos e baixas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs text-muted-foreground">Total em Aberto</div>
            <div className="text-lg font-semibold text-foreground">
              {formatPrice(totalOpen)}
            </div>
          </div>
          <Button variant="outline" className="bg-transparent gap-2" onClick={() => setIsVendorOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </Button>
          <Button variant="outline" className="bg-transparent gap-2" onClick={() => setIsBillOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
          <Button variant="outline" className="bg-transparent gap-2" onClick={() => setIsVendorManageOpen(true)}>
            Gerenciar Fornecedores
          </Button>
          <Button variant="outline" className="bg-transparent gap-2" onClick={exportBillsCSV}>
            Exportar CSV
          </Button>
          <Button variant="outline" className="bg-transparent gap-2" onClick={exportBillsDetailedCSV}>
            Exportar Detalhado
          </Button>
          {!!selectedIds.length && (
            <>
              <Button variant="outline" className="bg-transparent gap-2" onClick={bulkPay}>
                Marcar Pago ({selectedIds.length})
              </Button>
              <Button variant="outline" className="bg-transparent gap-2" onClick={bulkDelete}>
                Excluir Selecionados ({selectedIds.length})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="bg-transparent gap-2"
            onClick={loadBills}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    onClick={() => {
                      setSelectedBillId(bill.id)
                      loadBillItems(bill.id)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(bill.id)}
                        onChange={() => toggleSelect(bill.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {bill.vendor_id ? vendors[bill.vendor_id] || bill.vendor_id : '-'}
                    </TableCell>
                    <TableCell>{bill.category || '-'}</TableCell>
                    <TableCell>
                      {bill.issue_date ? new Date(bill.issue_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(bill.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          bill.status === 'open'
                            ? 'outline'
                            : bill.status === 'paid'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {bill.status === 'open'
                          ? 'Aberta'
                          : bill.status === 'paid'
                          ? 'Paga'
                          : 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {bill.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePay(bill)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {selectedBillId && (
            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold text-foreground">Itens da Compra</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div>
                  <Label>Insumo</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={newItem.stock_item_id}
                    onChange={(e) => setNewItem({ ...newItem, stock_item_id: e.target.value })}
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
                  <Input value={newItem.qty} onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })} />
                </div>
                <div>
                  <Label>Custo Unitário</Label>
                  <Input value={newItem.unit_cost} onChange={(e) => setNewItem({ ...newItem, unit_cost: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={addBillItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Item
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full bg-transparent" onClick={deleteBill}>
                    Excluir Conta
                  </Button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{nameOfStock(it.stock_item_id)}</TableCell>
                        <TableCell className="text-right">
                          {editingItemId === it.id ? (
                            <Input
                              value={editingQty}
                              onChange={(e) => setEditingQty(e.target.value)}
                              className="h-8 w-24 ml-auto"
                            />
                          ) : (
                            it.qty
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItemId === it.id ? (
                            <Input
                              value={editingUnitCost}
                              onChange={(e) => setEditingUnitCost(e.target.value)}
                              className="h-8 w-24 ml-auto"
                            />
                          ) : (
                            formatPrice(it.unit_cost)
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatPrice(it.total_cost)}</TableCell>
                        <TableCell className="text-right">
                          {editingItemId === it.id ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={saveEditItem}>
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => {
                                  setEditingItemId(null)
                                  setEditingQty('')
                                  setEditingUnitCost('')
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent gap-1"
                                onClick={() => startEditItem(it)}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent gap-1"
                                onClick={() => deleteBillItem(it.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remover
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isVendorOpen} onOpenChange={setIsVendorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label>Nome</Label>
              <Input value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={vendorForm.document} onChange={(e) => setVendorForm({ ...vendorForm, document: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Contato</Label>
              <Input value={vendorForm.contact} onChange={(e) => setVendorForm({ ...vendorForm, contact: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addVendor}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVendorManageOpen} onOpenChange={setIsVendorManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Fornecedores</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorsList.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent gap-1"
                        onClick={() => deleteVendor(v.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBillOpen} onOpenChange={setIsBillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label>Fornecedor</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={billForm.vendor_id}
                onChange={(e) => setBillForm({ ...billForm, vendor_id: e.target.value })}
              >
                <option value="">Selecione</option>
                {vendorsList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Emissão</Label>
              <Input type="date" value={billForm.issue_date} onChange={(e) => setBillForm({ ...billForm, issue_date: e.target.value })} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Total (opcional)</Label>
              <Input value={billForm.total} onChange={(e) => setBillForm({ ...billForm, total: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBillOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addBill}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
