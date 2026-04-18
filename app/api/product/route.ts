import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

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
        const product = await prisma.product.create({
            data: {
                name: body.name,
                price: body.price,
                stock: body.stock,
                category: body.category
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
