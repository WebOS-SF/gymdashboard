import { NextResponse } from "next/server"
import { hashPassword, requireSuperadmin, sanitizeAccount } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const accounts = await prisma.adminAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(accounts.map(sanitizeAccount))
}

export async function POST(request: Request) {
  const user = await requireSuperadmin()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  try {
    const body = await request.json()
    const username = String(body.username || "").trim()
    const password = String(body.password || "")

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 })
    }

    const { passwordHash, passwordSalt } = hashPassword(password)
    const account = await prisma.adminAccount.create({
      data: {
        username,
        passwordHash,
        passwordSalt,
        role: "admin",
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(sanitizeAccount(account), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Error al crear la cuenta admin" }, { status: 500 })
  }
}
