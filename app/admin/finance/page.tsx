'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Calendar,
  Coins,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'

export default function FinancePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cogsMonthly, setCogsMonthly] = useState<number>(0)
  const [arOpenTotal, setArOpenTotal] = useState<number>(0)
  const [apOpenTotal, setApOpenTotal] = useState<number>(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    fetchCogs()
    fetchReceivables()
    fetchPayables()
  }, [])

  const fetchOrders = async () => {
    setIsLoading(true)
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
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        const msg = getErrorMessage(error)
        console.error('Error fetching orders:', msg)
        toast({ title: 'Erro', description: msg, variant: 'destructive' })
        return
      }
      setOrders((data || []) as Order[])
    } catch (err) {
      const msg = getErrorMessage(err)
      console.error('Error fetching orders:', msg)
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPayables = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bills')
        .select('total,status')
        .eq('status', 'open')
      if (error) {
        setApOpenTotal(0)
        return
      }
      const total = (data || []).reduce((sum: number, b: any) => sum + Number(b.total || 0), 0)
      setApOpenTotal(total > 0 ? +Number(total).toFixed(2) : 0)
    } catch {
      setApOpenTotal(0)
    }
  }

  const fetchReceivables = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('amount,status')
        .eq('status', 'open')
      if (error) {
        setArOpenTotal(0)
        return
      }
      const total = (data || []).reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0)
      setArOpenTotal(total > 0 ? +Number(total).toFixed(2) : 0)
    } catch {
      setArOpenTotal(0)
    }
  }

  const fetchCogs = async () => {
    try {
      const supabase = createClient()
      const { data: accounts, error: accErr } = await supabase
        .from('chart_of_accounts')
        .select('id,name,type')
        .eq('type', 'expense')
        .ilike('name', '%Custo das Vendas%')
      if (accErr) {
        setCogsMonthly(0)
        return
      }
      const ids = (accounts || []).map((a: any) => a.id)
      if (!ids.length) {
        setCogsMonthly(0)
        return
      }
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const { data: entries, error: entErr } = await supabase
        .from('journal_entries')
        .select('debit,credit,created_at,account_id')
        .in('account_id', ids)
        .gte('created_at', start.toISOString())
      if (entErr) {
        setCogsMonthly(0)
        return
      }
      const total = (entries || []).reduce((sum: number, e: any) => {
        const d = Number(e.debit || 0)
        const c = Number(e.credit || 0)
        return sum + (d - c)
      }, 0)
      setCogsMonthly(total > 0 ? +Number(total).toFixed(2) : 0)
    } catch {
      setCogsMonthly(0)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  // Calculate stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === today.getTime() && order.status !== 'cancelled'
  })

  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0)

  const completedOrders = orders.filter((order) => order.status === 'completed')
  const avgTicket =
    completedOrders.length > 0
      ? completedOrders.reduce((sum, order) => sum + order.total, 0) /
        completedOrders.length
      : 0

  // Monthly total
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const monthlyOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at)
    return orderDate >= thisMonth && order.status !== 'cancelled'
  })

  const monthlyTotal = monthlyOrders.reduce((sum, order) => sum + order.total, 0)

  const grossMargin = monthlyTotal - cogsMonthly
  const grossMarginPct = monthlyTotal > 0 ? Math.round((grossMargin / monthlyTotal) * 100) : 0

  const todayReceipts = orders
    .filter((order) => {
      const od = new Date(order.created_at)
      od.setHours(0, 0, 0, 0)
      return od.getTime() === today.getTime() && order.status === 'completed'
    })
    .reduce((sum, order) => sum + order.total, 0)

  // Weekly chart data
  const getWeeklyData = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const data = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at)
        orderDate.setHours(0, 0, 0, 0)
        return orderDate.getTime() === date.getTime() && order.status !== 'cancelled'
      })

      const total = dayOrders.reduce((sum, order) => sum + order.total, 0)

      data.push({
        day: days[date.getDay()],
        total: total,
        orders: dayOrders.length,
      })
    }

    return data
  }

  const weeklyData = getWeeklyData()

  // Colors for the chart - computed in JS, not CSS variables
  const primaryColor = '#5b21b6'  // Purple-800
  const accentColor = '#4ade80'   // Green-400

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
          Resumo Financeiro
        </h1>
        <p className="text-muted-foreground">
          Acompanhe as vendas e métricas do seu negócio
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  A Pagar (Aberto)
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(apOpenTotal)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contas em aberto
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Vendas Hoje
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(todaySales)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {todayOrders.length} pedido(s)
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ticket Médio
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(avgTicket)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Base: {completedOrders.length} pedidos
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total do Mês
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(monthlyTotal)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {monthlyOrders.length} pedido(s)
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  COGS do Mês
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(cogsMonthly)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Custo das Vendas
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Coins className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Margem Bruta
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(grossMargin)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {grossMarginPct}% do faturamento
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  A Receber (Aberto)
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatPrice(arOpenTotal)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Faturas em aberto
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), 'Total']}
                    labelStyle={{ color: '#1f2937' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === weeklyData.length - 1 ? accentColor : primaryColor} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Pedido #{order.order_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatPrice(order.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
