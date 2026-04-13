import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.Product.findMany();

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request){
    const body = await req.json();
    try {
        const product = await prisma.Product.create({
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