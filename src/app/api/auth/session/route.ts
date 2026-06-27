import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Fetch fresh user data
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.status !== "active") {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const isSuperAdmin = user.type === "super_admin";

    let institute = null;
    if (isSuperAdmin) {
      // No institute for super admins
    } else if (user.type === "owner") {
      institute = await db.institute.findFirst({
        where: { ownerId: user.id },
      });
    } else if (user.instituteId) {
      institute = await db.institute.findUnique({
        where: { id: user.instituteId },
      });
    }

    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({
      authenticated: true,
      user: { ...userWithoutPassword, isSuperAdmin },
      institute,
    });
  } catch (error: any) {
    console.error("Session error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}