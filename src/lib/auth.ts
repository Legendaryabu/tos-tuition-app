import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tbos-jwt-secret-change-in-production-min-32-chars'
)
const JWT_EXPIRY = '7d' // 7 days

export const COOKIE_NAME = 'tbos-token'

// ── Password Hashing ──────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  // Try bcrypt first
  const isBcryptHash = hashedPassword.startsWith('$2')
  if (isBcryptHash) {
    return bcrypt.compare(plainPassword, hashedPassword)
  }
  // Fallback: plain-text comparison for migration of existing users
  return plainPassword === hashedPassword
}

// ── JWT Token Management ──────────────────────────────────────────────────
export async function createToken(payload: {
  userId: string
  instituteId?: string
  type: string
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; instituteId?: string; type: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      instituteId: payload.instituteId as string | undefined,
      type: payload.type as string,
    }
  } catch {
    return null
  }
}

// ── Auth from Request ─────────────────────────────────────────────────────
// Extracts and verifies JWT from Authorization: Bearer <token> header
// Returns { user, instituteId, error }
export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, instituteId: null, error: 'Authentication required' }
  }

  const token = authHeader.slice(7)
  const payload = await verifyToken(token)
  if (!payload) {
    return { user: null, instituteId: null, error: 'Invalid or expired token' }
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      type: true,
      instituteId: true,
      status: true,
      profilePhoto: true,
    },
  })

  if (!user || user.status !== 'active') {
    return { user: null, instituteId: null, error: 'User not found or inactive' }
  }

  return {
    user,
    instituteId: payload.instituteId || user.instituteId,
    error: null,
  }
}

// ── Role-Based Authorization ──────────────────────────────────────────────
export async function requireAuth(request: NextRequest) {
  const result = await getAuthUser(request)
  if (result.error || !result.user) {
    return {
      user: null,
      instituteId: null,
      error: result.error,
      response: NextResponse.json({ error: result.error }, { status: 401 }),
    }
  }
  return { ...result, response: null }
}

export async function requireInstituteAccess(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth

  // Get instituteId from query or body
  const { searchParams } = new URL(request.url)
  let instituteId = searchParams.get('instituteId')

  // For POST/PUT/PATCH, try body
  if (
    !instituteId &&
    ['POST', 'PUT', 'PATCH'].includes(request.method)
  ) {
    try {
      const body =
        (request as Record<string, unknown>)._parsedBody ||
        (await request.json())
      instituteId =
        (body as Record<string, unknown>).instituteId as string | undefined ||
        instituteId
      // Store it on the request object for downstream use
      ;(request as Record<string, unknown>)._parsedBody = body
    } catch {
      // Body might not be JSON or already consumed
    }
  }

  if (!instituteId) {
    return {
      ...auth,
      error: 'instituteId required',
      response: NextResponse.json(
        { error: 'instituteId is required' },
        { status: 400 }
      ),
    }
  }

  // Verify access
  if (auth.user!.type === 'super_admin') {
    return { ...auth, instituteId }
  }

  if (auth.user!.type === 'owner') {
    const institute = await db.institute.findFirst({
      where: { id: instituteId, ownerId: auth.user!.id },
    })
    if (!institute) {
      return {
        ...auth,
        error: 'Access denied',
        response: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
      }
    }
    return { ...auth, instituteId }
  }

  // Staff/teacher/student - must belong to this institute
  if (auth.user!.instituteId !== instituteId) {
    return {
      ...auth,
      error: 'Access denied',
      response: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
    }
  }

  return { ...auth, instituteId }
}

// ── Utility: Generate Random Password ─────────────────────────────────────
export function generateRandomPassword(length = 12): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  // Ensure at least one uppercase, one lowercase, one digit, one special
  password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[
    Math.floor(Math.random() * 22)
  ]
  password += 'abcdefghjkmnpqrstuvwxyz'[
    Math.floor(Math.random() * 23)
  ]
  password += '23456789'[Math.floor(Math.random() * 8)]
  password += '!@#$%'[Math.floor(Math.random() * 5)]
  for (let i = 4; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

// ── Utility: Generate Student Number ──────────────────────────────────────
export async function generateStudentNumber(
  instituteId: string
): Promise<string> {
  const institute = await db.institute.findUnique({
    where: { id: instituteId },
    select: { studentNumberPrefix: true, studentNumberSeq: true },
  })
  if (!institute) throw new Error('Institute not found')

  const seq = String(institute.studentNumberSeq + 1).padStart(4, '0')
  const studentNumber = `${institute.studentNumberPrefix || 'STU'}${seq}`

  await db.institute.update({
    where: { id: instituteId },
    data: { studentNumberSeq: { increment: 1 } },
  })

  return studentNumber
}

// ── Utility: Generate Receipt Number ──────────────────────────────────────
export async function generateReceiptNumber(
  instituteId: string
): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  const receiptCount = await db.receipt.count({
    where: {
      instituteId,
      issueDate: {
        gte: new Date(year, today.getMonth(), 1),
        lt: new Date(year, today.getMonth() + 1, 1),
      },
    },
  })

  const seq = String(receiptCount + 1).padStart(4, '0')
  const institute = await db.institute.findUnique({
    where: { id: instituteId },
    select: { receiptPrefix: true },
  })

  return `${institute?.receiptPrefix || 'RCP'}${year}${month}${seq}`
}