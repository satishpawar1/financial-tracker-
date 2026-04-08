'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/settings', icon: MoreHorizontal, label: 'More' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t sm:hidden">
      <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 flex-1 py-2 rounded-lg transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
