import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export type UserRole = "admin" | "superadmin"

export interface SessionUser {
  id: number
  username: string
  role: UserRole
}

export const SESSION_COOKIE = "gym_session"

const PASSWORD_ITERATIONS = 100_000
const PASSWORD_KEYLEN = 64
const PASSWORD_DIGEST = "sha512"

function getSessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "gymdashboard-dev-secret"
}

function base64url(input: string) {
  return Buffer.from(input).toString("base64url")
}

function fromBase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8")
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const passwordHash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST).toString("hex")
  return { passwordHash, passwordSalt: salt }
}

export function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  const attempted = hashPassword(password, passwordSalt).passwordHash
  const attemptedBuffer = Buffer.from(attempted, "hex")
  const storedBuffer = Buffer.from(passwordHash, "hex")

  if (attemptedBuffer.length !== storedBuffer.length) return false
  return timingSafeEqual(attemptedBuffer, storedBuffer)
}

export function signSession(user: SessionUser) {
  const payload = base64url(JSON.stringify(user))
  const signature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifySessionToken(token?: string): SessionUser | null {
  if (!token) return null

  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expected = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url")
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(fromBase64url(payload)) as SessionUser
    if ((parsed.role !== "admin" && parsed.role !== "superadmin") || !parsed.id || !parsed.username) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return null

  if (process.env.ENABLE_DEMO_LOGIN !== "false" && (session.id === 1 || session.id === 2)) {
    return session
  }

  const account = await prisma.adminAccount.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, role: true },
  })

  if (!account || account.username !== session.username) return null
  if (account.role !== "admin" && account.role !== "superadmin") return null

  return account as SessionUser
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) return null
  return user
}

export async function requireSuperadmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "superadmin") return null
  return user
}

export function sanitizeAccount(account: { id: number; username: string; role: string; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: account.id,
    username: account.username,
    role: account.role as UserRole,
    createdAt: account.createdAt?.toISOString(),
    updatedAt: account.updatedAt?.toISOString(),
  }
}

export async function getPersistedUserId(user: SessionUser) {
  const account = await prisma.adminAccount.findUnique({
    where: { id: user.id },
    select: { id: true },
  })

  return account?.id
}
