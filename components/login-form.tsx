'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'

interface LoginFormProps {
  onLogin: () => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 800))

    // Credenciales predefinidas
    if (email === 'user123' && password === 'user123') {
      onLogin()
    } else {
      setError('Credenciales incorrectas. Usa user123 / user123')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-card rounded-3xl overflow-hidden">
        <CardHeader className="text-center space-y-4 pt-10 pb-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">GymPro</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Ingresa tus credenciales para acceder
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" className="text-sm font-medium text-foreground">Usuario</FieldLabel>
                <Input
                  id="email"
                  type="text"
                  placeholder="user123"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="user123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground pr-12 focus-visible:ring-primary/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </Field>
            </FieldGroup>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25 font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Credenciales de prueba: <span className="font-medium">user123</span> / <span className="font-medium">user123</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
