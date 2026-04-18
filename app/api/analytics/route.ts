import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  try {
    const totalRevenue = await prisma.salesRecord.aggregate({
      _sum: { amount: true },
    });

    const totalSales = await prisma.salesRecord.count();

    const topProducts = await prisma.salesRecord.groupBy({
      by: ["product"],
      _sum: { amount: true },
      orderBy: {
        _sum: { amount: "desc" },
      },
      take: 5,
    });

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalSales,
      topProducts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching analytics" },
      { status: 500 }
    );
  }
}
