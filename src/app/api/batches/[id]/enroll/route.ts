import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/batches/[id]/enroll — List enrolled students for a batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const batch = await db.batch.findUnique({
      where: { id },
      select: { id: true, instituteId: true, name: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const enrollments = await db.batchStudent.findMany({
      where: { batchId: id },
      orderBy: { enrolledAt: "desc" },
    });

    // Enrich with student data
    const studentIds = enrollments.map((e) => e.studentId);
    const students =
      studentIds.length > 0
        ? await db.student.findMany({
            where: { id: { in: studentIds } },
            select: {
              id: true,
              fullName: true,
              studentNumber: true,
              mobile: true,
              status: true,
              schoolName: true,
              grade: true,
            },
          })
        : [];

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const enrichedEnrollments = enrollments.map((e) => ({
      ...e,
      student: studentMap.get(e.studentId) || null,
    }));

    // Stats
    const activeCount = enrollments.filter((e) => e.status === "active").length;
    const inactiveCount = enrollments.filter((e) => e.status !== "active").length;

    return NextResponse.json({
      batch: { id: batch.id, name: batch.name },
      enrollments: enrichedEnrollments,
      _count: { active: activeCount, inactive: inactiveCount, total: enrollments.length },
    });
  } catch (error: any) {
    console.error("Batch enrollments list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/batches/[id]/enroll — Enroll students into a batch
// Body: { studentIds: string[], feeOverride?: number, notes?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { studentIds, feeOverride, notes } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "studentIds array is required" },
        { status: 400 }
      );
    }

    // Verify batch exists
    const batch = await db.batch.findUnique({
      where: { id },
      select: {
        id: true,
        instituteId: true,
        name: true,
        maxStudents: true,
        currentStudents: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Check max students limit
    if (batch.maxStudents) {
      const activeCount = await db.batchStudent.count({
        where: { batchId: id, status: "active" },
      });
      if (activeCount + studentIds.length > batch.maxStudents) {
        return NextResponse.json(
          {
            error: `Batch is full. Max ${batch.maxStudents} students. Already ${activeCount} enrolled.`,
          },
          { status: 400 }
        );
      }
    }

    // Verify all students belong to the same institute
    const students = await db.student.findMany({
      where: { id: { in: studentIds }, instituteId: batch.instituteId },
      select: { id: true },
    });
    const validStudentIds = students.map((s) => s.id);

    if (validStudentIds.length !== studentIds.length) {
      const invalidIds = studentIds.filter(
        (sid: string) => !validStudentIds.includes(sid)
      );
      return NextResponse.json(
        {
          error: `Some students not found or don't belong to this institute`,
          invalidIds,
        },
        { status: 400 }
      );
    }

    // Enroll each student (skip if already active)
    const results = [];
    for (const studentId of validStudentIds) {
      const existing = await db.batchStudent.findUnique({
        where: { batchId_studentId: { batchId: id, studentId } },
      });

      if (existing) {
        if (existing.status !== "active") {
          // Re-activate
          const updated = await db.batchStudent.update({
            where: { id: existing.id },
            data: { status: "active", feeOverride, notes, enrolledAt: new Date() },
          });
          results.push({ studentId, action: "reactivated", enrollment: updated });
        } else {
          results.push({ studentId, action: "already_enrolled" });
        }
      } else {
        const created = await db.batchStudent.create({
          data: {
            batchId: id,
            studentId,
            status: "active",
            feeOverride,
            notes,
          },
        });
        results.push({ studentId, action: "enrolled", enrollment: created });

        // Add timeline for student
        await db.studentTimeline.create({
          data: {
            studentId,
            instituteId: batch.instituteId,
            type: "batch_enrolled",
            description: `Enrolled in batch: ${batch.name}`,
          },
        });
      }
    }

    // Update batch currentStudents count
    const newActiveCount = await db.batchStudent.count({
      where: { batchId: id, status: "active" },
    });
    await db.batch.update({
      where: { id },
      data: { currentStudents: newActiveCount },
    });

    const enrolled = results.filter((r) => r.action === "enrolled").length;
    const reactivated = results.filter((r) => r.action === "reactivated").length;
    const skipped = results.filter((r) => r.action === "already_enrolled").length;

    return NextResponse.json({
      success: true,
      enrolled,
      reactivated,
      skipped,
      results,
    });
  } catch (error: any) {
    console.error("Batch enroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/batches/[id]/enroll?studentId=xxx — Remove a student from batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId query param is required" },
        { status: 400 }
      );
    }

    const existing = await db.batchStudent.findUnique({
      where: { batchId_studentId: { batchId: id, studentId } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Student is not enrolled in this batch" },
        { status: 404 }
      );
    }

    // Mark as inactive instead of deleting
    await db.batchStudent.update({
      where: { id: existing.id },
      data: { status: "withdrawn" },
    });

    // Update batch currentStudents count
    const newActiveCount = await db.batchStudent.count({
      where: { batchId: id, status: "active" },
    });
    await db.batch.update({
      where: { id },
      data: { currentStudents: newActiveCount },
    });

    // Add timeline
    const batch = await db.batch.findUnique({
      where: { id },
      select: { name: true, instituteId: true },
    });
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { instituteId: true },
    });

    if (batch && student) {
      await db.studentTimeline.create({
        data: {
          studentId,
          instituteId: student.instituteId,
          type: "batch_withdrawn",
          description: `Withdrawn from batch: ${batch.name}`,
        },
      });
    }

    return NextResponse.json({ success: true, action: "withdrawn" });
  } catch (error: any) {
    console.error("Batch unenroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}