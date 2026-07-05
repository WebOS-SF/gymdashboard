import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperadmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { id } = await params;
    const purchaseId = Number(id);
    const body = await request.json();

    if (!Number.isFinite(purchaseId)) {
      return NextResponse.json({ error: "ID de compra inválido" }, { status: 400 });
    }

    const newProductId = body.category === "Producto" && body.productId ? Number(body.productId) : null;
    const newQuantity = Number(body.quantity) || 1;

    const { purchase, affectedProducts } = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
      const affectedProducts = [];

      // Revertir el efecto en stock de la compra anterior
      if (existing.category === "Producto" && existing.productId) {
        const reverted = await tx.product.update({
          where: { id: existing.productId },
          data: { stock: { decrement: existing.quantity } },
        });
        affectedProducts.push(reverted);
      }

      const purchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          purchaseDate: new Date(body.purchaseDate),
          description: body.description,
          category: body.category,
          quantity: newQuantity,
          amount: Number(body.amount),
          paymentMethod: body.paymentMethod,
          productId: newProductId,
        },
        include: {
          createdBy: { select: { id: true, username: true, role: true } },
        },
      });

      // Aplicar el efecto en stock de la compra actualizada
      if (newProductId) {
        const applied = await tx.product.update({
          where: { id: newProductId },
          data: { stock: { increment: newQuantity } },
        });
        affectedProducts.push(applied);
      }

      return { purchase, affectedProducts };
    });

    return NextResponse.json({ ...purchase, affectedProducts });
  } catch (error) {
    console.error("Error updating purchase:", error);
    return NextResponse.json(
      { error: "Error al actualizar la compra" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperadmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { id } = await params;
    const purchaseId = Number(id);

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });

      const updatedProduct =
        existing.category === "Producto" && existing.productId
          ? await tx.product.update({
              where: { id: existing.productId },
              data: { stock: { decrement: existing.quantity } },
            })
          : null;

      await tx.purchase.delete({ where: { id: purchaseId } });

      return updatedProduct;
    });

    return NextResponse.json({ success: true, updatedProduct });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json(
      { error: "Error al eliminar la compra" },
      { status: 500 }
    );
  }
}
