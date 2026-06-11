import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { dni } = await params
    const clientDni = Number(dni)

    if (!Number.isFinite(clientDni)) {
      return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
    }

    const url = new URL(request.url)
    const year = Number(url.searchParams.get("year"))
    const month = Number(url.searchParams.get("month"))

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    // Medianoche de Perú (UTC-5) del primer y último día del mes, calculada
    // con aritmética UTC pura para que sea independiente de la zona horaria
    // del servidor (local vs producción).
    const start = new Date(Date.UTC(year, month - 1, 1, 5, 0, 0))
    const end = new Date(Date.UTC(year, month, 0, 5, 0, 0))
    end.setUTCHours(23, 59, 59, 999)

    const attendances = await prisma.attendance.findMany({
      where: {
        clientDni,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: "asc",
      },
      select: {
        date: true,
        status: true,
      },
    })

    return NextResponse.json(
      attendances.map((item) => {
        const d = item.date
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        return { date: dateStr, status: item.status }
      })
    )
  } catch (error) {
    console.error("Error obteniendo asistencias del cliente:", error)
    return NextResponse.json(
      { error: "Error al obtener asistencias" },
      { status: 500 }
    )
  }
}
