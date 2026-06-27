import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const batch = await db.batch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Check student exists and is active
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (student.status !== "active") {
      return NextResponse.json({ error: "Student is not active" }, { status: 400 });
    }

    // Check if already enrolled (unique constraint: batchId + studentId)
    const existing = await db.batchStudent.findUnique({
      where: { batchId_studentId: { batchId: id, studentId } },
    });
    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json({ error: "Student is already enrolled in this batch" }, { status: 409 });
      }
      // Re-activate previously removed enrollment
      await db.batchStudent.update({
        where: { id: existing.id },
        data: { status: "active" },
      });
    } else {
      // Check maxStudents limit
      if (batch.maxStudents) {
        const currentCount = await db.batchStudent.count({
          where: { batchId: id, status: "active" },
        });
        if (currentCount >= batch.maxStudents) {
          return NextResponse.json(
            { error: `Batch is full (max ${batch.maxStudents} students)` },
            { status: 400 }
          );
        }
      }

      // Create BatchStudent record
      await db.batchStudent.create({
        data: { batchId: id, studentId },
      });
    }

    // Update batch.currentStudents count
    const activeCount = await db.batchStudent.count({
      where: { batchId: id, status: "active" },
    });
    await db.batch.update({
      where: { id },
      data: { currentStudents: activeCount },
    });

    return NextResponse.json({ success: true, message: "Student enrolled successfully" });
  } catch (error: any) {
    console.error("Enroll student error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Student is already enrolled in this batch" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId query param is required" }, { status: 400 });
    }

    const batch = await db.batch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Find the enrollment record
    const enrollment = await db.batchStudent.findUnique({
      where: { batchId_studentId: { batchId: id, studentId } },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Student is not enrolled in this batch" }, { status: 404 });
    }

    if (enrollment.status !== "active") {
      return NextResponse.json({ error: "Student enrollment is already inactive" }, { status: 400 });
    }

    // Set status to inactive
    await db.batchStudent.update({
      where: { id: enrollment.id },
      data: { status: "inactive" },
    });

    // Update batch.currentStudents count
    const activeCount = await db.batchStudent.count({
      where: { batchId: id, status: "active" },
    });
    await db.batch.update({
      where: { id },
      data: { currentStudents: activeCount },
    });

    return NextResponse.json({ success: true, message: "Student removed from batch" });
  } catch (error: any) {
    console.error("Remove student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}