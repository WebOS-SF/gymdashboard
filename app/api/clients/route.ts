import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { formatClient, normalizeClientStatus, normalizePaymentMethod, normalizeTurn, planPrices } from "@/lib/client-utils"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        joinDate: "desc",
      },
      include: {
        sales: true,
        boletas: true,
        appointments: true
      }
    });

    const formattedClients = clients.map(formatClient);

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
    const planPrice = Number(body.planPrice ?? planPrices[plan] ?? 0)
    const debt = Number(body.debt ?? 0)

    const newClient = await prisma.client.create({
      data:{
        dni: Number(body.dni),
        nameComplete: body.name,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        fee: Number.isFinite(planPrice) ? planPrice : 0,
        mode: plan,
        paymentMethod: normalizePaymentMethod(body.paymentMethod),
        turn: normalizeTurn(body.turn),
        debt: Number.isFinite(debt) ? debt : 0,
        status: normalizeClientStatus(body.status),
      }
    })

    return NextResponse.json(formatClient(newClient))
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear el cliente' },
      { status: 500 }
    )
  }
}
