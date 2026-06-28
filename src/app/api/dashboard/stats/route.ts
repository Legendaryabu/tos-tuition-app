import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Week start (Monday) for "due this week"
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    // Month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // ── Phase 1: Parallel core queries ──────────────────────────

    const [
      totalStudents,
      totalBatches,
      activeBatches,
      totalTeachers,
      monthlyRevenue,
      todayPaymentsData,
      newStudentsThisMonth,
      todayClasses,
      upcomingSessions,
      recentAttendance,
      unpaidPartialDues,
      recentPayments,
      batches,
      teachers,
    ] = await Promise.all([
      db.student.count({ where: { instituteId, status: "active" } }),
      db.batch.count({ where: { instituteId } }),
      db.batch.count({ where: { instituteId, status: "active" } }),
      db.teacher.count({ where: { instituteId, isActive: true } }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: { instituteId, status: "completed", recordedAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { instituteId, status: "completed", recordedAt: { gte: today, lt: tomorrow } },
      }),
      db.student.count({
        where: { instituteId, status: "active", enrolledAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.classSession.findMany({
        where: { instituteId, sessionDate: { gte: today, lt: tomorrow } },
        orderBy: { startTime: "asc" },
      }),
      db.classSession.findMany({
        where: { instituteId, sessionDate: { gte: today }, status: "scheduled" },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
        take: 10,
      }),
      db.attendanceRecord.groupBy({
        by: ["status"],
        where: { instituteId, markedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        _count: { status: true },
      }),
      // All unpaid/partial dues for summary calculation
      db.feeDue.findMany({
        where: { instituteId, status: { in: ["unpaid", "partial"] } },
        select: { id: true, amount: true, amountPaid: true, waivedAmount: true, dueDate: true, studentId: true, status: true, description: true, periodMonth: true, periodYear: true },
      }),
      db.payment.findMany({
        where: { instituteId },
        orderBy: { recordedAt: "desc" },
        take: 10,
      }),
      db.batch.findMany({ where: { instituteId }, select: { id: true, name: true, subjectId: true } }),
      // Teachers via User model
      (async () => {
        const teacherRecords = await db.teacher.findMany({
          where: { instituteId },
          select: { id: true, userId: true },
        });
        const userIds = teacherRecords.map((t) => t.userId).filter(Boolean);
        const teacherUserMap = new Map(teacherRecords.map((t) => [t.userId, t.id]));
        const users = userIds.length > 0
          ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
          : [];
        return users.map((u) => ({ id: teacherUserMap.get(u.id), firstName: u.firstName, lastName: u.lastName }));
      })(),
    ]);

    // ── Phase 2: Revenue history (6 months, parallel) ───────────

    const revenueQueries = Array.from({ length: 6 }, (_, i) => {
      const mStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return db.payment.aggregate({
        _sum: { amount: true },
        where: { instituteId, status: "completed", recordedAt: { gte: mStart, lt: mEnd } },
      }).then((r) => ({
        month: mStart.toLocaleString("en-US", { month: "short" }),
        revenue: r._sum.amount || 0,
      }));
    });
    const revenueHistory = await Promise.all(revenueQueries);

    // ── Phase 3: Compute stats from raw dues ────────────────────

    let totalUnpaid = 0;
    let totalUnpaidAmount = 0;
    let totalOverdue = 0;
    let totalOverdueAmount = 0;
    let totalDueThisWeek = 0;
    let totalDueThisWeekAmount = 0;

    for (const d of unpaidPartialDues) {
      const remaining = d.amount - d.amountPaid - d.waivedAmount;
      totalUnpaid++;
      totalUnpaidAmount += remaining;

      if (d.dueDate < now) {
        totalOverdue++;
        totalOverdueAmount += remaining;
      } else if (d.dueDate <= weekStart) {
        totalDueThisWeek++;
        totalDueThisWeekAmount += remaining;
      }
    }

    // ── Phase 4: Upcoming/overdue dues for display ──────────────

    // Get top overdue + due-this-week dues, enriched with student
    const upcomingDueIds = unpaidPartialDues
      .filter((d) => d.dueDate <= new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 10);

    // Collect student IDs from both upcoming dues AND recent payments
    const paymentStudentIds = [...new Set(recentPayments.map((p) => p.studentId).filter(Boolean))];
    const dueStudentIds = [...new Set(upcomingDueIds.map((d) => d.studentId))];
    const allStudentIds = [...new Set([...dueStudentIds, ...paymentStudentIds])];

    const students = allStudentIds.length > 0
      ? await db.student.findMany({
          where: { id: { in: allStudentIds } },
          select: { id: true, fullName: true, studentNumber: true },
        })
      : [];
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Enrich recentPayments with student data
    const enrichedRecentPayments = recentPayments.map((p) => ({
      ...p,
      student: studentMap.get(p.studentId) || null,
    }));

    const upcomingDues = upcomingDueIds.map((d) => {
      const remaining = d.amount - d.amountPaid - d.waivedAmount;
      const isOverdue = d.dueDate < now;
      return {
        id: d.id,
        studentId: d.studentId,
        student: studentMap.get(d.studentId) || null,
        description: d.description,
        amount: d.amount,
        remaining,
        dueDate: d.dueDate.toISOString(),
        displayStatus: isOverdue ? "overdue" : d.status,
      };
    });

    // ── Phase 5: Enrich sessions and attendance ─────────────────

    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const teacherMap = new Map(teachers.map((t) => [t.id]));

    const subjectIds = [...new Set(batches.map((b) => b.subjectId).filter(Boolean))];
    const subjects = subjectIds.length > 0
      ? await db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, color: true } })
      : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const enrichSession = (s: Record<string, unknown>) => {
      const batch = batchMap.get(s.batchId as string);
      const teacher = teacherMap.get((s.teacherId as string) || "");
      const subject = batch ? subjectMap.get(batch.subjectId) : null;
      return {
        ...s,
        batch: batch ? { name: batch.name, subject } : null,
        teacher: teacher || null,
      };
    };

    const enrichedTodayClasses = todayClasses.map(enrichSession);
    const enrichedUpcomingSessions = upcomingSessions.map(enrichSession);

    const totalAttendance = recentAttendance.reduce((sum, r) => sum + r._count.status, 0);
    const presentCount = recentAttendance.find((r) => r.status === "present")?._count.status || 0;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // ── Response ─────────────────────────────────────────────────

    return NextResponse.json({
      stats: {
        totalStudents,
        totalBatches,
        activeBatches,
        totalTeachers,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        attendanceRate,
        unpaidDues: { count: totalUnpaid, totalAmount: totalUnpaidAmount },
        overdueDues: { count: totalOverdue, totalAmount: totalOverdueAmount },
        todayPayments: { count: todayPaymentsData._count, totalAmount: todayPaymentsData._sum.amount || 0 },
        newStudentsThisMonth,
      },
      todayClasses: enrichedTodayClasses,
      upcomingSessions: enrichedUpcomingSessions,
      recentPayments: enrichedRecentPayments,
      revenueHistory,
      upcomingDues,
    });
  } catch (error: unknown) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}