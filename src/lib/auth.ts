import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tbos-jwt-secret-key-change-in-production-2024'
)

const TOKEN_EXPIRY = '7d'

export interface JWTPayload {
  userId: string
  email: string
  type: string
  instituteId: string | null
  isSuperAdmin: boolean
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      type: payload.type as string,
      instituteId: (payload.instituteId as string) || null,
      isSuperAdmin: (payload.isSuperAdmin as boolean) || false,
    }
  } catch {
    return null
  }
}

export const COOKIE_NAME = 'tbos_session'
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
}