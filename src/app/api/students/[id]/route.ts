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
        take: 20,
      }),
      db.studentNote.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
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
            select: { id: true, name: true, subjectId: true, teacherId: true, classType: true, status: true },
          })
        : [],
      batchIds.length > 0
        ? (() => {
            const sIds = batchIds;
            return db.batch
              .findMany({ where: { id: { in: sIds } }, select: { subjectId: true } })
              .then((bs) => {
                const subjectIds = [...new Set(bs.map((b) => b.subjectId).filter(Boolean))];
                return subjectIds.length > 0
                  ? db.subject.findMany({
                      where: { id: { in: subjectIds } },
                      select: { id: true, name: true, code: true, color: true },
                    })
                  : [];
              });
          })()
        : Promise.resolve([]),
    ]);

    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    // Get teachers for batches (Teacher → User for firstName/lastName)
    const teacherIds = [...new Set(batches.map((b) => b.teacherId).filter(Boolean))];
    const teacherRecords =
      teacherIds.length > 0
        ? await db.teacher.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, userId: true },
          })
        : [];
    const teacherUserIds = teacherRecords.map((t) => t.userId).filter(Boolean);
    const teacherUsers =
      teacherUserIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: teacherUserIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const teacherUserMap = new Map(teacherUsers.map((u) => [u.id, u]));
    const teacherRecordMap = new Map(teacherRecords.map((t) => [t.id, t.userId]));
    const teacherMap = new Map(
      teacherRecords.map((t) => {
        const user = teacherUserMap.get(t.userId);
        return [t.id, user ? { id: t.id, firstName: user.firstName, lastName: user.lastName } : { id: t.id, firstName: '', lastName: '' }];
      })
    );

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
            select: { id: true, sessionDate: true, topic: true, status: true, batchId: true },
          })
        : [];
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    // Get batch names for attendance
    const attBatchIds = [...new Set(sessions.map((s) => s.batchId).filter(Boolean))];
    const attBatches = attBatchIds.length > 0
      ? await db.batch.findMany({ where: { id: { in: attBatchIds } }, select: { id: true, name: true } })
      : [];
    const attBatchMap = new Map(attBatches.map((b) => [b.id, b]));

    const enrichedAttendance = attendanceRecords.map((r) => {
      const session = sessionMap.get(r.classSessionId) || null;
      return {
        ...r,
        classSession: session ? { ...session, batchName: attBatchMap.get(session.batchId)?.name } : null,
      };
    });

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

    // Calculate attendance rate from ALL records, not just the 20 fetched
    const totalAttendanceRecords = await db.attendanceRecord.count({ where: { studentId: id } });
    const presentRecords = await db.attendanceRecord.count({ where: { studentId: id, status: "present" } });
    const attendanceRate =
      totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : null;

    // Calculate total outstanding from ALL unpaid fee dues
    const allUnpaidDues = await db.feeDue.findMany({
      where: { studentId: id, status: "unpaid" },
      select: { amount: true, amountPaid: true, waivedAmount: true },
    });
    const outstandingBalance = allUnpaidDues.reduce(
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
        attendanceRecords: totalAttendanceRecords,
        payments: paymentCount,
      },
      attendanceRate,
      attendanceStats: {
        total: totalAttendanceRecords,
        present: presentRecords,
        absent: await db.attendanceRecord.count({ where: { studentId: id, status: "absent" } }),
        late: await db.attendanceRecord.count({ where: { studentId: id, status: "late" } }),
      },
      outstandingBalance,
      activeBatches,
    });
  } catch (error: any) {
    console.error("Student detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      schoolName,
      grade,
      stream,
      examYear,
      mobile,
      whatsapp,
      email,
      addressLine1,
      city,
      district,
    } = body;

    // Build update data
    const updateData: any = {};
    if (firstName !== undefined || lastName !== undefined) {
      const newFirst = firstName !== undefined ? firstName : student.fullName.split(" ")[0];
      const newLast = lastName !== undefined ? lastName : student.fullName.split(" ").slice(1).join(" ") || "";
      updateData.fullName = `${newFirst} ${newLast}`.trim();
    }
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (schoolName !== undefined) updateData.schoolName = schoolName;
    if (grade !== undefined) updateData.grade = grade;
    if (stream !== undefined) updateData.stream = stream;
    if (examYear !== undefined) updateData.examYear = examYear;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (email !== undefined) updateData.email = email;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;

    // Update student record
    const updated = await db.student.update({
      where: { id },
      data: updateData,
    });

    // Update linked user record
    if (student.userId) {
      const userUpdate: any = {};
      if (firstName !== undefined) userUpdate.firstName = firstName;
      if (lastName !== undefined) userUpdate.lastName = lastName;
      if (email !== undefined) userUpdate.email = email;
      if (mobile !== undefined) userUpdate.mobile = mobile;
      if (whatsapp !== undefined) userUpdate.whatsapp = whatsapp;

      if (Object.keys(userUpdate).length > 0) {
        await db.user.update({
          where: { id: student.userId },
          data: userUpdate,
        });
      }
    }

    // Add timeline entry
    await db.studentTimeline.create({
      data: {
        studentId: id,
        instituteId: student.instituteId,
        type: "profile_update",
        description: "Student profile updated",
        meta: JSON.stringify(Object.keys(updateData)),
      },
    });

    return NextResponse.json({ student: updated });
  } catch (error: any) {
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status === "inactive") {
      return NextResponse.json({ error: "Student is already inactive" }, { status: 400 });
    }

    // Soft delete: change status to inactive
    const updated = await db.student.update({
      where: { id },
      data: { status: "inactive" },
    });

    // Deactivate linked user
    if (student.userId) {
      await db.user.update({
        where: { id: student.userId },
        data: { status: "inactive" },
      });
    }

    // Deactivate batch enrollments
    await db.batchStudent.updateMany({
      where: { studentId: id, status: "active" },
      data: { status: "inactive" },
    });

    // Update batch student counts
    const enrollments = await db.batchStudent.findMany({
      where: { studentId: id },
      select: { batchId: true },
    });
    for (const e of enrollments) {
      const count = await db.batchStudent.count({
        where: { batchId: e.batchId, status: "active" },
      });
      await db.batch.update({
        where: { id: e.batchId },
        data: { currentStudents: count },
      });
    }

    // Timeline entry
    await db.studentTimeline.create({
      data: {
        studentId: id,
        instituteId: student.instituteId,
        type: "deactivation",
        description: "Student deactivated",
      },
    });

    return NextResponse.json({ student: updated });
  } catch (error: any) {
    console.error("Deactivate student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}