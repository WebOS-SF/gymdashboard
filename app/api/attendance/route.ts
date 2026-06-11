import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { parseLocalDate } from "@/lib/client-utils"
import { NextResponse } from "next/server"

function getTodayStart(): Date {
  // Obtener fecha actual en UTC
  const now = new Date()
  // Ajustar a la zona horaria de Perú (UTC-5)
  const peruTime = new Date(now.getTime() - (5 * 60 * 60 * 1000))
  // Retornar el inicio del día en esa zona, como instante UTC (independiente
  // de la zona horaria del servidor)
  return new Date(Date.UTC(peruTime.getUTCFullYear(), peruTime.getUTCMonth(), peruTime.getUTCDate(), 5, 0, 0))
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

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        clientDni,
        date,
      },
    })

    let attendance
    if (existingAttendance) {
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: { status },
      })
    } else {
      attendance = await prisma.attendance.create({
        data: {
          clientDni,
          date,
          status,
        },
      })
    }

    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Error registrando asistencia:", error)
    return NextResponse.json(
      { error: "Error al registrar asistencia" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    let date
    if (dateParam) {
      // Usar la fecha proporcionada en formato YYYY-MM-DD
      date = parseLocalDate(dateParam)
    } else {
      // Usar hoy por defecto
      date = getTodayStart()
    }

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
