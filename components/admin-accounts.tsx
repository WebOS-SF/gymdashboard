'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ButtonSpinner } from '@/components/ui/button-spinner'
import { AdminAccount } from '@/lib/types'
import { Check, KeyRound, Trash2, UserPlus, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface AdminAccountsProps {
  currentUserId: number
}

export function AdminAccounts({ currentUserId }: AdminAccountsProps) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [editingPasswordId, setEditingPasswordId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [savingPasswordId, setSavingPasswordId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const fetchAccounts = async () => {
    const res = await fetch('/api/admins')
    if (!res.ok) return
    const data = await res.json()
    setAccounts(data)
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleCreate = async () => {
    if (isCreating) return

    setIsCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        const message = data?.error || 'No se pudo crear la cuenta'
        setError(message)
        throw new Error(message)
      }

      setAccounts((prev) => [data, ...prev])
      setUsername('')
      setPassword('')
      setShowPassword(false)
      toast.success('Admin creado', {
        description: 'La cuenta nueva ya está disponible.',
      })
    } catch (error) {
      toast.error('No se pudo crear la cuenta', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleChangePassword = async (id: number) => {
    if (savingPasswordId === id) return

    setSavingPasswordId(id)
    setError('')
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        const message = data?.error || 'No se pudo cambiar la contraseña'
        setError(message)
        throw new Error(message)
      }

      setAccounts((prev) => prev.map((account) => (account.id === id ? data : account)))
      setEditingPasswordId(null)
      setNewPassword('')
      setShowNewPassword(false)
      toast.success('Contraseña actualizada', {
        description: 'La nueva contraseña quedó guardada.',
      })
    } catch (error) {
      toast.error('No se pudo cambiar la contraseña', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setSavingPasswordId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (deletingId === id) return

    setDeletingId(id)
    setError('')
    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const message = data?.error || 'No se pudo eliminar la cuenta'
        setError(message)
        throw new Error(message)
      }

      setAccounts((prev) => prev.filter((account) => account.id !== id))
      toast.success('Admin eliminado', {
        description: 'La cuenta fue eliminada correctamente.',
      })
    } catch (error) {
      toast.error('No se pudo eliminar la cuenta', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-card">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-foreground">Cuentas Admin</CardTitle>
            <CardDescription className="text-muted-foreground">
              Crea admins, cambia contraseñas y elimina accesos.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[240px_240px_auto]">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="h-10 rounded-xl bg-secondary/50 border-0"
            />
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                type={showPassword ? "text" : "password"}
                className="h-10 rounded-xl bg-secondary/50 border-0 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={handleCreate} disabled={!username || !password || isCreating} className="h-10 rounded-xl">
              {isCreating ? <ButtonSpinner /> : <UserPlus className="h-4 w-4 mr-2" />}
              Crear Admin
            </Button>
          </div>
        </div>
        {error && (
          <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl bg-secondary/30">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Usuario</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Rol</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Contraseña</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account, index) => (
                <TableRow
                  key={account.id}
                  className={`border-0 hover:bg-secondary/50 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-transparent'}`}
                >
                  <TableCell className="font-medium text-foreground">{account.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border/50 rounded-lg">
                      {account.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingPasswordId === account.id ? (
                      <div className="relative max-w-56">
                        <Input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Nueva contraseña"
                          className="h-9 w-full rounded-lg bg-secondary/50 border-0 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Oculta</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingPasswordId === account.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleChangePassword(account.id)}
                          disabled={!newPassword || savingPasswordId === account.id}
                          className="h-8 w-8 rounded-lg text-[#26DE81] hover:text-[#26DE81] hover:bg-[#26DE81]/10"
                        >
                          {savingPasswordId === account.id ? <ButtonSpinner /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPasswordId(null)
                            setNewPassword('')
                            setShowNewPassword(false)
                          }}
                          disabled={savingPasswordId === account.id}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPasswordId(account.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(account.id)}
                          disabled={account.id === currentUserId || account.role === 'superadmin' || deletingId === account.id}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 disabled:opacity-40"
                        >
                          {deletingId === account.id ? <ButtonSpinner /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No hay cuentas registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
