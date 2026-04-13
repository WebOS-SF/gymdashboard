import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(){
    try {
    const totalSales = await prisma.salesRecord.aggregate({
        _sum: {
            amount: true
        }
    })
    return NextResponse.json(totalSales)
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener las ventas totales" })
    }
}