import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({ where: { id } });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      user,
      branch,
      batchEnrollments,
      feeDues,
      attendanceRecords,
      payments,
      examResults,
      timelines,
      notes,
      batchStudentCount,
      attendanceCount,
      paymentCount,
    ] = await Promise.all([
      student.userId
        ? db.user.findFirst({
            where: { id: student.userId },
            select: { email: true, profilePhoto: true, mobile: true, whatsapp: true },
          })
        : null,
      student.branchId
        ? db.branch.findFirst({
            where: { id: student.branchId },
            select: { name: true, city: true, district: true },
          })
        : null,
      db.batchStudent.findMany({
        where: { studentId: id, status: "active" },
      }),
      db.feeDue.findMany({
        where: { studentId: id, status: "unpaid" },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      db.attendanceRecord.findMany({
        where: { studentId: id },
        take: 20,
        orderBy: { markedAt: "desc" },
      }),
      db.payment.findMany({
        where: { studentId: id },
        take: 10,
        orderBy: { recordedAt: "desc" },
        select: {
          id: true, amount: true, paymentMethod: true, recordedAt: true, status: true, currency: true,
        },
      }),
      db.examResult.findMany({
        where: { studentId: id },
        orderBy: { enteredAt: "desc" },
        take: 10,
      }),
      db.studentTimeline.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.studentNote.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.batchStudent.count({ where: { studentId: id } }),
      db.attendanceRecord.count({ where: { studentId: id } }),
      db.payment.count({ where: { studentId: id } }),
    ]);

    // Enrich batch enrollments with batch + subject + teacher data
    const batchIds = batchEnrollments.map((e) => e.batchId);
    const [batches, subjects] = await Promise.all([
      batchIds.length > 0
        ? db.batch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, name: true, subjectId: true, teacherId: true },
          })
        : [],
      batchIds.length > 0
        ? (() => {
            const subjectIds = batchEnrollments
              .map((e) => {
                const b = batchEnrollments.find((be) => be.batchId === e.batchId);
                return b?.batchId;
              })
              .filter(Boolean);
            return db.batch
              .findMany({ where: { id: { in: subjectIds } }, select: { subjectId: true } })
              .then((bs) => {
                const sIds = [...new Set(bs.map((b) => b.subjectId).filter(Boolean))];
                return sIds.length > 0
                  ? db.subject.findMany({
                      where: { id: { in: sIds } },
                      select: { id: true, name: true, code: true, color: true },
                    })
                  : [];
              });
          })()
        : Promise.resolve([]),
    ]);

    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    // Get teachers for batches
    const teacherIds = [...new Set(batches.map((b) => b.teacherId).filter(Boolean))];
    let teachers: Array<{ id: string; firstName: string; lastName: string }> = [];
    if (teacherIds.length > 0) {
      const tRecords = await db.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, userId: true },
      });
      const tUserIds = tRecords.map((t) => t.userId).filter(Boolean);
      const tUsers = tUserIds.length > 0
        ? await db.user.findMany({ where: { id: { in: tUserIds } }, select: { id: true, firstName: true, lastName: true } })
        : [];
      const tUserMap = new Map(tUsers.map((u) => [u.id, u]));
      const tRecordMap = new Map(tRecords.map((t) => [t.id, t.userId]));
      teachers = tRecords.map((t) => ({
        id: t.id,
        firstName: t.userId ? tUserMap.get(t.userId)?.firstName || "" : "",
        lastName: t.userId ? tUserMap.get(t.userId)?.lastName || "" : "",
      }));
    }
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    const activeBatches = batchEnrollments
      .map((e) => {
        const batch = batchMap.get(e.batchId);
        if (!batch) return null;
        const subject = subjectMap.get(batch.subjectId);
        const teacher = batch.teacherId ? teacherMap.get(batch.teacherId) : null;
        return { ...batch, subject, teacher };
      })
      .filter(Boolean);

    // Enrich attendance records with session data
    const sessionIds = [...new Set(attendanceRecords.map((r) => r.classSessionId).filter(Boolean))];
    const sessions =
      sessionIds.length > 0
        ? await db.classSession.findMany({
            where: { id: { in: sessionIds } },
            select: { id: true, sessionDate: true, topic: true, status: true },
          })
        : [];
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const enrichedAttendance = attendanceRecords.map((r) => ({
      ...r,
      classSession: sessionMap.get(r.classSessionId) || null,
    }));

    // Enrich exam results with exam data
    const examIds = [...new Set(examResults.map((r) => r.examId).filter(Boolean))];
    const exams =
      examIds.length > 0
        ? await db.exam.findMany({
            where: { id: { in: examIds } },
            select: { id: true, name: true, type: true, totalMarks: true, examDate: true },
          })
        : [];
    const examMap = new Map(exams.map((e) => [e.id, e]));

    const enrichedExamResults = examResults.map((r) => ({
      ...r,
      exam: examMap.get(r.examId) || null,
    }));

    // Calculate attendance rate
    const totalRecords = enrichedAttendance.length;
    const presentRecords = enrichedAttendance.filter((r) => r.status === "present").length;
    const attendanceRate =
      totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : null;

    // Calculate total outstanding
    const outstandingBalance = feeDues.reduce(
      (sum, due) => sum + (due.amount - due.amountPaid - due.waivedAmount),
      0
    );

    return NextResponse.json({
      ...student,
      user,
      branch,
      feeDues,
      attendanceRecords: enrichedAttendance,
      payments,
      examResults: enrichedExamResults,
      timelines,
      notes,
      _count: {
        batches: batchStudentCount,
        attendanceRecords: attendanceCount,
        payments: paymentCount,
      },
      attendanceRate,
      outstandingBalance,
      activeBatches,
    });
  } catch (error: any) {
    console.error("Student detail error:", error);
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
    const { status, grade, district, schoolName, mobile, email, stream, examYear } = body;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (grade !== undefined) updateData.grade = grade;
    if (district !== undefined) updateData.district = district;
    if (schoolName !== undefined) updateData.schoolName = schoolName;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (email !== undefined) updateData.email = email;
    if (stream !== undefined) updateData.stream = stream;
    if (examYear !== undefined) updateData.examYear = examYear ? parseInt(examYear) : null;

    const updated = await db.student.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Student update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}