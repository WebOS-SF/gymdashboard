import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const user = await requireSuperadmin()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    try {
    const topProducts = await prisma.salesRecord.groupBy({
  by: ["product"],
  _sum: {
    amount: true,
  },
  orderBy: {
    _sum: {
      amount: "desc",
    },
  },
});
return NextResponse.json(topProducts)
} catch (error) {
    return NextResponse.json({ error: "Error al obtener las ventas mas vendidas" })
}
}
