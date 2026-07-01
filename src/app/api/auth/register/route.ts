import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createToken } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit'
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per hour per IP
    const ip = getClientIp(request)
    const limiter = rateLimit(`register:${ip}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    })
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((limiter.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      instituteName,
      instituteType,
      city,
      district,
    } = body

    if (!firstName || !lastName || !email || !password || !instituteName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Password strength validation
    const pwError = validatePasswordStrength(password)
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await db.user.findFirst({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if institute slug exists
    const slug = instituteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const existingInstitute = await db.institute.findUnique({ where: { slug } })
    if (existingInstitute) {
      return NextResponse.json(
        { error: 'Institute name already taken' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Get or create Free plan
    let plan = await db.plan.findFirst({ where: { slug: 'free' } })
    if (!plan) {
      plan = await db.plan.create({
        data: {
          name: 'Free',
          slug: 'free',
          priceMonthly: 0,
          priceYearly: 0,
          currency: 'LKR',
          maxStudents: 50,
          maxTeachers: 5,
          maxBranches: 2,
          isActive: true,
          trialDays: 30,
        },
      })
    }

    // Use transaction for all creates
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          mobile: phone,
          type: 'owner',
          status: 'active',
        },
      })

      const institute = await tx.institute.create({
        data: {
          name: instituteName,
          slug,
          type: instituteType || 'individual',
          phone: phone || '',
          email,
          city: city || 'Colombo',
          district: district || 'Colombo',
          currency: 'LKR',
          timezone: 'Asia/Colombo',
          isActive: true,
          onboardingCompleted: false,
          planId: plan.id,
          ownerId: user.id,
        },
      })

      // Update user with instituteId
      await tx.user.update({
        where: { id: user.id },
        data: { instituteId: institute.id },
      })

      // Create subscription
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + (plan.trialDays || 14))
      const subEnd = new Date()
      subEnd.setFullYear(subEnd.getFullYear() + 1)

      await tx.subscription.create({
        data: {
          instituteId: institute.id,
          planId: plan.id,
          status: 'trial',
          billingCycle: 'monthly',
          amount: 0,
          currency: 'LKR',
          startedAt: new Date(),
          endsAt: subEnd,
          trialEndsAt: trialEnd,
        },
      })

      // Create default settings
      await tx.instituteSetting.createMany({
        data: [
          { instituteId: institute.id, key: 'attendance_method', value: 'manual', type: 'string', group: 'attendance' },
          { instituteId: institute.id, key: 'language', value: 'en', type: 'string', group: 'general' },
          { instituteId: institute.id, key: 'timezone', value: 'Asia/Colombo', type: 'string', group: 'general' },
        ],
      })

      // Activity log
      await tx.activityLog.create({
        data: {
          instituteId: institute.id,
          description: 'Institute created',
          subjectType: 'Institute',
          causerId: user.id,
        },
      })

      return { user, institute }
    })

    const { password: _password, ...userWithoutPassword } = result.user

    // Create JWT token
    const token = await createToken({
      userId: result.user.id,
      instituteId: result.institute.id,
      type: result.user.type,
    })

    return NextResponse.json(
      {
        user: userWithoutPassword,
        institute: result.institute,
        token,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}