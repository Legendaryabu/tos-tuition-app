import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin?tab=overview|institutes|users|activity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') ?? 'overview'

    switch (tab) {
      case 'overview': {
        const [
          totalInstitutes,
          activeInstitutes,
          totalUsers,
          totalStudents,
          totalTeachers,
          revenueResult,
          recentInstitutes,
          recentActivity,
        ] = await Promise.all([
          db.institute.count(),
          db.institute.count({ where: { isActive: true } }),
          db.user.count(),
          db.student.count(),
          db.teacher.count(),
          db.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed' } }),
          db.institute.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              plan: { select: { name: true, slug: true } },
            },
          }),
          db.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              causer: { select: { firstName: true, lastName: true, email: true } },
            },
          }),
        ])

        return NextResponse.json({
          totalInstitutes,
          activeInstitutes,
          totalUsers,
          totalStudents,
          totalTeachers,
          totalRevenue: revenueResult._sum.amount ?? 0,
          recentInstitutes,
          recentActivity,
        })
      }

      case 'institutes': {
        const institutes = await db.institute.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            plan: { select: { name: true, slug: true } },
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: {
              select: {
                students: true,
                batches: true,
                teachers: true,
              },
            },
          },
        })

        return NextResponse.json({ institutes })
      }

      case 'users': {
        const users = await db.user.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            institute: { select: { id: true, name: true } },
          },
        })

        return NextResponse.json({
          users: users.map((user) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            type: user.type,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            instituteId: user.instituteId,
            institute: user.institute,
          })),
        })
      }

      case 'activity': {
        const activityLogs = await db.activityLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            causer: { select: { firstName: true, lastName: true, email: true } },
          },
        })

        return NextResponse.json({ activityLogs })
      }

      default:
        return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('[ADMIN_API_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin — Manage institutes and users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, id } = body as { action: string; id: string }

    if (!action || !id) {
      return NextResponse.json({ error: 'Missing required fields: action, id' }, { status: 400 })
    }

    switch (action) {
      case 'activate_institute': {
        await db.institute.update({
          where: { id },
          data: { isActive: true },
        })
        return NextResponse.json({ success: true, message: 'Institute activated successfully' })
      }

      case 'deactivate_institute': {
        await db.institute.update({
          where: { id },
          data: { isActive: false },
        })
        return NextResponse.json({ success: true, message: 'Institute deactivated successfully' })
      }

      case 'activate_user': {
        await db.user.update({
          where: { id },
          data: { status: 'active' },
        })
        return NextResponse.json({ success: true, message: 'User activated successfully' })
      }

      case 'deactivate_user': {
        await db.user.update({
          where: { id },
          data: { status: 'inactive' },
        })
        return NextResponse.json({ success: true, message: 'User deactivated successfully' })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('[ADMIN_API_PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}