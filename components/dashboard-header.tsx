'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dumbbell, LogOut, Sun, Moon, Search, Bell } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'

interface DashboardHeaderProps {
  onLogout: () => void
}

export function DashboardHeader({ onLogout }: DashboardHeaderProps) {
  const { theme, toggleTheme, mounted } = useTheme()

  return (
    <header className="bg-card px-6 py-4 rounded-2xl mx-4 mt-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">GymPro</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-11 h-11 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
            />
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
            variant="ghost" 
            size="icon"
            className="w-10 h-10 rounded-xl bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <Bell className="h-5 w-5" />
          </Button>
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
