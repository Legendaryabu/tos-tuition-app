import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const instituteId = searchParams.get("instituteId");

    if (!paymentId || !instituteId) {
      return NextResponse.json(
        { error: "paymentId and instituteId are required" },
        { status: 400 }
      );
    }

    const receipt = await db.receipt.findUnique({
      where: { paymentId },
    });

    if (!receipt) {
      return NextResponse.json({ receipt: null });
    }

    // Fetch related data for enrichment (allocations first, then fee dues depend on them)
    const [payment, student, institute, allocations, generator] =
      await Promise.all([
        db.payment.findUnique({
          where: { id: paymentId },
        }),
        db.student.findUnique({
          where: { id: receipt.studentId },
          select: {
            id: true,
            fullName: true,
            studentNumber: true,
            mobile: true,
          },
        }),
        db.institute.findUnique({
          where: { id: instituteId },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            city: true,
            district: true,
            addressLine1: true,
          },
        }),
        db.paymentAllocation.findMany({
          where: { paymentId },
        }),
        db.user.findUnique({
          where: { id: receipt.generatedBy },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
          },
        }),
      ]);

    // Fetch fee dues for allocations
    const dueIds = allocations.map((a) => a.feeDueId).filter(Boolean);
    const feeDues =
      dueIds.length > 0
        ? await db.feeDue.findMany({
            where: { id: { in: dueIds } },
            select: { id: true, description: true },
          })
        : [];

    const dueMap = new Map(feeDues.map((d) => [d.id, d]));

    const enrichedAllocations = allocations.map((a) => ({
      ...a,
      feeDue: dueMap.get(a.feeDueId) || null,
    }));

    const generatedByName = generator
      ? generator.preferredName || `${generator.firstName} ${generator.lastName}`
      : null;

    return NextResponse.json({
      receipt: {
        ...receipt,
        payment,
        student,
        institute,
        allocations: enrichedAllocations,
        generatedByName,
      },
    });
  } catch (error: unknown) {
    console.error("Receipt fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, instituteId, generatedBy } = body;

    if (!paymentId || !instituteId || !generatedBy) {
      return NextResponse.json(
        { error: "paymentId, instituteId, and generatedBy are required" },
        { status: 400 }
      );
    }

    // Check if receipt already exists for this payment
    const existing = await db.receipt.findUnique({
      where: { paymentId },
    });

    if (existing) {
      return NextResponse.json({ error: "Receipt already exists for this payment" }, { status: 409 });
    }

    // Get payment details
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Generate receipt number WITH dash: RCP-0001
    const inst = await db.institute.findUnique({
      where: { id: instituteId },
      select: { receiptPrefix: true },
    });

    const receiptCount = await db.receipt.count({ where: { instituteId } });
    const receiptNumber = `${inst?.receiptPrefix || "RCP"}-${String(receiptCount + 1).padStart(4, "0")}`;

    const receipt = await db.receipt.create({
      data: {
        instituteId,
        paymentId,
        studentId: payment.studentId,
        receiptNumber,
        totalAmount: payment.amount,
        paymentMethod: payment.paymentMethod,
        generatedBy,
      },
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error: unknown) {
    console.error("Receipt create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
