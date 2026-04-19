import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";
import { NextResponse } from "next/server";

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

export async function GET() {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  try {
    const now = new Date();

    // Build the last 8 month buckets (including current month)
    const months: { key: string; start: Date; end: Date; label: string }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, start, end, label: monthLabel(start) });
    }

    const from = months[0]?.start ?? new Date(now.getFullYear(), now.getMonth(), 1);

    const [clients, sales] = await Promise.all([
      prisma.client.findMany({
        where: {
          dni: { not: 0 },
          joinDate: { gte: from },
        },
        select: { joinDate: true },
      }),
      prisma.salesRecord.findMany({
        where: { saleDate: { gte: from } },
        select: { saleDate: true },
      }),
    ]);

    const clientsByMonth = new Map<string, number>();
    for (const c of clients) {
      const key = `${c.joinDate.getFullYear()}-${String(c.joinDate.getMonth() + 1).padStart(2, "0")}`;
      clientsByMonth.set(key, (clientsByMonth.get(key) ?? 0) + 1);
    }

    const salesByMonth = new Map<string, number>();
    for (const s of sales) {
      const key = `${s.saleDate.getFullYear()}-${String(s.saleDate.getMonth() + 1).padStart(2, "0")}`;
      salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + 1);
    }

    const data = months.map((m) => ({
      month: m.label,
      clients: clientsByMonth.get(m.key) ?? 0,
      products: salesByMonth.get(m.key) ?? 0,
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching monthly analytics" }, { status: 500 });
  }
}
