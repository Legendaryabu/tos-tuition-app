import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const batchId = searchParams.get("batchId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };

    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.sessionDate = {};
      if (dateFrom) where.sessionDate.gte = new Date(dateFrom);
      if (dateTo) where.sessionDate.lte = new Date(dateTo);
    }

    const [sessions, total] = await Promise.all([
      db.classSession.findMany({
        where,
        orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.classSession.count({ where }),
    ]);

    // Enrich with batch, teacher, hall data
    const batchIds = [...new Set(sessions.map((s) => s.batchId).filter(Boolean))];
    const teacherIds = [...new Set(sessions.map((s) => s.teacherId).filter(Boolean))];
    const hallIds = [...new Set(sessions.map((s) => s.hallId).filter(Boolean))];

    const [batches, teachers, halls, attendanceCounts] = await Promise.all([
      batchIds.length > 0
        ? db.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, name: true, classType: true, subjectId: true } })
        : [],
      teacherIds.length > 0
        ? db.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, firstName: true, lastName: true } })
        : [],
      hallIds.length > 0
        ? db.hall.findMany({ where: { id: { in: hallIds } }, select: { id: true, name: true } })
        : [],
      sessions.length > 0
        ? db.attendanceRecord.groupBy({
            by: ["classSessionId"],
            where: { classSessionId: { in: sessions.map((s) => s.id) } },
            _count: { classSessionId: true },
          })
        : [],
    ]);

    const subjectIds = [...new Set(batches.map((b) => b.subjectId).filter(Boolean))];
    const subjects =
      subjectIds.length > 0
        ? db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, color: true } })
        : Promise.resolve([]);

    const resolvedSubjects = await subjects;
    const subjectMap = new Map(resolvedSubjects.map((s) => [s.id, s]));
    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const hallMap = new Map(halls.map((h) => [h.id, h]));
    const attendanceMap = new Map(attendanceCounts.map((a) => [a.classSessionId, a._count.classSessionId]));

    const enrichedSessions = sessions.map((s) => {
      const batch = batchMap.get(s.batchId);
      const subject = batch ? subjectMap.get(batch.subjectId) : null;
      return {
        ...s,
        batch: batch ? { ...batch, subject } : null,
        teacher: s.teacherId ? teacherMap.get(s.teacherId) || null : null,
        hall: s.hallId ? hallMap.get(s.hallId) || null : null,
        _count: { attendanceRecords: attendanceMap.get(s.id) || 0 },
      };
    });

    return NextResponse.json({
      sessions: enrichedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Sessions list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      branchId,
      batchId,
      teacherId,
      hallId,
      sessionDate,
      startTime,
      endTime,
      durationMinutes,
      isOnline,
      onlinePlatform,
      onlineMeetingUrl,
      onlineMeetingId,
      onlinePasscode,
      topic,
      description,
      homework,
      isExtraClass,
      isFeeApplicable,
      extraClassFee,
      createdBy,
    } = body;

    if (!instituteId || !batchId || !sessionDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await db.classSession.create({
      data: {
        instituteId,
        branchId: branchId || null,
        batchId,
        teacherId: teacherId || null,
        hallId: hallId || null,
        sessionDate: new Date(sessionDate),
        startTime,
        endTime,
        durationMinutes,
        isOnline: isOnline || false,
        onlinePlatform,
        onlineMeetingUrl,
        onlineMeetingId,
        onlinePasscode,
        topic,
        description,
        homework,
        status: "scheduled",
        isExtraClass: isExtraClass || false,
        isFeeApplicable: isFeeApplicable || false,
        extraClassFee,
        createdBy: createdBy || "",
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error: any) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}