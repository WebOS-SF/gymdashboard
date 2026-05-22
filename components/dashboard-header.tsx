'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dumbbell, LogOut, Sun, Moon, Bell } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { AppNotification, AuthUser } from '@/lib/types'

interface DashboardHeaderProps {
  user: AuthUser
  onLogout: () => void
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  const { theme, toggleTheme, mounted } = useTheme()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (!res.ok) return

    const data = await res.json()
    setNotifications(data.notifications || [])
    setUnreadCount(data.unreadCount || 0)
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = window.setInterval(fetchNotifications, 15000)

    return () => window.clearInterval(interval)
  }, [fetchNotifications])

  const markNotificationsRead = async (id?: number) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeof id === 'number' ? { id } : {}),
    })

    if (typeof id === 'number') {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
            : notification,
        ),
      )
      setUnreadCount(prev => Math.max(prev - 1, 0))
      return
    }

    const readAt = new Date().toISOString()
    setNotifications(prev => prev.map(notification => ({ ...notification, readAt: notification.readAt || readAt })))
    setUnreadCount(0)
  }

  const formatNotificationDate = (value: string) =>
    new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))

  return (
    <header className="bg-card px-6 py-4 rounded-2xl mx-4 mt-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">JPFitness Gym</h1>
            <p className="text-xs text-muted-foreground">
              {user.username} · {user.role === 'superadmin' ? 'Superadmin' : 'Admin'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {mounted && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Cambiar tema</span>
            </Button>
          )}
          <Button 
            onClick={onLogout}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
