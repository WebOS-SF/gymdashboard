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
          <Popover onOpenChange={(open) => open && fetchNotifications()}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative w-10 h-10 rounded-xl bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#FF6B6B] ring-2 ring-card" />
                )}
                <span className="sr-only">Ver notificaciones</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border-0 bg-card p-0 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">Notificaciones</p>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markNotificationsRead()}
                    className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Marcar leídas
                  </Button>
                )}
              </div>
              <Separator />
              <ScrollArea className="max-h-96">
                <div className="p-2">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => !notification.readAt && markNotificationsRead(notification.id)}
                        className="w-full rounded-lg p-3 text-left transition-colors hover:bg-secondary/60"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              notification.readAt ? 'bg-transparent' : 'bg-[#FF6B6B]'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{notification.message}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No hay notificaciones
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
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
