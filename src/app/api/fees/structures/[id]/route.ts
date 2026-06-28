import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const studentId = searchParams.get("studentId");
    const batchId = searchParams.get("batchId");
    const feeStructureId = searchParams.get("feeStructureId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const periodMonth = searchParams.get("periodMonth");
    const periodYear = searchParams.get("periodYear");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { instituteId };

    if (studentId) where.studentId = studentId;
    if (batchId) where.batchId = batchId;
    if (feeStructureId) where.feeStructureId = feeStructureId;
    if (periodMonth) where.periodMonth = parseInt(periodMonth);
    if (periodYear) where.periodYear = parseInt(periodYear);

    // Handle status filtering — "overdue" is virtual
    if (status === "overdue") {
      where.status = { in: ["unpaid", "partial"] };
    } else if (status && status !== "overdue") {
      where.status = status;
    }

    // Handle search — find matching students first, then filter dues
    if (search && search.trim()) {
      const matchingStudents = await db.student.findMany({
        where: {
          instituteId,
          OR: [
            { fullName: { contains: search.trim() } },
            { studentNumber: { contains: search.trim() } },
          ],
        },
        select: { id: true },
      });

      const matchingStudentIds = matchingStudents.map((s) => s.id);
      if (matchingStudentIds.length === 0) {
        // No students match — return empty result with summary
        const summary = await computeSummary(instituteId);
        return NextResponse.json({
          dues: [],
          summary,
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      where.studentId = { in: matchingStudentIds };
    }

    const [dues, total] = await Promise.all([
      db.feeDue.findMany({
        where,
        orderBy: { dueDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.feeDue.count({ where }),
    ]);

    // Batch-enrich with student, batch, fee structure, subject data
    const studentIds = [...new Set(dues.map((d) => d.studentId).filter(Boolean))];
    const batchIds = [...new Set(dues.map((d) => d.batchId).filter(Boolean as never))];
    const fsIds = [...new Set(dues.map((d) => d.feeStructureId).filter(Boolean as never))];

    const [students, batches, feeStructures, subjects] = await Promise.all([
      studentIds.length > 0
        ? db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true, studentNumber: true, mobile: true },
          })
        : [],
      batchIds.length > 0
        ? db.batch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, name: true, subjectId: true },
          })
        : [],
      fsIds.length > 0
        ? db.feeStructure.findMany({
            where: { id: { in: fsIds } },
            select: { id: true, name: true, type: true },
          })
        : [],
      db.subject.findMany({ select: { id: true, name: true } }),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const fsMap = new Map(feeStructures.map((f) => [f.id, f]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const now = new Date();

    const enrichedDues = dues.map((d) => {
      const batch = d.batchId ? batchMap.get(d.batchId) : null;
      const remaining = d.amount - d.amountPaid - d.waivedAmount;
      const isOverdue =
        (d.status === "unpaid" || d.status === "partial") &&
        d.dueDate < now;

      return {
        ...d,
        remaining,
        displayStatus: isOverdue ? "overdue" : d.status,
        student: studentMap.get(d.studentId) || null,
        batch: batch
          ? {
              ...batch,
              subject: batch.subjectId ? subjectMap.get(batch.subjectId) || null : null,
            }
          : null,
        feeStructure: d.feeStructureId ? fsMap.get(d.feeStructureId) || null : null,
      };
    });

    // Compute summary across ALL outstanding dues for the institute (not just page)
    const summary = await computeSummary(instituteId);

    return NextResponse.json({
      dues: enrichedDues,
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error("Fee dues error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function computeSummary(instituteId: string) {
  const now = new Date();

  // All unpaid/partial dues for this institute
  const outstandingDues = await db.feeDue.findMany({
    where: {
      instituteId,
      status: { in: ["unpaid", "partial"] },
    },
    select: {
      id: true,
      amount: true,
      amountPaid: true,
      waivedAmount: true,
      dueDate: true,
      status: true,
    },
  });

  let totalUnpaid = 0;
  let totalUnpaidAmount = 0;
  let totalOverdue = 0;
  let totalOverdueAmount = 0;
  let totalPartial = 0;

  for (const d of outstandingDues) {
    const remaining = d.amount - d.amountPaid - d.waivedAmount;
    const isOverdue = d.dueDate < now;

    if (d.status === "partial") {
      totalPartial++;
    }

    if (isOverdue) {
      totalOverdue++;
      totalOverdueAmount += remaining;
    } else {
      totalUnpaid++;
      totalUnpaidAmount += remaining;
    }
  }

  return {
    totalUnpaid,
    totalUnpaidAmount,
    totalOverdue,
    totalOverdueAmount,
    totalPartial,
  };
}