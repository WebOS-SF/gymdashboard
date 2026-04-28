import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { NextResponse } from "next/server"

function getTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const clientDni = Number(body.clientDni)
    const status = body.status as "PRESENT" | "ABSENT"

    if (!Number.isFinite(clientDni)) {
      return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
    }

    if (!["PRESENT", "ABSENT"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    const date = getTodayStart()

    const attendance = await prisma.attendance.upsert({
      where: {
        clientDni_date: {
          clientDni,
          date,
        },
      },
      update: {
        status,
      },
      create: {
        clientDni,
        date,
        status,
      },
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Error registrando asistencia:", error)
    return NextResponse.json(
      { error: "Error al registrar asistencia" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const date = getTodayStart()

    const attendances = await prisma.attendance.findMany({
      where: { date },
    })

    return NextResponse.json(attendances)
  } catch (error) {
    console.error("Error obteniendo asistencias:", error)
    return NextResponse.json(
      { error: "Error al obtener asistencias" },
      { status: 500 }
    )
  }
}
