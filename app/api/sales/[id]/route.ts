import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const saleId = Number(id)

    const updatedSale = await prisma.salesRecord.update({
      where: { id: saleId },
      data: {
        isPaid: body.isPaid,
        paymentMethod: body.paymentMethod,
      },
    })

    return NextResponse.json(updatedSale)
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ error: "Error al actualizar la venta" }, { status: 500 })
  }
}
