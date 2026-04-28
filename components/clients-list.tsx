'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit2, Users, Filter, CheckCircle2, XCircle, CircleDot, CalendarDays } from 'lucide-react'
import { Client, AttendanceStatus } from '@/lib/types'
import { ClientModal } from './client-modal'
import { AttendanceCalendarModal } from './attendance-calendar-modal'
import { toast } from 'sonner'

interface ClientsListProps {
  clients: Client[]
  onUpdateClient: (client: Client) => void
  onAddClient: (client: Client) => void
  onAttendanceChange: (dni: string, status: AttendanceStatus) => void
}

export function ClientsList({ clients, onUpdateClient, onAddClient, onAttendanceChange }: ClientsListProps) {
  const [searchDni, setSearchDni] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [calendarClient, setCalendarClient] = useState<Client | null>(null)

  const filteredClients = clients.filter((client) => {
    const dni = String(client.dni || '')
    const name = client.name?.toLowerCase() || ''
    const search = searchDni.toLowerCase()

    return dni.includes(search) || name.includes(search)
  })

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingClient(null)
    setIsModalOpen(true)
  }

  const handleSave = async (client: Record<string, unknown>) => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const dni = String(client.dni || '')
      const res = await fetch(editingClient ? `/api/clients/${dni}` : '/api/clients', {
        method: editingClient ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(client),
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || 'Error guardando cliente')
      }

      if (editingClient) {
        onUpdateClient(payload)
      } else {
        const alreadyExists = clients.some((existing) => existing.dni === payload.dni)
        if (alreadyExists) {
          onUpdateClient(payload)
        } else {
          onAddClient(payload)
        }
      }

      setIsModalOpen(false)
      toast.success(editingClient ? 'Cliente actualizado' : 'Cliente registrado', {
        description: editingClient
          ? 'Los datos del cliente quedaron guardados.'
          : 'El nuevo cliente ya aparece en el dashboard.',
      })
    } catch (error) {
      console.error('Error guardando cliente:', error)
      toast.error('No se pudo guardar el cliente', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAttendance = async (client: Client) => {
    const nextStatus: AttendanceStatus =
      client.todayAttendance === 'NONE' ? 'PRESENT' :
      client.todayAttendance === 'PRESENT' ? 'ABSENT' : 'PRESENT'

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientDni: Number(client.dni), status: nextStatus }),
      })
      if (!res.ok) throw new Error('Error')
      onAttendanceChange(client.dni, nextStatus)
      toast.success('Asistencia registrada', {
        description: nextStatus === 'PRESENT' 
          ? `${client.name} vino hoy` 
          : `${client.name} marcado como ausente`,
      })
    } catch (error) {
      console.error('Error registrando asistencia:', error)
      toast.error('No se pudo registrar la asistencia', {
        description: 'Inténtalo nuevamente.',
      })
    }
  }

  const getAttendanceIcon = (status: AttendanceStatus) => {
    if (status === 'PRESENT') {
      return <CheckCircle2 className="h-5 w-5 text-[#26DE81]" />
    }
    if (status === 'ABSENT') {
      return <XCircle className="h-5 w-5 text-[#FF6B6B]" />
    }
    return <CircleDot className="h-5 w-5 text-muted-foreground" />
  }

  const getStatusBadge = (client: Client) => {
    if (client.status === 'active') {
      return <Badge className="bg-[#26DE81]/15 text-[#26DE81] border-0 font-medium">Activo</Badge>
    }
    if (client.status === 'inactive') {
      return <Badge className="bg-secondary text-muted-foreground border-0 font-medium">Inactivo</Badge>
    }
    if (client.status === 'pending_moderate') {
      return <Badge className="bg-amber-500/15 text-amber-600 border-0 font-medium">Pendiente Moderado</Badge>
    }
    return <Badge className="bg-[#FF6B6B]/15 text-[#FF6B6B] border-0 font-medium">Pendiente Crítico</Badge>
  }

  return (
    <>
      <Card className="rounded-2xl border-0 shadow-sm bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B8DEF] to-[#4a7de0] flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">Clientes</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {filteredClients.length} de {clients.length} registrados
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por DNI o nombre..."
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-0 bg-secondary/50"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleAdd}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl bg-secondary/30">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">DNI</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Cliente Desde</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider text-center">Hoy</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, index) => (
                  <TableRow
                    key={client.id}
                    className={`border-0 hover:bg-secondary/50 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-transparent'}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9B6DD7] to-[#8a5cc6] flex items-center justify-center text-white text-sm font-medium">
                          {(client.name || 'N N').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground block">{client.name || 'Sin nombre'}</span>
                          <span className="text-xs text-muted-foreground">Cliente desde {client.memberSince || client.joinDate}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{client.dni}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{client.phone || '-'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">{client.memberSince || client.joinDate}</TableCell>
                    <TableCell>{getStatusBadge(client)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAttendance(client)}
                        className="h-8 w-8 rounded-lg hover:bg-secondary"
                        title={
                          client.todayAttendance === 'PRESENT' ? 'Presente' :
                          client.todayAttendance === 'ABSENT' ? 'Ausente' : 'Sin registro'
                        }
                      >
                        {getAttendanceIcon(client.todayAttendance)}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarClient(client)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        title="Ver calendario"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {searchDni ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ClientModal
        client={editingClient}
        isOpen={isModalOpen}
        isSaving={isSaving}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />

      <AttendanceCalendarModal
        clientDni={calendarClient?.dni || ''}
        clientName={calendarClient?.name || ''}
        isOpen={Boolean(calendarClient)}
        onClose={() => setCalendarClient(null)}
      />
    </>
  )
}
