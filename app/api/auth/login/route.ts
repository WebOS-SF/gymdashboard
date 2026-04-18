import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  sanitizeAccount,
  SESSION_COOKIE,
  signSession,
  verifyPassword,
} from "@/lib/auth";

const BOOTSTRAP_USERNAME = process.env.DEMO_SUPERADMIN_USER || "superadmin";
const BOOTSTRAP_PASSWORD = process.env.DEMO_SUPERADMIN_PASSWORD || "superadmin";
const DEMO_ADMIN_USERNAME = process.env.DEMO_ADMIN_USER || "admin1";
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "admin123";

function demoUser(username: string) {
  if (username === BOOTSTRAP_USERNAME) {
    return {
      id: 1,
      username: BOOTSTRAP_USERNAME,
      role: "superadmin" as const,
    };
  }

  return {
    id: 2,
    username: DEMO_ADMIN_USERNAME,
    role: "admin" as const,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 },
      );
    }

    if (
      process.env.ENABLE_DEMO_LOGIN !== "false" &&
      ((username === BOOTSTRAP_USERNAME && password === BOOTSTRAP_PASSWORD) ||
        (username === DEMO_ADMIN_USERNAME && password === DEMO_ADMIN_PASSWORD))
    ) {
      const user = demoUser(username);
      const response = NextResponse.json({ user });
      response.cookies.set(SESSION_COOKIE, signSession(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      });

      return response;
    }

    const accountsCount = await prisma.adminAccount.count();

    if (
      accountsCount === 0 &&
      username === BOOTSTRAP_USERNAME &&
      password === BOOTSTRAP_PASSWORD
    ) {
      const { passwordHash, passwordSalt } = hashPassword(password);
      await prisma.adminAccount.create({
        data: {
          username,
          passwordHash,
          passwordSalt,
          role: "superadmin",
        },
      });
    }

    if (username === DEMO_ADMIN_USERNAME && password === DEMO_ADMIN_PASSWORD) {
      const existingDemoAdmin = await prisma.adminAccount.findUnique({
        where: { username: DEMO_ADMIN_USERNAME },
      });

      if (!existingDemoAdmin) {
        const { passwordHash, passwordSalt } = hashPassword(password);
        await prisma.adminAccount.create({
          data: {
            username: DEMO_ADMIN_USERNAME,
            passwordHash,
            passwordSalt,
            role: "admin",
          },
        });
      }
    }

    const account = await prisma.adminAccount.findUnique({
      where: { username },
    });

    if (
      !account ||
      !verifyPassword(password, account.passwordHash, account.passwordSalt)
    ) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 },
      );
    }

    if (account.role !== "admin" && account.role !== "superadmin") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 403 });
    }

    const user = sanitizeAccount(account);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, signSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "Error al iniciar sesión. Revisa DATABASE_URL y que la migración AdminAccount exista."
            : "Error al iniciar sesión",
      },
      { status: 500 },
    );
  }
}
