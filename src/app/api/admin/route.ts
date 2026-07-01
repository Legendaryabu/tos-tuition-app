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
            select: { id: true, name: true, slug: true, city: true, isActive: true, createdAt: true },
          }),
          db.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, description: true, subjectType: true, subjectId: true, causerId: true, createdAt: true },
          }),
        ])

        // Enrich activity logs with causer names
        const causerIds = [...new Set(recentActivity.map((a) => a.causerId).filter(Boolean))]
        const causers = causerIds.length > 0
          ? await db.user.findMany({
              where: { id: { in: causerIds } },
              select: { id: true, firstName: true, lastName: true, email: true },
            })
          : []
        const causerMap = new Map(causers.map((c) => [c.id, c]))
        const enrichedActivity = recentActivity.map((a) => ({
          ...a,
          causer: a.causerId ? causerMap.get(a.causerId) || null : null,
        }))

        return NextResponse.json({
          totalInstitutes,
          activeInstitutes,
          totalUsers,
          totalStudents,
          totalTeachers,
          totalRevenue: revenueResult._sum.amount ?? 0,
          recentInstitutes,
          recentActivity: enrichedActivity,
        })
      }

      case 'institutes': {
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const [institutes, total] = await Promise.all([
          db.institute.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: { id: true, name: true, slug: true, city: true, email: true, phone: true, isActive: true, createdAt: true, ownerId: true },
          }),
          db.institute.count(),
        ])

        // Enrich with owner data
        const ownerIds = [...new Set(institutes.map((i) => i.ownerId).filter(Boolean))]
        const owners = ownerIds.length > 0
          ? await db.user.findMany({
              where: { id: { in: ownerIds } },
              select: { id: true, firstName: true, lastName: true, email: true },
            })
          : []
        const ownerMap = new Map(owners.map((o) => [o.id, o]))

        // Count students/teachers/batches per institute
        const instituteIds = institutes.map((i) => i.id)
        const [studentCounts, teacherCounts, batchCounts] = await Promise.all([
          Promise.all(instituteIds.map((id) => db.student.count({ where: { instituteId: id } }))),
          Promise.all(instituteIds.map((id) => db.teacher.count({ where: { instituteId: id } }))),
          Promise.all(instituteIds.map((id) => db.batch.count({ where: { instituteId: id } }))),
        ])

        const enrichedInstitutes = institutes.map((inst, idx) => ({
          ...inst,
          owner: inst.ownerId ? ownerMap.get(inst.ownerId) || null : null,
          _count: {
            students: studentCounts[idx],
            teachers: teacherCounts[idx],
            batches: batchCounts[idx],
          },
        }))

        return NextResponse.json({
          institutes: enrichedInstitutes,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        })
      }

      case 'users': {
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const [users, total] = await Promise.all([
          db.user.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
              id: true, firstName: true, lastName: true, email: true,
              mobile: true, type: true, status: true, lastLoginAt: true,
              createdAt: true, instituteId: true,
            },
          }),
          db.user.count(),
        ])

        // Enrich with institute names
        const instIds = [...new Set(users.map((u) => u.instituteId).filter(Boolean))]
        const insts = instIds.length > 0
          ? await db.institute.findMany({
              where: { id: { in: instIds } },
              select: { id: true, name: true },
            })
          : []
        const instMap = new Map(insts.map((i) => [i.id, i]))

        const enrichedUsers = users.map((user) => ({
          ...user,
          institute: user.instituteId ? instMap.get(user.instituteId) || null : null,
        }))

        return NextResponse.json({
          users: enrichedUsers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        })
      }

      case 'activity': {
        const activityLogs = await db.activityLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: { id: true, description: true, subjectType: true, subjectId: true, causerId: true, createdAt: true, ipAddress: true },
        })

        // Enrich with causer names
        const causerIds = [...new Set(activityLogs.map((a) => a.causerId).filter(Boolean))]
        const causers = causerIds.length > 0
          ? await db.user.findMany({
              where: { id: { in: causerIds } },
              select: { id: true, firstName: true, lastName: true, email: true },
            })
          : []
        const causerMap = new Map(causers.map((c) => [c.id, c]))
        const enrichedLogs = activityLogs.map((a) => ({
          ...a,
          causer: a.causerId ? causerMap.get(a.causerId) || null : null,
        }))

        return NextResponse.json({ activityLogs: enrichedLogs })
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