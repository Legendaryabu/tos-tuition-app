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

    // Only fetch halls that are actually used by sessions/slots
    const hallIds = [
      ...new Set([
        ...sessions.map((s) => s.hallId).filter(Boolean) as string[],
        ...timetableSlots.map((s) => s.hallId).filter(Boolean) as string[],
      ]),
    ];
    const halls = hallIds.length > 0
      ? await db.hall.findMany({ where: { id: { in: hallIds } }, select: { id: true, name: true, capacity: true } })
      : [];

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await db.batch.findUnique({ where: { id } });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      gradeLevel,
      academicYear,
      medium,
      classType,
      maxStudents,
      monthlyFee,
      registrationFee,
      daysOfWeek,
      startTime,
      endTime,
      typicalDurationMin,
      onlinePlatform,
      onlineMeetingUrl,
      onlineMeetingId,
      onlinePasscode,
      whatsappGroupLink,
      status,
      isVisibleToStudents,
      isEnrollmentOpen,
      notes,
      subjectId,
      teacherId,
      branchId,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code || null;
    if (description !== undefined) updateData.description = description || null;
    if (gradeLevel !== undefined) updateData.gradeLevel = gradeLevel || null;
    if (academicYear !== undefined) updateData.academicYear = academicYear || null;
    if (medium !== undefined) updateData.medium = medium;
    if (classType !== undefined) updateData.classType = classType;
    if (maxStudents !== undefined) updateData.maxStudents = maxStudents || null;
    if (monthlyFee !== undefined) updateData.monthlyFee = monthlyFee || null;
    if (registrationFee !== undefined) updateData.registrationFee = registrationFee || 0;
    if (daysOfWeek !== undefined) updateData.daysOfWeek = JSON.stringify(daysOfWeek || []);
    if (startTime !== undefined) updateData.startTime = startTime || null;
    if (endTime !== undefined) updateData.endTime = endTime || null;
    if (typicalDurationMin !== undefined) updateData.typicalDurationMin = typicalDurationMin || null;
    if (onlinePlatform !== undefined) updateData.onlinePlatform = onlinePlatform || null;
    if (onlineMeetingUrl !== undefined) updateData.onlineMeetingUrl = onlineMeetingUrl || null;
    if (onlineMeetingId !== undefined) updateData.onlineMeetingId = onlineMeetingId || null;
    if (onlinePasscode !== undefined) updateData.onlinePasscode = onlinePasscode || null;
    if (whatsappGroupLink !== undefined) updateData.whatsappGroupLink = whatsappGroupLink || null;
    if (status !== undefined) updateData.status = status;
    if (isVisibleToStudents !== undefined) updateData.isVisibleToStudents = isVisibleToStudents;
    if (isEnrollmentOpen !== undefined) updateData.isEnrollmentOpen = isEnrollmentOpen;
    if (notes !== undefined) updateData.notes = notes || null;
    if (subjectId !== undefined) updateData.subjectId = subjectId;
    if (teacherId !== undefined) updateData.teacherId = teacherId || null;
    if (branchId !== undefined) updateData.branchId = branchId || null;

    const updatedBatch = await db.batch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedBatch);
  } catch (error: any) {
    console.error("Batch update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await db.batch.findUnique({ where: { id } });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Soft delete: archive the batch
    const updatedBatch = await db.batch.update({
      where: { id },
      data: { status: "archived" },
    });

    // Deactivate all active BatchStudent records
    await db.batchStudent.updateMany({
      where: { batchId: id, status: "active" },
      data: { status: "inactive" },
    });

    // Update currentStudents count to 0
    await db.batch.update({
      where: { id },
      data: { currentStudents: 0 },
    });

    return NextResponse.json(updatedBatch);
  } catch (error: any) {
    console.error("Batch delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}