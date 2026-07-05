import { prisma } from "@/lib/prisma";
import { requireSuperadmin, getPersistedUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireSuperadmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        createdBy: { select: { id: true, username: true, role: true } },
      },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching purchases" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await requireSuperadmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  try {
    const persistedUserId = await getPersistedUserId(user);
    const productId = body.category === "Producto" && body.productId ? Number(body.productId) : null;
    const quantity = Number(body.quantity) || 1;

    const { purchase, updatedProduct } = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          purchaseDate: new Date(body.purchaseDate),
          description: body.description,
          category: body.category,
          quantity,
          amount: Number(body.amount),
          paymentMethod: body.paymentMethod || "Efectivo",
          createdById: persistedUserId,
          productId,
        },
        include: {
          createdBy: { select: { id: true, username: true, role: true } },
        },
      });

      const updatedProduct = productId
        ? await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } },
          })
        : null;

      return { purchase, updatedProduct };
    });

    return NextResponse.json({ ...purchase, updatedProduct });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating purchase" },
      { status: 500 }
    );
  }
}
