import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { NotificationBell } from './NotificationBell'
import { getNotifications, getUnreadCount } from '@/actions/notifications'

interface Props {
  children: React.ReactNode
}

export async function AppShell({ children }: Props) {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(),
    getUnreadCount(),
  ])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-end px-4 h-14 border-b bg-background/95 backdrop-blur">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </header>
        {/* Page content */}
        <main className="flex-1 p-4 pb-20 sm:pb-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
