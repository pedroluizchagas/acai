 'use client'
 
 import { useEffect, useState } from 'react'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Label } from '@/components/ui/label'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Switch } from '@/components/ui/switch'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
 import { createClient } from '@/lib/supabase/client'
 import type { Coupon } from '@/lib/types'
 import { useToast } from '@/hooks/use-toast'
 import { RefreshCw, Plus, Trash2 } from 'lucide-react'
 
 interface CouponForm {
   code: string
   type: 'fixed' | 'percent' | 'free_shipping'
   value: string
   min_order_value: string
   max_redemptions: string
   first_time_only: boolean
   starts_at: string
   ends_at: string
   active: boolean
 }
 
 const initialForm: CouponForm = {
   code: '',
   type: 'percent',
   value: '10',
   min_order_value: '0',
   max_redemptions: '',
   first_time_only: false,
   starts_at: '',
   ends_at: '',
   active: true,
 }
 
 export default function CouponsPage() {
   const [coupons, setCoupons] = useState<Coupon[]>([])
   const [isLoading, setIsLoading] = useState(false)
   const [isAddOpen, setIsAddOpen] = useState(false)
   const [form, setForm] = useState<CouponForm>(initialForm)
   const { toast } = useToast()
   const supabase = createClient()
 
   const fetchCoupons = async () => {
     setIsLoading(true)
     try {
       const { data, error } = await supabase
         .from('coupons')
         .select('*')
         .order('created_at', { ascending: false })
       if (error) throw error
       setCoupons((data || []) as Coupon[])
     } catch (e) {
       toast({ title: 'Erro', description: 'Falha ao carregar cupons', variant: 'destructive' })
     } finally {
       setIsLoading(false)
     }
   }
 
   useEffect(() => {
     fetchCoupons()
   }, [])
 
   const handleSave = async () => {
     try {
       const payload = {
         code: form.code.trim().toUpperCase(),
         type: form.type,
         value: form.type === 'free_shipping' ? null : Number(form.value || 0),
         min_order_value: Number(form.min_order_value || 0),
         max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
         first_time_only: form.first_time_only,
         starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
         ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
         active: form.active,
       }
       const { error } = await supabase.from('coupons').insert(payload)
       if (error) throw error
       toast({ title: 'Sucesso', description: 'Cupom criado' })
       setIsAddOpen(false)
       setForm(initialForm)
       fetchCoupons()
     } catch (e) {
       toast({ title: 'Erro', description: 'Não foi possível criar o cupom', variant: 'destructive' })
     }
   }
 
   const toggleActive = async (coupon: Coupon) => {
     try {
       const { error } = await supabase
         .from('coupons')
         .update({ active: !coupon.active, updated_at: new Date().toISOString() })
         .eq('id', coupon.id)
       if (error) throw error
       fetchCoupons()
     } catch {
       toast({ title: 'Erro', description: 'Falha ao atualizar status', variant: 'destructive' })
     }
   }
 
   const deleteCoupon = async (coupon: Coupon) => {
     try {
       const { error } = await supabase.from('coupons').delete().eq('id', coupon.id)
       if (error) throw error
       fetchCoupons()
     } catch {
       toast({ title: 'Erro', description: 'Falha ao excluir cupom', variant: 'destructive' })
     }
   }
 
   return (
     <div className="p-4 md:p-6 lg:p-8">
       <div className="mb-6 flex items-center justify-between">
         <h1 className="text-2xl font-bold text-foreground md:text-3xl">Cupons</h1>
         <div className="flex gap-2">
           <Button variant="outline" className="bg-transparent" onClick={fetchCoupons} disabled={isLoading}>
             <RefreshCw className="mr-2 h-4 w-4" />
             Atualizar
           </Button>
           <Button onClick={() => setIsAddOpen(true)} className="gap-2">
             <Plus className="h-4 w-4" />
             Novo Cupom
           </Button>
         </div>
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle>Lista de Cupons</CardTitle>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Código</TableHead>
                 <TableHead>Tipo</TableHead>
                 <TableHead>Valor</TableHead>
                 <TableHead>Min. Pedido</TableHead>
                 <TableHead>Primeira Compra</TableHead>
                 <TableHead>Ativo</TableHead>
                 <TableHead className="text-right">Ações</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {coupons.map((c) => (
                 <TableRow key={c.id}>
                   <TableCell className="font-medium">{c.code}</TableCell>
                   <TableCell>{c.type}</TableCell>
                   <TableCell>
                     {c.type === 'free_shipping' ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.value || 0))}
                   </TableCell>
                   <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.min_order_value || 0))}</TableCell>
                   <TableCell>{c.first_time_only ? 'Sim' : 'Não'}</TableCell>
                   <TableCell>
                     <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                   </TableCell>
                   <TableCell className="text-right">
                     <Button variant="destructive" size="sm" onClick={() => deleteCoupon(c)}>
                       <Trash2 className="mr-2 h-4 w-4" />
                       Excluir
                     </Button>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Novo Cupom</DialogTitle>
           </DialogHeader>
           <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-2">
               <Label>Código</Label>
               <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ex: PRIMEIRA10" />
             </div>
             <div className="space-y-2">
               <Label>Tipo</Label>
               <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CouponForm['type'] })}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="fixed">Valor Fixo</SelectItem>
                   <SelectItem value="percent">Porcentagem</SelectItem>
                   <SelectItem value="free_shipping">Frete Grátis</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             {form.type !== 'free_shipping' && (
               <div className="space-y-2">
                 <Label>Valor</Label>
                 <Input type="number" step="0.50" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Ex: 5 ou 10" />
               </div>
             )}
             <div className="space-y-2">
               <Label>Pedido Mínimo (R$)</Label>
               <Input type="number" step="0.50" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} />
             </div>
             <div className="space-y-2">
               <Label>Máx. Uso</Label>
               <Input type="number" value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} placeholder="Opcional" />
             </div>
             <div className="space-y-2">
               <Label>Início</Label>
               <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
             </div>
             <div className="space-y-2">
               <Label>Fim</Label>
               <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
             </div>
             <div className="flex items-center justify-between">
               <div className="space-y-0.5">
                 <Label>Primeira Compra</Label>
               </div>
               <Switch checked={form.first_time_only} onCheckedChange={(checked) => setForm({ ...form, first_time_only: checked })} />
             </div>
             <div className="flex items-center justify-between">
               <div className="space-y-0.5">
                 <Label>Ativo</Label>
               </div>
               <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
             </div>
           </div>
           <div className="flex justify-end gap-2">
             <Button variant="outline" className="bg-transparent" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
             <Button onClick={handleSave}>Salvar</Button>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   )
 }
