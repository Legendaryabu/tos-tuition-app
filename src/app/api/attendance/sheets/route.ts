import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/attendance/sheet?classSessionId=xxx — Get full attendance sheet for a session
// Returns all enrolled students with their attendance status (or null if not yet marked)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classSessionId = searchParams.get("classSessionId");

    if (!classSessionId) {
      return NextResponse.json(
        { error: "classSessionId is required" },
        { status: 400 }
      );
    }

    // Get session info
    const session = await db.classSession.findUnique({
      where: { id: classSessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get batch info with subject
    const batch = session.batchId
      ? await db.batch.findUnique({
          where: { id: session.batchId },
          select: { id: true, name: true, subjectId: true },
        })
      : null;

    const subject = batch?.subjectId
      ? await db.subject.findUnique({
          where: { id: batch.subjectId },
          select: { id: true, name: true, code: true },
        })
      : null;

    // Get enrolled students for this batch
    const enrollments = session.batchId
      ? await db.batchStudent.findMany({
          where: { batchId: session.batchId, status: "active" },
          orderBy: { enrolledAt: "asc" },
        })
      : [];

    const studentIds = enrollments.map((e) => e.studentId);

    // Get student details
    const students =
      studentIds.length > 0
        ? await db.student.findMany({
            where: { id: { in: studentIds } },
            select: {
              id: true,
              fullName: true,
              studentNumber: true,
              gender: true,
              mobile: true,
              status: true,
            },
          })
        : [];

    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Get existing attendance records for this session
    const existingRecords = await db.attendanceRecord.findMany({
      where: { classSessionId },
    });
    const recordMap = new Map(
      existingRecords.map((r) => [r.studentId, r])
    );

    // Build the attendance sheet
    const sheet = enrollments.map((enrollment) => {
      const student = studentMap.get(enrollment.studentId);
      const record = recordMap.get(enrollment.studentId);

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        student: student || null,
        attendanceRecord: record || null,
        status: record?.status || null,
        isMarked: !!record,
        notes: record?.notes || null,
        excuseReason: record?.excuseReason || null,
        checkInTime: record?.checkInTime || null,
      };
    });

    // Summary
    const markedCount = existingRecords.length;
    const totalCount = enrollments.length;
    const presentCount = existingRecords.filter(
      (r) => r.status === "present"
    ).length;
    const absentCount = existingRecords.filter(
      (r) => r.status === "absent"
    ).length;
    const lateCount = existingRecords.filter(
      (r) => r.status === "late"
    ).length;

    // Get teacher info
    let teacher = null;
    if (session.teacherId) {
      const teacherRecord = await db.teacher.findUnique({
        where: { id: session.teacherId },
        select: { userId: true },
      });
      if (teacherRecord?.userId) {
        const teacherUser = await db.user.findFirst({
          where: { id: teacherRecord.userId },
          select: { firstName: true, lastName: true },
        });
        if (teacherUser) {
          teacher = { id: session.teacherId, ...teacherUser };
        }
      }
    }

    return NextResponse.json({
      session: {
        ...session,
        batch: batch ? { ...batch, subject } : null,
        teacher,
      },
      sheet,
      summary: {
        total: totalCount,
        marked: markedCount,
        unmarked: totalCount - markedCount,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        isComplete: markedCount >= totalCount && totalCount > 0,
      },
    });
  } catch (error: any) {
    console.error("Attendance sheet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}