'use client'

import { useState, useTransition } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { Notification } from '@/types/database.types'
import { markNotificationRead, markAllRead } from '@/actions/notifications'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'

interface Props {
  notifications: Notification[]
  unreadCount: number
}

export function NotificationBell({ notifications, unreadCount }: Props) {
  const [, startTransition] = useTransition()

  function handleMarkRead(id: string) {
    startTransition(() => {
      markNotificationRead(id)
    })
  }

  function handleMarkAllRead() {
    startTransition(() => {
      markAllRead()
    })
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Notifications</SheetTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notifications yet
            </p>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={cn(
                  'p-3 rounded-lg border text-sm cursor-pointer transition-colors',
                  !n.is_read ? 'bg-primary/5 border-primary/20' : 'border-border'
                )}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(n.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
