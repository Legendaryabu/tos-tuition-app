import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.classSession.findUnique({ where: { id } });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      batch,
      teacher,
      hall,
      branch,
      zoomMeeting,
      attendanceRecords,
      timetableSlot,
    ] = await Promise.all([
      session.batchId ? db.batch.findUnique({ where: { id: session.batchId } }) : null,
      session.teacherId
        ? db.teacher.findUnique({
            where: { id: session.teacherId },
            select: { id: true, firstName: true, lastName: true, profilePhoto: true },
          })
        : null,
      session.hallId
        ? db.hall.findUnique({ where: { id: session.hallId }, select: { name: true, capacity: true } })
        : null,
      session.branchId
        ? db.branch.findUnique({ where: { id: session.branchId }, select: { name: true } })
        : null,
      db.zoomMeeting.findFirst({ where: { classSessionId: id } }),
      db.attendanceRecord.findMany({ where: { classSessionId: id } }),
      session.timetableSlotId
        ? db.timetableSlot.findUnique({ where: { id: session.timetableSlotId } })
        : null,
    ]);

    // Get subject for the batch
    const subject = batch?.subjectId
      ? await db.subject.findUnique({ where: { id: batch.subjectId } })
      : null;

    // Get batch students for attendance marking
    const batchStudents = await db.batchStudent.findMany({
      where: { batchId: session.batchId, status: "active" },
      select: { studentId: true },
    });

    const studentIds = batchStudents.map((bs) => bs.studentId);
    const students =
      studentIds.length > 0
        ? await db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true, studentNumber: true, gender: true },
            orderBy: { fullName: "asc" },
          })
        : [];

    // Enrich attendance with student names
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const enrichedAttendance = attendanceRecords.map((r) => ({
      ...r,
      student: studentMap.get(r.studentId) || null,
    }));

    return NextResponse.json({
      ...session,
      batch: batch ? { ...batch, subject } : null,
      teacher,
      hall,
      branch,
      zoomMeeting,
      attendanceRecords: enrichedAttendance,
      timetableSlot,
      batchStudents: students,
    });
  } catch (error: any) {
    console.error("Session detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, topic, description, homework, startTime, endTime } = body;

    const existing = await db.classSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (status === "completed") {
      updateData.actualEndedAt = new Date();
      if (!existing.actualStartedAt) {
        updateData.actualStartedAt = new Date();
      }
    }
    if (status === "in_progress") {
      updateData.actualStartedAt = new Date();
    }
    if (topic !== undefined) updateData.topic = topic;
    if (description !== undefined) updateData.description = description;
    if (homework !== undefined) updateData.homework = homework;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;

    const session = await db.classSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Update session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}