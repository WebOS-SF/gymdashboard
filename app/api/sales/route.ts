import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPersistedUserId, notifySuperadmins } from "@/lib/notifications";
import { NextResponse } from "next/server";

const WALK_IN_CLIENT_DNI = 0

export async function GET(){
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {
        const sales = await prisma.salesRecord.findMany({
            include:{
                client:true,
                soldBy: {
                  select: {
                    id: true,
                    username: true,
                    role: true,
                  },
                },
            },
            orderBy:{
                saleDate:'desc'
            }   
        })
    
        return NextResponse.json(sales)
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener las ventas" }, { status: 500 })
    }
}

export async function POST(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json();
    const persistedUserId = await getPersistedUserId(user)

    const productId = Number(body.productId)
    const isWalkInClient = body.isWalkInClient === true
    const clientDni = isWalkInClient ? WALK_IN_CLIENT_DNI : Number(body.clientDni)
    const quantity = Number(body.quantity ?? 1)

    if (!Number.isFinite(productId) || !Number.isFinite(clientDni) || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        return { error: "Product not found" as const }
      }

      if (product.stock < quantity) {
        return { error: "Not enough stock" as const }
      }

      if (isWalkInClient) {
        await tx.client.upsert({
          where: { dni: WALK_IN_CLIENT_DNI },
          update: {},
          create: {
            dni: WALK_IN_CLIENT_DNI,
            nameComplete: "Cliente espontáneo",
            joinDate: new Date(),
            fee: 0,
            mode: "Espontáneo",
            paymentMethod: "Efectivo",
            turn: "Sin turno",
            status: "inactive",
          },
        })
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: product.stock - quantity },
      })

      const sale = await tx.salesRecord.create({
        data: {
          product: product.name,
          amount: product.price * quantity,
          saleDate: new Date(),
          clientDni,
          soldById: persistedUserId,
        },
      })

      return { sale, product: updatedProduct, quantity }
    })

    if ("error" in result) {
      const status = result.error === "Product not found" ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    if (user.role === "admin") {
      await notifySuperadmins({
        actorId: user.id,
        type: "sale_created",
        title: "Nueva venta registrada",
        message: `${user.username} vendió ${result.quantity} x ${result.sale.product} por S/ ${result.sale.amount.toLocaleString("es-PE")}.`,
        entityType: "sale",
        entityId: result.sale.id,
      })
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating sale" },
      { status: 500 }
    );
  }
}
