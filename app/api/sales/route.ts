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

    const sale = await prisma.salesRecord.create({
      data: {
        product: body.product,
        amount: body.amount,
        saleDate: new Date(),
        clientDni: body.clientDni,
      },
    });

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating sale" },
      { status: 500 }
    );
  }
}