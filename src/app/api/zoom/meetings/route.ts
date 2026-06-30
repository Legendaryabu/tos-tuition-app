import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const batchId = searchParams.get("batchId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId, tbosCreated: true };

    if (batchId) where.batchId = batchId;
    if (status) where.status = status;

    const [meetings, total] = await Promise.all([
      db.zoomMeeting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.zoomMeeting.count({ where }),
    ]);

    // Enrich with batch, teacher, session data
    const batchIds = [...new Set(meetings.map((m) => m.batchId).filter(Boolean))];
    const teacherIds = [...new Set(meetings.map((m) => m.teacherId).filter(Boolean))];
    const sessionIds = [...new Set(meetings.map((m) => m.classSessionId).filter(Boolean))];

    const [batches, teachers, sessions, subjects] = await Promise.all([
      batchIds.length > 0
        ? db.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, name: true, subjectId: true } })
        : [],
      teacherIds.length > 0
        ? db.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, firstName: true, lastName: true } })
        : [],
      sessionIds.length > 0
        ? db.classSession.findMany({ where: { id: { in: sessionIds } }, select: { id: true, sessionDate: true, topic: true } })
        : [],
      db.subject.findMany({ select: { id: true, name: true, color: true } }),
    ]);

    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const enrichedMeetings = meetings.map((m) => {
      const batch = m.batchId ? batchMap.get(m.batchId) : null;
      const subject = batch ? subjectMap.get(batch.subjectId) : null;
      return {
        ...m,
        batch: batch ? { ...batch, subject } : null,
        teacher: m.teacherId ? teacherMap.get(m.teacherId) || null : null,
        classSession: m.classSessionId ? sessionMap.get(m.classSessionId) || null : null,
      };
    });

    return NextResponse.json({
      meetings: enrichedMeetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Zoom meetings list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      batchId,
      classSessionId,
      teacherId,
      topic,
      hostEmail,
      joinUrl,
      startUrl,
      passcode,
      zoomMeetingId,
      durationMinutes,
      startTime,
      status,
    } = body;

    if (!instituteId || !topic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const meeting = await db.zoomMeeting.create({
      data: {
        instituteId,
        batchId: batchId || null,
        classSessionId: classSessionId || null,
        teacherId: teacherId || null,
        zoomMeetingId: zoomMeetingId || `zm_${Date.now()}`,
        topic,
        hostEmail,
        joinUrl,
        startUrl,
        passcode,
        status: status || "scheduled",
        startTime: startTime ? new Date(startTime) : null,
        durationMinutes: durationMinutes || 60,
      },
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error: any) {
    console.error("Create zoom meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}