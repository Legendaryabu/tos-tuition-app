import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const batch = await db.batch.findUnique({ where: { id } });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Get teacher's userId first
    let teacherUserId: string | null = null;
    if (batch.teacherId) {
      const t = await db.teacher.findUnique({ where: { id: batch.teacherId }, select: { userId: true } });
      teacherUserId = t?.userId || null;
    }

    // Fetch all related data in parallel
    const [
      subject,
      teacher,
      teacherUser,
      branch,
      enrollments,
      sessions,
      timetableSlots,
      halls,
      feeStructures,
      exams,
      examSubjects,
      studentCount,
      sessionCount,
    ] = await Promise.all([
      batch.subjectId ? db.subject.findUnique({ where: { id: batch.subjectId } }) : null,
      batch.teacherId ? db.teacher.findUnique({ where: { id: batch.teacherId } }) : null,
      teacherUserId
        ? db.user.findFirst({
            where: { id: teacherUserId },
            select: { mobile: true, email: true, firstName: true, lastName: true },
          })
        : null,
      batch.branchId ? db.branch.findUnique({ where: { id: batch.branchId } }) : null,
      db.batchStudent.findMany({
        where: { batchId: id, status: "active" },
        orderBy: { enrolledAt: "asc" },
      }),
      db.classSession.findMany({
        where: { batchId: id },
        take: 20,
        orderBy: { sessionDate: "desc" },
      }),
      db.timetableSlot.findMany({
        where: { batchId: id, isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      db.hall.findMany({
        select: { id: true, name: true, capacity: true },
      }),
      db.feeStructure.findMany({
        where: { batchId: id, isActive: true },
      }),
      db.exam.findMany({
        where: { batchId: id },
        orderBy: { examDate: "desc" },
        take: 10,
        select: { id: true, name: true, type: true, totalMarks: true, passMarks: true, examDate: true, status: true, isResultsPublished: true, subjectId: true },
      }),
      db.subject.findMany({ select: { id: true, name: true } }),
      db.batchStudent.count({ where: { batchId: id, status: "active" } }),
      db.classSession.count({ where: { batchId: id } }),
    ]);

    // Enrich sessions with teacher and hall
    const sessionTeacherIds = [...new Set(sessions.map((s) => s.teacherId).filter(Boolean))];
    const sessionTeachers = await (async () => {
      if (sessionTeacherIds.length === 0) return [];
      const tRecords = await db.teacher.findMany({ where: { id: { in: sessionTeacherIds } }, select: { id: true, userId: true } });
      const uIds = tRecords.map((t) => t.userId).filter(Boolean);
      const users = uIds.length > 0
        ? await db.user.findMany({ where: { id: { in: uIds } }, select: { id: true, firstName: true, lastName: true } })
        : [];
      const tMap = new Map(tRecords.map((t) => [t.userId, t.id]));
      return users.map((u) => ({ id: tMap.get(u.id), firstName: u.firstName, lastName: u.lastName }));
    })();

    const hallMap = new Map(halls.map((h) => [h.id, h]));
    const sessionTeacherMap = new Map(sessionTeachers.map((t) => [t.id, t]));
    const examSubjectMap = new Map(examSubjects.map((s) => [s.id, s]));

    const enrichedSessions = sessions.map((s) => ({
      ...s,
      teacher: s.teacherId ? sessionTeacherMap.get(s.teacherId) || null : null,
      hall: s.hallId ? hallMap.get(s.hallId) || null : null,
    }));

    // Enrich timetable slots
    const slotTeacherIds = [...new Set(timetableSlots.map((s) => s.teacherId).filter(Boolean))];
    const slotTeachers = await (async () => {
      if (slotTeacherIds.length === 0) return [];
      const tRecords = await db.teacher.findMany({ where: { id: { in: slotTeacherIds } }, select: { id: true, userId: true } });
      const uIds = tRecords.map((t) => t.userId).filter(Boolean);
      const users = uIds.length > 0
        ? await db.user.findMany({ where: { id: { in: uIds } }, select: { id: true, firstName: true, lastName: true } })
        : [];
      const tMap = new Map(tRecords.map((t) => [t.userId, t.id]));
      return users.map((u) => ({ id: tMap.get(u.id), firstName: u.firstName, lastName: u.lastName }));
    })();

    const slotTeacherMap = new Map(slotTeachers.map((t) => [t.id, t]));

    const enrichedSlots = timetableSlots.map((s) => ({
      ...s,
      hall: s.hallId ? hallMap.get(s.hallId) || null : null,
      teacher: s.teacherId ? slotTeacherMap.get(s.teacherId) || null : null,
    }));

    // Enrich exams
    const enrichedExams = exams.map((e) => ({
      ...e,
      subject: e.subjectId ? examSubjectMap.get(e.subjectId) || null : null,
    }));

    // Enroll students
    const studentIds = enrollments.map((e) => e.studentId);
    const students =
      studentIds.length > 0
        ? await db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true, studentNumber: true, mobile: true, status: true, schoolName: true },
          })
        : [];

    return NextResponse.json({
      ...batch,
      subject,
      teacher: teacher ? { ...teacher, user: teacherUser } : null,
      branch,
      enrolledStudents: students,
      sessions: enrichedSessions,
      timetableSlots: enrichedSlots,
      feeStructures,
      exams: enrichedExams,
      _count: { students: studentCount, sessions: sessionCount },
    });
  } catch (error: any) {
    console.error("Batch detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}