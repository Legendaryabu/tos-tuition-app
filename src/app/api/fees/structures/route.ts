import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const batchId = searchParams.get("batchId");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId, isActive: true };
    if (batchId) where.batchId = batchId;

    const structures = await db.feeStructure.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with batch, branch, count data
    const batchIds = [...new Set(structures.map((s) => s.batchId).filter(Boolean))];
    const branchIds = [...new Set(structures.map((s) => s.branchId).filter(Boolean))];

    const [batches, branches, feeDueCounts] = await Promise.all([
      batchIds.length > 0
        ? db.batch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, name: true, subjectId: true },
          })
        : [],
      branchIds.length > 0
        ? db.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : [],
      db.feeDue.groupBy({
        by: ["feeStructureId"],
        where: { feeStructureId: { in: structures.map((s) => s.id) } },
        _count: { feeStructureId: true },
      }),
    ]);

    const subjectIds = [...new Set(batches.map((b) => b.subjectId).filter(Boolean))];
    const subjects =
      subjectIds.length > 0
        ? await db.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, name: true },
          })
        : [];

    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const countMap = new Map(feeDueCounts.map((c) => [c.feeStructureId, c._count.feeStructureId]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const enrichedStructures = structures.map((s) => ({
      ...s,
      batch: s.batchId
        ? (() => {
            const b = batchMap.get(s.batchId);
            return b ? { ...b, subject: subjectMap.get(b.subjectId) || null } : null;
          })()
        : null,
      branch: s.branchId ? branchMap.get(s.branchId) || null : null,
      _count: { feeDues: countMap.get(s.id) || 0 },
    }));

    return NextResponse.json({ structures: enrichedStructures });
  } catch (error: any) {
    console.error("Fee structures error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      branchId,
      batchId,
      name,
      type,
      amount,
      isRecurring,
      recurrence,
      dueDay,
      gracePeriodDays,
      lateFeeAmount,
      lateFeeType,
      description,
    } = body;

    if (!instituteId || !name || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const structure = await db.feeStructure.create({
      data: {
        instituteId,
        branchId: branchId || null,
        batchId: batchId || null,
        name,
        type: type || "monthly",
        amount,
        isRecurring: isRecurring || false,
        recurrence: recurrence || null,
        dueDay,
        gracePeriodDays: gracePeriodDays || 0,
        lateFeeAmount: lateFeeAmount || 0,
        lateFeeType: lateFeeType || null,
        description,
        isActive: true,
      },
    });

    return NextResponse.json({ structure }, { status: 201 });
  } catch (error: any) {
    console.error("Create fee structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}