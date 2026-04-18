'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit2, Users, Filter } from 'lucide-react'
import { Client, Product } from '@/lib/types'
import { ClientModal } from './client-modal'

interface ClientsListProps {
  clients: Client[]
  products: Product[]
  canViewMoney: boolean
  onUpdateClient: (client: Client) => void
  onAddClient: (client: Client) => void
}

export function ClientsList({ clients, products, canViewMoney, onUpdateClient, onAddClient }: ClientsListProps) {
  const [searchDni, setSearchDni] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const filteredClients = clients.filter((client) => {
  const dni = String(client.dni || "")
  const name = client.name?.toLowerCase() || ""

  const search = searchDni.toLowerCase()

  return (
    dni.includes(search) ||
    name.includes(search)
  )
})

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingClient(null)
    setIsModalOpen(true)
  }

  const handleSave = async (client: Client) => {
    try {
      const res = await fetch(editingClient ? `/api/clients/${client.dni}` : "/api/clients", {
        method: editingClient ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(client),
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || "Error guardando cliente")
      }

      if (editingClient) {
        onUpdateClient(payload)
      } else {
        onAddClient(payload)
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error("Error guardando cliente:", error)
    }
  }

  const getStatusBadge = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-[#26DE81]/15 text-[#26DE81] border-0 font-medium">Activo</Badge>
      case 'inactive':
        return <Badge className="bg-secondary text-muted-foreground border-0 font-medium">Inactivo</Badge>
      case 'pending_payment':
        return <Badge className="bg-[#FF6B6B]/15 text-[#FF6B6B] border-0 font-medium">Pago Pendiente</Badge>
    }
  }

  const getTotalDebt = (client: Client) => {
    return (client.debts || []).reduce((acc, d) => acc + d.amount, 0)
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
                  placeholder="Buscar por DNI..."
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
                Agregar
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

                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Plan</TableHead>
                  {canViewMoney && (
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Cuota</TableHead>
                  )}
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Pago</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Turno</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Estado</TableHead>
                  {canViewMoney && (
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Deuda</TableHead>
                  )}
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
                        <span className="font-medium text-foreground">{client.name || 'Sin nombre'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{client.dni}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="border-border/50 text-foreground font-normal rounded-lg">
                        {client.plan}
                      </Badge>
                    </TableCell>
                    {canViewMoney && (
                      <TableCell className="hidden xl:table-cell text-foreground font-medium">
                        ${client.planPrice.toLocaleString()}
                      </TableCell>
                    )}
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {client.paymentMethod}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {client.turn}
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    {canViewMoney && (
                      <TableCell className="hidden sm:table-cell">
                        {getTotalDebt(client) > 0 ? (
                          <span className="text-[#FF6B6B] font-semibold">
                            ${getTotalDebt(client).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
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
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {searchDni ? 'No se encontraron clientes con ese DNI' : 'No hay clientes registrados'}
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
        products={products}
        canViewMoney={canViewMoney}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
