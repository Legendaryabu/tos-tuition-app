import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { month, year, instituteId } = body;

    if (!month || !year || !instituteId) {
      return NextResponse.json(
        { error: "month, year, and instituteId are required" },
        { status: 400 }
      );
    }

    const monthInt = parseInt(month);
    const yearInt = parseInt(year);

    if (monthInt < 1 || monthInt > 12 || isNaN(monthInt)) {
      return NextResponse.json({ error: "month must be between 1 and 12" }, { status: 400 });
    }

    if (isNaN(yearInt) || yearInt < 2020 || yearInt > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // Find the fee structure
    const structure = await db.feeStructure.findUnique({ where: { id } });
    if (!structure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }

    if (!structure.isRecurring) {
      return NextResponse.json(
        { error: "Cannot generate dues for a non-recurring fee structure" },
        { status: 400 }
      );
    }

    if (!structure.isActive) {
      return NextResponse.json(
        { error: "Fee structure is not active" },
        { status: 400 }
      );
    }

    // Find active students in the structure's batch, or all institute students if no batch
    let students;
    if (structure.batchId) {
      const batchStudents = await db.batchStudent.findMany({
        where: { batchId: structure.batchId, status: "active" },
        select: { studentId: true },
      });
      const studentIds = batchStudents.map((bs) => bs.studentId);

      students = await db.student.findMany({
        where: {
          id: { in: studentIds },
          status: "active",
        },
        select: { id: true, fullName: true, studentNumber: true, instituteId: true },
      });
    } else {
      students = await db.student.findMany({
        where: {
          instituteId,
          status: "active",
        },
        select: { id: true, fullName: true, studentNumber: true, instituteId: true },
      });
    }

    // Compute due date
    const dueDay = structure.dueDay || 5;
    const dueDate = new Date(yearInt, monthInt - 1, dueDay);

    const monthName = MONTH_NAMES[monthInt];
    const description = `${structure.name} - ${monthName} ${yearInt}`;

    let createdCount = 0;

    for (const student of students) {
      // Check if a due already exists for this structure + month + year
      const existing = await db.feeDue.findFirst({
        where: {
          studentId: student.id,
          feeStructureId: structure.id,
          periodMonth: monthInt,
          periodYear: yearInt,
        },
      });

      if (existing) continue;

      await db.feeDue.create({
        data: {
          instituteId: student.instituteId,
          studentId: student.id,
          batchId: structure.batchId,
          feeStructureId: structure.id,
          type: structure.type,
          description,
          amount: structure.amount,
          dueDate,
          periodMonth: monthInt,
          periodYear: yearInt,
          status: "unpaid",
        },
      });

      createdCount++;
    }

    return NextResponse.json({
      message: `Generated ${createdCount} fee dues for ${monthName} ${yearInt}`,
      createdCount,
      totalStudents: students.length,
      skipped: students.length - createdCount,
    });
  } catch (error: unknown) {
    console.error("Generate dues error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}