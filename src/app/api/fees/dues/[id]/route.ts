import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function recalculateStudentBalance(studentId: string) {
  const allUnpaidDues = await db.feeDue.findMany({
    where: { studentId, status: { in: ["unpaid", "partial"] } },
  });
  const outstanding = allUnpaidDues.reduce(
    (sum, d) => sum + d.amount - (d.amountPaid || 0) - (d.waivedAmount || 0),
    0
  );
  await db.student.update({
    where: { id: studentId },
    data: { outstandingBalance: outstanding },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, waivedAmount, reason } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const existing = await db.feeDue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Fee due not found" }, { status: 404 });
    }

    if (action === "waive") {
      const waiveAmt = parseFloat(waivedAmount);
      if (isNaN(waiveAmt) || waiveAmt <= 0) {
        return NextResponse.json({ error: "Valid waivedAmount is required" }, { status: 400 });
      }

      const totalWaived = (existing.waivedAmount || 0) + waiveAmt;
      const newPaid = existing.amountPaid + waiveAmt;
      const isFullyWaived = newPaid >= existing.amount;

      const updated = await db.feeDue.update({
        where: { id },
        data: {
          waivedAmount: totalWaived,
          status: isFullyWaived ? "paid" : existing.status === "unpaid" ? "partial" : existing.status,
          paidAt: isFullyWaived ? new Date() : null,
          description: reason
            ? `${existing.description} [Waived: ${reason}]`
            : existing.description,
        },
      });

      await recalculateStudentBalance(existing.studentId);

      return NextResponse.json({ feeDue: updated });
    }

    if (action === "mark_paid") {
      const updated = await db.feeDue.update({
        where: { id },
        data: {
          status: "paid",
          paidAt: new Date(),
          amountPaid: existing.amount - (existing.waivedAmount || 0),
        },
      });

      await recalculateStudentBalance(existing.studentId);

      return NextResponse.json({ feeDue: updated });
    }

    if (action === "reopen") {
      if (existing.status === "paid" && existing.amountPaid > 0 && existing.waivedAmount === 0) {
        // Check if there are payment allocations — can't reopen if payments exist
        const allocations = await db.paymentAllocation.findMany({
          where: { feeDueId: id },
        });
        if (allocations.length > 0) {
          return NextResponse.json(
            { error: "Cannot reopen: payment allocations exist for this fee due" },
            { status: 400 }
          );
        }
      }

      const updated = await db.feeDue.update({
        where: { id },
        data: {
          status: "unpaid",
          paidAt: null,
          amountPaid: 0,
          waivedAmount: 0,
        },
      });

      await recalculateStudentBalance(existing.studentId);

      return NextResponse.json({ feeDue: updated });
    }

    return NextResponse.json({ error: "Invalid action. Use waive, mark_paid, or reopen" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Fee due action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}