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

    const purchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        purchaseDate: new Date(body.purchaseDate),
        description: body.description,
        category: body.category,
        quantity: Number(body.quantity) || 1,
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod,
      },
      include: {
        createdBy: { select: { id: true, username: true, role: true } },
      },
    });

    return NextResponse.json(purchase);
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

    await prisma.purchase.delete({
      where: { id: purchaseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json(
      { error: "Error al eliminar la compra" },
      { status: 500 }
    );
  }
}
