import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(){
    try {
        const sales = await prisma.salesRecord.groupBy({
            by: ['saleDate'],
            _sum: {
                amount: true
            }
        })
        return NextResponse.json(sales)
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener las ventas por X" })
    }
}