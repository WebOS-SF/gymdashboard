import { NextResponse } from "next/server"
import { hashPassword, requireSuperadmin, sanitizeAccount } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  try {
    const { id } = await params
    const body = await request.json()
    const password = String(body.password || "")

    if (!password) {
      return NextResponse.json({ error: "La nueva contraseña es requerida" }, { status: 400 })
    }

    const { passwordHash, passwordSalt } = hashPassword(password)
    const account = await prisma.adminAccount.update({
      where: { id: Number(id) },
      data: { passwordHash, passwordSalt },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(sanitizeAccount(account))
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar la contraseña" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  try {
    const { id } = await params
    const accountId = Number(id)

    if (accountId === user.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 })
    }

    const account = await prisma.adminAccount.findUnique({
      where: { id: accountId },
      select: { role: true },
    })

    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    if (account.role === "superadmin") {
      return NextResponse.json({ error: "No se puede eliminar una cuenta superadmin" }, { status: 400 })
    }

    await prisma.adminAccount.delete({ where: { id: accountId } })

    return NextResponse.json({ message: "Cuenta eliminada" })
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar la cuenta" }, { status: 500 })
  }
}
