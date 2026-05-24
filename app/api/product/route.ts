import { prisma } from "@/lib/prisma";
import { requireSuperadmin, requireUser } from "@/lib/auth";
import { getPersistedUserId } from "@/lib/auth"
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

        
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json(
            { error: "Error creating product" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    const user = await requireSuperadmin()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    try {
        const body = await req.json();
        const productId = Number(body.id)

        if (!Number.isFinite(productId)) {
            return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 })
        }

        const product = await prisma.product.update({
            where: { id: productId },
            data: {
                name: body.name,
                price: Number(body.price),
                stock: Number(body.stock),
                category: body.category,
            },
        })

        return NextResponse.json(product)
    } catch (error) {
        return NextResponse.json(
            { error: "Error updating product" },
            { status: 500 }
        );
    }
}
