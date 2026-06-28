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
          }),
          db.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ])

        // Enrich recent institutes with plan and owner info
        const planIds = [...new Set(recentInstitutes.map(i => i.planId).filter(Boolean))]
        const ownerIds = [...new Set(recentInstitutes.map(i => i.ownerId).filter(Boolean))]
        const [plans, owners] = await Promise.all([
          planIds.length > 0 ? db.plan.findMany({ where: { id: { in: planIds } } }) : [],
          ownerIds.length > 0 ? db.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : [],
        ])
        const planMap = new Map(plans.map(p => [p.id, p]))
        const ownerMap = new Map(owners.map(o => [o.id, o]))

        const enrichedInstitutes = recentInstitutes.map(inst => ({
          ...inst,
          plan: planMap.get(inst.planId) ? { name: planMap.get(inst.planId)!.name, slug: planMap.get(inst.planId)!.slug } : null,
          owner: ownerMap.get(inst.ownerId) || null,
        }))

        // Enrich activity logs with causer info
        const causerIds = [...new Set(recentActivity.map(a => a.causerId).filter(Boolean))]
        const causers = causerIds.length > 0
          ? await db.user.findMany({ where: { id: { in: causerIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
          : []
        const causerMap = new Map(causers.map(c => [c.id, c]))

        const enrichedActivity = recentActivity.map(log => ({
          ...log,
          causer: log.causerId ? causerMap.get(log.causerId) || null : null,
        }))

        return NextResponse.json({
          totalInstitutes,
          activeInstitutes,
          totalUsers,
          totalStudents,
          totalTeachers,
          totalRevenue: revenueResult._sum.amount ?? 0,
          recentInstitutes: enrichedInstitutes,
          recentActivity: enrichedActivity,
        })
      }

      case 'institutes': {
        const institutes = await db.institute.findMany({
          orderBy: { createdAt: 'desc' },
        })

        // Enrich with plan, owner, and counts
        const planIds = [...new Set(institutes.map(i => i.planId).filter(Boolean))]
        const ownerIds = [...new Set(institutes.map(i => i.ownerId).filter(Boolean))]
        const [plans, owners] = await Promise.all([
          planIds.length > 0 ? db.plan.findMany({ where: { id: { in: planIds } } }) : [],
          ownerIds.length > 0 ? db.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : [],
        ])
        const planMap = new Map(plans.map(p => [p.id, p]))
        const ownerMap = new Map(owners.map(o => [o.id, o]))

        // Get counts for each institute
        const instituteIds = institutes.map(i => i.id)
        const studentCounts = await db.student.groupBy({
          by: ['instituteId'],
          where: { instituteId: { in: instituteIds } },
          _count: { id: true },
        })
        const batchCounts = await db.batch.groupBy({
          by: ['instituteId'],
          where: { instituteId: { in: instituteIds } },
          _count: { id: true },
        })
        const teacherCounts = await db.teacher.groupBy({
          by: ['instituteId'],
          where: { instituteId: { in: instituteIds } },
          _count: { id: true },
        })

        const studentCountMap = new Map(studentCounts.map(c => [c.instituteId, c._count.id]))
        const batchCountMap = new Map(batchCounts.map(c => [c.instituteId, c._count.id]))
        const teacherCountMap = new Map(teacherCounts.map(c => [c.instituteId, c._count.id]))

        const enriched = institutes.map(inst => ({
          id: inst.id,
          name: inst.name,
          slug: inst.slug,
          city: inst.city,
          district: inst.district,
          email: inst.email,
          phone: inst.phone,
          isActive: inst.isActive,
          onboardingCompleted: inst.onboardingCompleted,
          createdAt: inst.createdAt,
          plan: planMap.get(inst.planId) ? { name: planMap.get(inst.planId)!.name, slug: planMap.get(inst.planId)!.slug } : null,
          owner: ownerMap.get(inst.ownerId) || null,
          _count: {
            students: studentCountMap.get(inst.id) ?? 0,
            batches: batchCountMap.get(inst.id) ?? 0,
            teachers: teacherCountMap.get(inst.id) ?? 0,
          },
        }))

        return NextResponse.json({ institutes: enriched })
      }

      case 'users': {
        const users = await db.user.findMany({
          orderBy: { createdAt: 'desc' },
        })

        // Enrich with institute info
        const instituteIds = [...new Set(users.map(u => u.instituteId).filter(Boolean))]
        const institutes = instituteIds.length > 0
          ? await db.institute.findMany({ where: { id: { in: instituteIds } }, select: { id: true, name: true } })
          : []
        const instituteMap = new Map(institutes.map(i => [i.id, i]))

        const enriched = users.map(user => ({
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
          institute: user.instituteId ? instituteMap.get(user.instituteId) || null : null,
        }))

        return NextResponse.json({ users: enriched })
      }

      case 'activity': {
        const activityLogs = await db.activityLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        // Enrich with causer info
        const causerIds = [...new Set(activityLogs.map(a => a.causerId).filter(Boolean))]
        const causers = causerIds.length > 0
          ? await db.user.findMany({ where: { id: { in: causerIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
          : []
        const causerMap = new Map(causers.map(c => [c.id, c]))

        const enriched = activityLogs.map(log => ({
          ...log,
          causer: log.causerId ? causerMap.get(log.causerId) || null : null,
        }))

        return NextResponse.json({ activityLogs: enriched })
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