 'use client'
 
 import { useState } from 'react'
 import { useRouter, useSearchParams } from 'next/navigation'
 import Link from 'next/link'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Label } from '@/components/ui/label'
 import { Input } from '@/components/ui/input'
 import { Button } from '@/components/ui/button'
 import { createClient } from '@/lib/supabase/client'
 import { useToast } from '@/hooks/use-toast'
 import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
 
 export default function AdminLoginPage() {
   const router = useRouter()
   const params = useSearchParams()
   const supabase = createClient()
   const { toast } = useToast()
   const [email, setEmail] = useState('')
   const [password, setPassword] = useState('')
   const [showPassword, setShowPassword] = useState(false)
   const [loading, setLoading] = useState(false)
 
   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault()
     if (loading) return
     setLoading(true)
     try {
       const { error } = await supabase.auth.signInWithPassword({
         email: email.trim(),
         password,
       })
       if (error) {
         toast({
           title: 'Falha no login',
           description: 'Verifique suas credenciais e tente novamente.',
           variant: 'destructive',
         })
         return
       }
       const next = params.get('redirectTo') || '/admin'
       router.replace(next)
     } finally {
       setLoading(false)
     }
   }
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
       <div className="absolute left-4 top-4">
         <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
           <ArrowLeft className="h-4 w-4" />
           Voltar à Loja
         </Link>
       </div>
       <Card className="w-full max-w-sm shadow-lg">
         <CardHeader>
           <CardTitle>Entrar no Admin</CardTitle>
           <CardDescription>Acesse o painel com seu e-mail e senha</CardDescription>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleLogin} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="email">E-mail</Label>
               <Input
                 id="email"
                 type="email"
                 placeholder="seu@email.com"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
                 autoFocus
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="password">Senha</Label>
               <div className="relative">
                 <Input
                   id="password"
                   type={showPassword ? 'text' : 'password'}
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                 />
                 <button
                   type="button"
                   aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                   className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                   onClick={() => setShowPassword((v) => !v)}
                 >
                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
               </div>
             </div>
             <div className="flex items-center justify-between">
               <Link
                 href="#"
                 className="text-sm text-muted-foreground hover:text-primary"
                 onClick={async (e) => {
                   e.preventDefault()
                   if (!email.trim()) {
                     toast({
                       title: 'Informe seu e-mail',
                       description: 'Digite seu e-mail para enviar o link de redefinição.',
                     })
                     return
                   }
                   const origin = typeof window !== 'undefined' ? window.location.origin : ''
                   const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                     redirectTo: `${origin}/admin`,
                   })
                   if (error) {
                     toast({ title: 'Falha ao enviar e-mail', description: 'Tente novamente mais tarde.', variant: 'destructive' })
                   } else {
                     toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada para redefinir a senha.' })
                   }
                 }}
               >
                 Esqueci a senha
               </Link>
             </div>
             <Button
               type="submit"
               className="w-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-primary-foreground"
               disabled={loading || !email.trim() || password.length < 6}
             >
               {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</span> : 'Entrar'}
             </Button>
           </form>
         </CardContent>
       </Card>
     </div>
   )
 }
