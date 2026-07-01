import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken, hashPassword } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per minute per IP
    const ip = getClientIp(request)
    const limiter = rateLimit(`login:${ip}`, {
      maxRequests: 5,
      windowMs: 60 * 1000,
    })
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((limiter.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findFirst({
      where: { email },
    })

    // Generic error to prevent user enumeration
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password (bcrypt with plain-text fallback for migration)
    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active. Contact support.' },
        { status: 403 }
      )
    }

    // Migrate plain-text password to bcrypt on successful login
    if (!user.password.startsWith('$2')) {
      const hashed = await hashPassword(password)
      await db.user.update({
        where: { id: user.id },
        data: { password: hashed },
      })
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    let institute = null

    // Super admin has no institute
    if (user.type === 'super_admin') {
      // No institute for super admins
    } else if (user.type === 'owner') {
      institute = await db.institute.findFirst({
        where: { ownerId: user.id },
      })
    } else if (user.instituteId) {
      institute = await db.institute.findUnique({
        where: { id: user.instituteId },
      })
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      instituteId: institute?.id,
      type: user.type,
    })

    const { password: _password, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      institute,
      token,
    })
  } catch (error: unknown) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}