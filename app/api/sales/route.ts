import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(){
    try {
        const sales = await prisma.salesRecord.findMany({
            include:{
                client:true
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
  try {
    const body = await req.json();

    const productId = Number(body.productId)
    const clientDni = Number(body.clientDni)
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
        },
      })

      return { sale, product: updatedProduct }
    })

    if ("error" in result) {
      const status = result.error === "Product not found" ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating sale" },
      { status: 500 }
    );
  }
}