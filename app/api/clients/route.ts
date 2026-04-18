import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { NextResponse } from "next/server"

const planPrices: Record<string, number> = {
  "Básico": 15000,
  Premium: 25000,
  VIP: 35000,
}

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const clients = await prisma.client.findMany({
      include: {
        sales: true,
        boletas: true,
        appointments: true
      }
    });

    const formattedClients = clients.map(c => ({
      id: c.dni.toString(),
      dni: c.dni.toString(),
      name: c.nameComplete,
      phone: "", // no lo tenés todavía
      plan: c.mode,
      planPrice: user.role === "superadmin" ? c.fee : 0,
      status: c.debt > 0 ? "pending_payment" : "active",
      joinDate: c.joinDate.toISOString().split('T')[0],
      debts: user.role === "superadmin" && c.debt > 0 ? [{
        id: `debt-${c.dni}`,
        productId: 'general',
        productName: 'Deuda General',
        amount: c.debt,
        date: c.joinDate.toISOString().split('T')[0]
      }] : []
    }));

    return NextResponse.json(formattedClients);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener los clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request){
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const plan = String(body.plan || "Básico")

    const newClient = await prisma.client.create({
      data:{
        dni: Number(body.dni),
        nameComplete: body.name,
        joinDate: new Date(),
        fee: user.role === "superadmin" ? Number(body.planPrice || planPrices[plan] || 0) : planPrices[plan] || 0,
        mode: plan,
        paymentMethod: "efectivo",
        turn: "mañana"
      }
    })

    return NextResponse.json({
      id: newClient.dni.toString(),
      dni: newClient.dni.toString(),
      name: newClient.nameComplete,
      phone: "",
      plan: newClient.mode,
      planPrice: user.role === "superadmin" ? newClient.fee : 0,
      status: "active",
      joinDate: newClient.joinDate.toISOString().split("T")[0],
      debts: [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear el cliente' },
      { status: 500 }
    )
  }
}
