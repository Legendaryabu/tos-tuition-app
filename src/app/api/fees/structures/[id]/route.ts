import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      amount,
      isRecurring,
      recurrence,
      dueDay,
      gracePeriodDays,
      lateFeeAmount,
      batchId,
      description,
      isActive,
    } = body;

    const existing = await db.feeStructure.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (isRecurring !== undefined) data.isRecurring = isRecurring;
    if (recurrence !== undefined) data.recurrence = recurrence;
    if (dueDay !== undefined) data.dueDay = dueDay;
    if (gracePeriodDays !== undefined) data.gracePeriodDays = gracePeriodDays;
    if (lateFeeAmount !== undefined) data.lateFeeAmount = parseFloat(lateFeeAmount);
    if (batchId !== undefined) data.batchId = batchId || null;
    if (description !== undefined) data.description = description;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.feeStructure.update({
      where: { id },
      data,
    });

    return NextResponse.json({ feeStructure: updated });
  } catch (error: unknown) {
    console.error("Update fee structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.feeStructure.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }

    // Check for unpaid dues linked to this structure
    const unpaidDuesCount = await db.feeDue.count({
      where: {
        feeStructureId: id,
        status: { in: ["unpaid", "partial"] },
      },
    });

    if (unpaidDuesCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete fee structure: ${unpaidDuesCount} unpaid/partial fee due(s) exist`,
        },
        { status: 400 }
      );
    }

    // Soft delete
    const updated = await db.feeStructure.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ feeStructure: updated, message: "Fee structure deactivated" });
  } catch (error: unknown) {
    console.error("Delete fee structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}