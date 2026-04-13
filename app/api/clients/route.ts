import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
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
      planPrice: c.fee,
      status: c.debt > 0 ? "pending_payment" : "active", // determinar status basado en deuda
      joinDate: c.joinDate.toISOString().split('T')[0],
      debts: c.debt > 0 ? [{
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
  try {
    const body = await request.json()

    const newClient = await prisma.client.create({
      data:{
        dni: Number(body.dni),
        nameComplete: body.name,
        joinDate: new Date(),
        fee: body.planPrice,
        mode: body.plan,
        paymentMethod: "efectivo",
        turn: "mañana"
      }
    })
        
    return NextResponse.json(newClient)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear el cliente' },
      { status: 500 }
    )
  }
}