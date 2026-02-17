'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  ClipboardList,
  Package,
  BarChart3,
  Settings,
  Menu,
  Home,
  LogOut,
  IceCream,
  Tag,
} from 'lucide-react'

const navigation = [
  { name: 'Pedidos', href: '/admin', icon: ClipboardList },
  { name: 'Produtos', href: '/admin/products', icon: IceCream },
  { name: 'Estoque', href: '/admin/stock', icon: Package },
  { name: 'Financeiro', href: '/admin/finance', icon: BarChart3 },
  { name: 'Cupons', href: '/admin/coupons', icon: Tag },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-bold text-sidebar-primary-foreground">A</span>
        </div>
        <div>
          <p className="font-semibold text-sidebar-foreground">Açaí da Serra</p>
          <p className="text-xs text-sidebar-foreground/60">Painel Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Home className="h-5 w-5" />
          Voltar à Loja
        </Link>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {!isLoginPage && (
        <aside className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:w-64 lg:border-r lg:border-border lg:z-40">
          <SidebarContent />
        </aside>
      )}

      <div className={cn('flex flex-1 flex-col min-w-0', !isLoginPage && 'lg:ml-64')}>
        {!isLoginPage && (
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">A</span>
              </div>
              <span className="font-semibold text-foreground">Admin</span>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
