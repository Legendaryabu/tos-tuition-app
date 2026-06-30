import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const batchId = searchParams.get("batchId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!instituteId || !batchId) {
      return NextResponse.json(
        { error: "instituteId and batchId are required" },
        { status: 400 }
      );
    }

    // Fetch batch
    const batch = await db.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Fetch subject separately (subjectId is not a Prisma relation)
    const subject = batch.subjectId
      ? await db.subject.findUnique({ where: { id: batch.subjectId }, select: { name: true, code: true } })
      : null;

    // Fetch active students in the batch
    const batchStudents = await db.batchStudent.findMany({
      where: { batchId, status: "active" },
      orderBy: { enrolledAt: "asc" },
      select: { studentId: true },
    });

    const studentIds = batchStudents.map((bs) => bs.studentId);
    const students =
      studentIds.length > 0
        ? await db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true, studentNumber: true },
            orderBy: { fullName: "asc" },
          })
        : [];

    // Build session date filter
    const sessionWhere: any = {
      instituteId,
      batchId,
      sessionDate: { lte: new Date() }, // only past/present sessions
    };
    if (dateFrom) sessionWhere.sessionDate.gte = new Date(dateFrom);
    if (dateTo) sessionWhere.sessionDate.lte = new Date(dateTo);

    // Fetch sessions ordered by date desc
    const sessions = await db.classSession.findMany({
      where: sessionWhere,
      orderBy: { sessionDate: "desc" },
      select: {
        id: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        topic: true,
        isExtraClass: true,
        status: true,
      },
    });

    const sessionIds = sessions.map((s) => s.id);

    // Fetch all attendance records for these sessions
    let records: any[] = [];
    if (sessionIds.length > 0) {
      records = await db.attendanceRecord.findMany({
        where: {
          classSessionId: { in: sessionIds },
          instituteId,
        },
        select: {
          id: true,
          classSessionId: true,
          studentId: true,
          status: true,
          checkInTime: true,
          excuseReason: true,
          notes: true,
          markedAt: true,
        },
      });
    }

    // Build a lookup map: studentId_sessionId -> record
    const recordMap = new Map<string, any>();
    for (const r of records) {
      recordMap.set(`${r.studentId}_${r.classSessionId}`, r);
    }

    // Build student summary (per-student attendance rate)
    const studentSummary: Record<
      string,
      { total: number; present: number; absent: number; late: number; excused: number; rate: number }
    > = {};
    for (const s of students) {
      studentSummary[s.id] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        rate: 0,
      };
    }

    for (const r of records) {
      const summary = studentSummary[r.studentId];
      if (!summary) continue;
      summary.total++;
      if (r.status === "present") summary.present++;
      else if (r.status === "absent") summary.absent++;
      else if (r.status === "late") summary.late++;
      else if (r.status === "excused") summary.excused++;
    }

    // Calculate rates
    for (const sId of Object.keys(studentSummary)) {
      const s = studentSummary[sId];
      if (s.total > 0) {
        s.rate = Math.round(((s.present + s.late) / s.total) * 100);
      }
    }

    // Build session summary (per-session attendance rate)
    const sessionSummary: Record<
      string,
      { total: number; present: number; absent: number; late: number; excused: number; unmarked: number; rate: number }
    > = {};
    for (const session of sessions) {
      sessionSummary[session.id] = {
        total: students.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        unmarked: students.length,
        rate: 0,
      };
    }

    for (const r of records) {
      const summary = sessionSummary[r.classSessionId];
      if (!summary) continue;
      summary.unmarked--;
      if (r.status === "present") summary.present++;
      else if (r.status === "absent") summary.absent++;
      else if (r.status === "late") summary.late++;
      else if (r.status === "excused") summary.excused++;
    }

    for (const sId of Object.keys(sessionSummary)) {
      const s = sessionSummary[sId];
      const marked = s.total - s.unmarked;
      if (marked > 0) {
        s.rate = Math.round(((s.present + s.late) / marked) * 100);
      }
    }

    // Overall batch attendance rate
    const totalPresent = Object.values(studentSummary).reduce(
      (sum, s) => sum + s.present + s.late,
      0
    );
    const totalRecords = Object.values(studentSummary).reduce(
      (sum, s) => sum + s.total,
      0
    );
    const overallRate =
      totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : null;

    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name,
        subject,
        classType: batch.classType,
      },
      students,
      sessions,
      recordMap: Object.fromEntries(recordMap),
      studentSummary,
      sessionSummary,
      overallRate,
      totalSessions: sessions.length,
      totalStudents: students.length,
    });
  } catch (error: any) {
    console.error("Attendance sheet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
