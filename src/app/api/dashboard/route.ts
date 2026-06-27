import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    if (!instituteId) {
      return NextResponse.json(
        { error: "instituteId is required" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Parallel queries for dashboard data
    const [
      totalStudents,
      totalBatches,
      activeBatches,
      totalTeachers,
      monthlyRevenue,
      todayClasses,
      upcomingSessions,
      recentAttendance,
      unpaidDues,
      batches,
      teachers,
    ] = await Promise.all([
      db.student.count({
        where: { instituteId, status: "active" },
      }),
      db.batch.count({
        where: { instituteId },
      }),
      db.batch.count({
        where: { instituteId, status: "active" },
      }),
      db.teacher.count({
        where: { instituteId, isActive: true },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          instituteId,
          status: "completed",
          recordedAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      }),
      // Today's classes
      db.classSession.findMany({
        where: {
          instituteId,
          sessionDate: { gte: today, lt: tomorrow },
        },
        orderBy: { startTime: "asc" },
      }),
      // Upcoming sessions (next 7 days)
      db.classSession.findMany({
        where: {
          instituteId,
          sessionDate: { gte: today },
          status: "scheduled",
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
        take: 10,
      }),
      // Attendance rate (last 30 days)
      db.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          instituteId,
          markedAt: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: { status: true },
      }),
      // Unpaid dues
      db.feeDue.aggregate({
        _sum: { amount: true },
        _count: true,
        where: {
          instituteId,
          status: "unpaid",
        },
      }),
      // All batches for this institute (for enrichment)
      db.batch.findMany({
        where: { instituteId },
        select: { id: true, name: true, subjectId: true },
      }),
      // Teachers for enrichment (via User model)
      (async () => {
        const teacherRecords = await db.teacher.findMany({
          where: { instituteId },
          select: { id: true, userId: true },
        });
        const userIds = teacherRecords.map((t) => t.userId).filter(Boolean);
        const teacherUserMap = new Map(teacherRecords.map((t) => [t.userId, t.id]));
        const users = userIds.length > 0
          ? await db.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, firstName: true, lastName: true },
            })
          : [];
        return users.map((u) => ({
          id: teacherUserMap.get(u.id),
          firstName: u.firstName,
          lastName: u.lastName,
        }));
      })(),
    ]);

    // Build lookup maps
    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    // Get subjects for batch enrichment
    const subjectIds = [...new Set(batches.map((b) => b.subjectId).filter(Boolean))];
    const subjects = subjectIds.length > 0
      ? await db.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, color: true },
        })
      : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    // Enrich sessions
    const enrichSession = (s: any) => {
      const batch = batchMap.get(s.batchId);
      const teacher = teacherMap.get(s.teacherId || "");
      const subject = batch ? subjectMap.get(batch.subjectId) : null;
      return {
        ...s,
        batch: batch ? { name: batch.name, subject } : null,
        teacher: teacher || null,
      };
    };

    const enrichedTodayClasses = todayClasses.map(enrichSession);
    const enrichedUpcomingSessions = upcomingSessions.map(enrichSession);

    // Calculate attendance rate
    const totalAttendance = recentAttendance.reduce(
      (sum, r) => sum + r._count.status,
      0
    );
    const presentCount =
      recentAttendance.find((r) => r.status === "present")?._count.status || 0;
    const attendanceRate =
      totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    return NextResponse.json({
      stats: {
        totalStudents,
        totalBatches,
        activeBatches,
        totalTeachers,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        attendanceRate,
        unpaidDues: {
          count: unpaidDues._count,
          totalAmount: unpaidDues._sum.amount || 0,
        },
      },
      todayClasses: enrichedTodayClasses,
      upcomingSessions: enrichedUpcomingSessions,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}