import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { formatClient } from "@/lib/client-utils"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { dni } = await params

    const client = await prisma.client.findUnique({
      where: {
        dni: Number(dni),
      },
      include: {
        sales: true,
        boletas: true,
        appointments: true,
        plans: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json(formatClient(client))
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener el cliente" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { dni } = await params
    const numericDni = Number(dni)
    const body = await request.json()

    const previousClient = await prisma.client.findUnique({
      where: { dni: numericDni },
      include: {
        plans: true,
      },
    })

    if (!previousClient) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const newDni = body.dni ? Number(body.dni) : numericDni;

    const dataToUpdate: any = {
      nameComplete: body.name || previousClient.nameComplete,
      phone: typeof body.phone !== "undefined" ? body.phone || null : previousClient.phone,
    };

    if (newDni !== numericDni && numericDni < 0) {
      dataToUpdate.dni = newDni;
    }

    const result = await prisma.client.update({
      where: { dni: numericDni },
      data: dataToUpdate,
      include: {
        plans: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    })

    if (!result) {
      return NextResponse.json({ error: "Error al actualizar el cliente" }, { status: 500 })
    }

    return NextResponse.json(formatClient(result))
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar el cliente" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { dni } = await params

    await prisma.client.delete({
      where: {
        dni: Number(dni),
      },
    })

    return NextResponse.json({ message: "Cliente eliminado exitosamente" })
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el cliente" }, { status: 500 })
  }
}
