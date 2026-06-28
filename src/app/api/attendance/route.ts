import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const classSessionId = searchParams.get("classSessionId");
    const batchId = searchParams.get("batchId");
    const studentId = searchParams.get("studentId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };

    if (classSessionId) where.classSessionId = classSessionId;
    if (batchId) where.batchId = batchId;
    if (studentId) where.studentId = studentId;
    if (dateFrom || dateTo) {
      where.markedAt = {};
      if (dateFrom) where.markedAt.gte = new Date(dateFrom);
      if (dateTo) where.markedAt.lte = new Date(dateTo);
    }

    const [records, total] = await Promise.all([
      db.attendanceRecord.findMany({
        where,
        orderBy: { markedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.attendanceRecord.count({ where }),
    ]);

    // Summary stats
    const summary = await db.attendanceRecord.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    // Enrich records with student and session data
    const studentIds = [...new Set(records.map((r) => r.studentId).filter(Boolean))];
    const sessionIds = [...new Set(records.map((r) => r.classSessionId).filter(Boolean))];

    const [students, sessions, batches] = await Promise.all([
      studentIds.length > 0
        ? db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true, studentNumber: true, gender: true },
          })
        : [],
      sessionIds.length > 0
        ? db.classSession.findMany({
            where: { id: { in: sessionIds } },
            select: { id: true, sessionDate: true, startTime: true, topic: true, batchId: true },
          })
        : [],
      sessions.length > 0
        ? db.batch.findMany({
            where: { id: { in: [...new Set(sessions.map((s) => s.batchId).filter(Boolean))] } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const batchMap = new Map(batches.map((b) => [b.id, b]));

    const enrichedRecords = records.map((r) => {
      const session = sessionMap.get(r.classSessionId);
      const batch = session ? batchMap.get(session.batchId) : null;
      return {
        ...r,
        student: studentMap.get(r.studentId) || null,
        classSession: session ? { ...session, batch } : null,
      };
    });

    const totalRecords = summary.reduce((sum, s) => sum + s._count.status, 0);
    const presentCount = summary.find((s) => s.status === "present")?._count.status || 0;
    const absentCount = summary.find((s) => s.status === "absent")?._count.status || 0;
    const lateCount = summary.find((s) => s.status === "late")?._count.status || 0;

    return NextResponse.json({
      records: enrichedRecords,
      summary: {
        total: totalRecords,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        rate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Attendance list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classSessionId, instituteId, batchId, records, markedBy } = body;

    if (!classSessionId || !instituteId || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const results = [];

    for (const record of records) {
      const { studentId, status, excuseReason, notes, checkInTime } = record;

      const existing = await db.attendanceRecord.findUnique({
        where: {
          classSessionId_studentId: {
            classSessionId,
            studentId,
          },
        },
      });

      if (existing) {
        const updated = await db.attendanceRecord.update({
          where: { id: existing.id },
          data: { status, excuseReason, notes, checkInTime, markedBy, markedAt: new Date() },
        });
        results.push(updated);
      } else {
        const created = await db.attendanceRecord.create({
          data: {
            classSessionId,
            studentId,
            batchId: batchId || "",
            instituteId,
            status,
            excuseReason,
            notes,
            checkInTime,
            markedBy,
          },
        });
        results.push(created);
      }
    }

    // Update session status if all records marked
    if (batchId) {
      const batchStudents = await db.batchStudent.findMany({
        where: { batchId, status: "active" },
        select: { studentId: true },
      });
      const markedCount = results.length;
      if (markedCount >= batchStudents.length) {
        await db.classSession.update({
          where: { id: classSessionId },
          data: { status: "completed", actualEndedAt: new Date() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      saved: results.length,
      records: results,
    });
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}