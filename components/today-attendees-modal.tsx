'use client'

import { Client } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { X, CheckCircle2, XCircle, CircleDot } from 'lucide-react'
import { AttendanceStatus } from '@/lib/types'

interface TodayAttendeesModalProps {
  clients: Client[]
  isOpen: boolean
  onClose: () => void
}

export function TodayAttendeesModal({ clients, isOpen, onClose }: TodayAttendeesModalProps) {
  if (!isOpen) return null

  const todayAttendees = clients.filter((client) => client.todayAttendance !== 'NONE')

  const getAttendanceIcon = (status: AttendanceStatus) => {
    if (status === 'PRESENT') {
      return <CheckCircle2 className="h-5 w-5 text-[#26DE81]" />
    }
    if (status === 'ABSENT') {
      return <XCircle className="h-5 w-5 text-[#FF6B6B]" />
    }
    return <CircleDot className="h-5 w-5 text-muted-foreground" />
  }

  const getStatusBadge = (status: AttendanceStatus) => {
    if (status === 'PRESENT') {
      return <Badge className="bg-[#26DE81]/15 text-[#26DE81] border-0 font-medium">Presente</Badge>
    }
    if (status === 'ABSENT') {
      return <Badge className="bg-[#FF6B6B]/15 text-[#FF6B6B] border-0 font-medium">Ausente</Badge>
    }
    return <Badge className="bg-secondary text-muted-foreground border-0 font-medium">Sin registro</Badge>
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Asistencias de Hoy</CardTitle>
            <CardDescription className="text-muted-foreground">
              {todayAttendees.length} cliente{todayAttendees.length !== 1 ? 's' : ''} con registro hoy
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {todayAttendees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay registros de asistencia para hoy
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-secondary/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Cliente</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">DNI</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Plan</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Vence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAttendees.map((client, index) => (
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
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {client.dni}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border/50 text-foreground font-normal rounded-lg">
                          {client.plan || 'Sin plan'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAttendanceIcon(client.todayAttendance)}
                          {getStatusBadge(client.todayAttendance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.expiresAt || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
