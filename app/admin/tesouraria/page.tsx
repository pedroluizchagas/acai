'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Plus, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BankAccount {
  id: string
  name: string
  type: 'bank' | 'cash'
  opening_balance: number
}

interface Statement {
  id: string
  bank_account_id: string
  external_id: string | null
  date: string
  amount: number
  description: string | null
  status: 'pending' | 'reconciled' | 'ignored'
}

export default function TesourariaPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [statements, setStatements] = useState<Statement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', opening_balance: 0 })
  const [newStatement, setNewStatement] = useState({ date: '', amount: '', description: '' })
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [candidateAmount, setCandidateAmount] = useState<string>('')
  const [candidates, setCandidates] = useState<Array<{ id: string; value: number }>>([])
  const [filterDesc, setFilterDesc] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([])
  const [selectAllStatements, setSelectAllStatements] = useState(false)

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

  const loadAccounts = async () => {
    const { data } = await supabase.from('bank_accounts').select('*').order('created_at', { ascending: true })
    setAccounts((data || []) as BankAccount[])
    if (!selectedAccountId && data && data[0]?.id) setSelectedAccountId(data[0].id as string)
  }

  const loadStatements = async (accountId: string) => {
    let q = supabase.from('bank_statements').select('*').eq('bank_account_id', accountId)
    if (filterDesc.trim()) q = q.ilike('description', `%${filterDesc.trim()}%`)
    if (filterFrom) q = q.gte('date', filterFrom)
    if (filterTo) q = q.lte('date', filterTo)
    const { data } = await q.order('date', { ascending: false })
    setStatements((data || []) as Statement[])
  }

  const refreshAll = async () => {
    setIsLoading(true)
    await loadAccounts()
    if (selectedAccountId) await loadStatements(selectedAccountId)
    setIsLoading(false)
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedAccountId) loadStatements(selectedAccountId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId])

  const handleAddAccount = async () => {
    try {
      if (!newAccount.name.trim()) return
      const { error } = await supabase.from('bank_accounts').insert({
        name: newAccount.name.trim(),
        type: newAccount.type,
        opening_balance: Number(newAccount.opening_balance || 0),
      })
      if (error) throw error
      setShowAddAccount(false)
      setNewAccount({ name: '', type: 'bank', opening_balance: 0 })
      toast({ title: 'Conta adicionada' })
      refreshAll()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Não foi possível adicionar a conta', variant: 'destructive' })
    }
  }

  const handleAddStatement = async () => {
    try {
      if (!selectedAccountId || !newStatement.date || !newStatement.amount) return
      const { error } = await supabase.from('bank_statements').insert({
        bank_account_id: selectedAccountId,
        date: newStatement.date,
        amount: Number(newStatement.amount),
        description: newStatement.description || null,
        status: 'pending',
      })
      if (error) throw error
      setNewStatement({ date: '', amount: '', description: '' })
      toast({ title: 'Linha adicionada' })
      if (selectedAccountId) loadStatements(selectedAccountId)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Não foi possível adicionar a linha', variant: 'destructive' })
    }
  }

  const handleReconcile = async (s: Statement) => {
    setSelectedStatement(s)
    setCandidateAmount(String(s.amount))
    setCandidates([])
    setReconcileOpen(true)
  }

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  )

  const balance = useMemo(() => {
    if (!selectedAccount) return 0
    const base = Number(selectedAccount.opening_balance || 0)
    const delta = statements.reduce((sum, s) => sum + Number(s.amount || 0), 0)
    return base + delta
  }, [selectedAccount, statements])

  const toggleSelectAllStatements = () => {
    if (selectAllStatements) {
      setSelectedStatementIds([])
      setSelectAllStatements(false)
    } else {
      setSelectedStatementIds(statements.map((s) => s.id))
      setSelectAllStatements(true)
    }
  }

  const toggleStatement = (id: string) => {
    setSelectedStatementIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const bulkReconcileSelected = async () => {
    if (!selectedStatementIds.length) return
    await supabase
      .from('bank_statements')
      .update({ status: 'reconciled', updated_at: new Date().toISOString() })
      .in('id', selectedStatementIds)
      .eq('status', 'pending')
    setSelectedStatementIds([])
    setSelectAllStatements(false)
    if (selectedAccountId) loadStatements(selectedAccountId)
    toast({ title: 'Conciliado', description: 'Linhas conciliadas' })
  }

  const bulkIgnoreSelected = async () => {
    if (!selectedStatementIds.length) return
    await supabase
      .from('bank_statements')
      .update({ status: 'ignored', updated_at: new Date().toISOString() })
      .in('id', selectedStatementIds)
      .eq('status', 'pending')
    setSelectedStatementIds([])
    setSelectAllStatements(false)
    if (selectedAccountId) loadStatements(selectedAccountId)
    toast({ title: 'Ignorado', description: 'Linhas marcadas como ignoradas' })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Tesouraria</h1>
          <p className="text-muted-foreground">Contas, extratos e conciliação</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className="text-lg font-semibold text-foreground">{formatPrice(balance)}</div>
          </div>
          <Button
            variant="outline"
            className="bg-transparent gap-2"
            onClick={async () => {
              try {
                const { data, error } = await supabase.rpc('fn_reconcile_statements_auto', { tolerance_days: 2 })
                if (error) throw error
                refreshAll()
              } catch (err) {
                console.error(err)
                toast({ title: 'Erro', description: 'Matching automático falhou', variant: 'destructive' })
              }
            }}
          >
            Rodar Matching
          </Button>
          <Button variant="outline" className="bg-transparent gap-2" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const active = selectedAccountId === a.id
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAccountId(a.id)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    {a.name}
                  </button>
                )
              })}
              <Button size="sm" variant="outline" className="bg-transparent gap-1" onClick={() => setShowAddAccount(true)}>
                <Plus className="h-4 w-4" />
                Adicionar Conta
              </Button>
            </div>

            {showAddAccount && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as 'bank' | 'cash' })}
                  >
                    <option value="bank">Banco</option>
                    <option value="cash">Caixa</option>
                  </select>
                </div>
                <div>
                  <Label>Saldo Inicial</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAccount.opening_balance}
                    onChange={(e) => setNewAccount({ ...newAccount, opening_balance: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="md:col-span-3">
                  <Button onClick={handleAddAccount}>Salvar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Linha de Extrato</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={newStatement.date}
                onChange={(e) => setNewStatement({ ...newStatement, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={newStatement.amount}
                onChange={(e) => setNewStatement({ ...newStatement, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={newStatement.description}
                onChange={(e) => setNewStatement({ ...newStatement, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <Button onClick={handleAddStatement}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <Label>Descrição</Label>
              <Input value={filterDesc} onChange={(e) => setFilterDesc(e.target.value)} />
            </div>
            <div>
              <Label>De</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => selectedAccountId && loadStatements(selectedAccountId)}>Aplicar</Button>
            </div>
          </div>
          {!!selectedStatementIds.length && (
            <div className="mb-3 flex items-center gap-2">
              <Button size="sm" variant="outline" className="bg-transparent" onClick={bulkReconcileSelected}>
                Conciliar Selecionados ({selectedStatementIds.length})
              </Button>
              <Button size="sm" variant="outline" className="bg-transparent" onClick={bulkIgnoreSelected}>
                Ignorar Selecionados ({selectedStatementIds.length})
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input type="checkbox" checked={selectAllStatements} onChange={toggleSelectAllStatements} />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedStatementIds.includes(s.id)}
                        onChange={() => toggleStatement(s.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>{s.description || '-'}</TableCell>
                    <TableCell className="text-right">{formatPrice(Number(s.amount || 0))}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'pending' ? 'outline' : s.status === 'reconciled' ? 'default' : 'secondary'}>
                        {s.status === 'pending' ? 'Pendente' : s.status === 'reconciled' ? 'Conciliado' : 'Ignorado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === 'pending' && (
                        <Button size="sm" variant="outline" className="bg-transparent gap-1" onClick={() => handleReconcile(s)}>
                          <CheckCircle2 className="h-4 w-4" />
                          Conciliar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliação Manual</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label>Valor</Label>
              <Input value={candidateAmount} onChange={(e) => setCandidateAmount(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Button
                onClick={async () => {
                  try {
                    const { data: acc } = await supabase.from('chart_of_accounts').select('id').eq('code', '1.1.1').limit(1).single()
                    const accId = acc?.id as string | undefined
                    if (!accId) return
                    const { data } = await supabase
                      .from('journal_entries')
                      .select('id,debit,credit,created_at')
                      .eq('account_id', accId)
                      .order('created_at', { ascending: false })
                      .limit(200)
                    const amt = Number(candidateAmount)
                    const list =
                      (data || [])
                        .map((e: any) => ({ id: e.id as string, value: Number(e.debit || 0) - Number(e.credit || 0), created_at: e.created_at }))
                        .filter((e: any) => Math.abs(e.value - amt) < 0.005)
                        .slice(0, 20)
                    setCandidates(list)
                  } catch {}
                }}
              >
                Buscar Lançamentos
              </Button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c['created_at'] ? new Date(c['created_at']).toLocaleString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-right">{formatPrice(c.value)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!selectedStatement) return
                          await supabase.from('reconciliations').insert({
                            bank_statement_id: selectedStatement.id,
                            journal_entry_id: c.id,
                          })
                          await supabase.from('bank_statements').update({ status: 'reconciled', updated_at: new Date().toISOString() }).eq('id', selectedStatement.id)
                          setReconcileOpen(false)
                          if (selectedAccountId) loadStatements(selectedAccountId)
                          toast({ title: 'Conciliado' })
                        }}
                      >
                        Conciliar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
