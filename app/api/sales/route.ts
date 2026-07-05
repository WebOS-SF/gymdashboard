import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPersistedUserId } from "@/lib/auth"
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

    const isWalkInClient = body.isWalkInClient === true
    const clientDni = isWalkInClient ? WALK_IN_CLIENT_DNI : Number(body.clientDni)
    
    // Support both single item (legacy) and multiple items
    const items = body.items && Array.isArray(body.items) 
      ? body.items 
      : [{ productId: body.productId, quantity: body.quantity }]

    if (items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    if (!isWalkInClient && isNaN(clientDni)) {
      return NextResponse.json({ error: "Invalid client DNI" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. If walk-in, ensure the client exists
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

      const processedItems = []

      // 2. Process each item
      for (const item of items) {
        const productId = Number(item.productId)
        const quantity = Number(item.quantity ?? 1)

        if (isNaN(productId) || isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid item: ${JSON.stringify(item)}`)
        }

        const product = await tx.product.findUnique({
          where: { id: productId },
        })

        if (!product) {
          throw new Error(`Producto no encontrado: ID ${productId}`)
        }

        if (product.stock < quantity) {
          throw new Error(`Stock insuficiente para ${product.name}`)
        }

        // Update stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stock: product.stock - quantity },
        })

        // Create sale record
        const saleAmount = product.price * quantity
        const isPaid = body.isPendingPayment !== true
        const sale = await tx.salesRecord.create({
          data: {
            product: product.name,
            amount: saleAmount,
            saleDate: new Date(),
            clientDni,
            paymentMethod: body.paymentMethod || "Efectivo",
            isPaid,
            amountPaid: isPaid ? saleAmount : 0,
            soldById: persistedUserId,
          },
        })

        processedItems.push({ sale, product: updatedProduct, quantity })
      }

      return { items: processedItems }
    })


    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error creating sale" },
      { status: 500 }
    );
  }
}
