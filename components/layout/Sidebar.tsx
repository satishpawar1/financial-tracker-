'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  RefreshCw,
  PiggyBank,
  BarChart3,
  Upload,
  Download,
  Tags,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/income', icon: TrendingUp, label: 'Income' },
  { href: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { href: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/import', icon: Upload, label: 'Import' },
  { href: '/rules', icon: Tags, label: 'Category Rules' },
  { href: '/export', icon: Download, label: 'Export' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden sm:flex flex-col w-56 border-r bg-background h-screen sticky top-0 shrink-0">
      <div className="p-4 border-b">
        <h1 className="font-semibold text-lg">Finances</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
