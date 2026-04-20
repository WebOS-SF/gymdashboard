import { prisma } from "@/lib/prisma";
import { requireSuperadmin, requireUser } from "@/lib/auth";
import { getPersistedUserId, notifyAdmins } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const products = await prisma.product.findMany();

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request){
    const user = await requireSuperadmin()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const body = await req.json();
    try {
        const persistedUserId = await getPersistedUserId(user)
        const product = await prisma.product.create({
            data: {
                name: body.name,
                price: body.price,
                stock: body.stock,
                category: body.category,
                createdById: persistedUserId,
            }
        });

        await notifyAdmins({
            actorId: user.id,
            type: "product_created",
            title: "Nuevo producto disponible",
            message: `${user.username} creó ${product.name} con stock ${product.stock}.`,
            entityType: "product",
            entityId: product.id,
        })
        
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json(
            { error: "Error creating product" },
            { status: 500 }
        );
    }
}
