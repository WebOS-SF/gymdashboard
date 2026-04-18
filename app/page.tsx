'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { LoginForm } from '@/components/login-form'
import { Dashboard } from '@/components/dashboard'
import { AuthUser } from '@/lib/types'

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Cargando sesión...
      </div>
    )
  }

  if (!user) {
    return <LoginForm onLogin={setUser} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}
