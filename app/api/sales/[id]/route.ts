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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await params
    const saleId = Number(id)

    // 1. Get the sale to know the product name and amount
    const sale = await prisma.salesRecord.findUnique({
      where: { id: saleId }
    })

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })
    }

    // 2. Try to restore stock
    // Find product by name
    const product = await prisma.product.findFirst({
      where: { name: sale.product }
    })

    if (product && product.price > 0) {
      // Estimate quantity
      const quantity = Math.max(1, Math.round(sale.amount / product.price))
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: product.stock + quantity }
      })
    }

    // 3. Delete sale
    await prisma.salesRecord.delete({
      where: { id: saleId }
    })

    return NextResponse.json({ success: true, restoredProduct: product?.id })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ error: "Error al eliminar la venta" }, { status: 500 })
  }
}
