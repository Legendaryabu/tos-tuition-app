import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/receipt?paymentId=XXX&instituteId=XXX
// Find receipt by paymentId
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

    const receipt = await db.receipt.findFirst({
      where: { paymentId, instituteId },
    });

    if (!receipt) {
      return NextResponse.json({ receipt: null });
    }

    // Fetch related data separately (Receipt model uses plain FK fields, no Prisma relations)
    const [payment, student, institute] = await Promise.all([
      db.payment.findUnique({ where: { id: receipt.paymentId } }),
      db.student.findUnique({
        where: { id: receipt.studentId },
        select: { studentNumber: true, fullName: true, mobile: true, email: true },
      }),
      db.institute.findUnique({
        where: { id: receipt.instituteId },
        select: { name: true, email: true, phone: true, city: true, addressLine1: true, receiptPrefix: true },
      }),
    ]);

    return NextResponse.json({
      receipt: {
        ...receipt,
        payment,
        student,
        institute,
      },
    });
  } catch (error: any) {
    console.error("Receipt lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/receipt
// Generate a new receipt for a payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, instituteId, generatedBy } = body;

    if (!paymentId || !instituteId) {
      return NextResponse.json(
        { error: "paymentId and instituteId are required" },
        { status: 400 }
      );
    }

    // Check if receipt already exists for this payment
    const existing = await db.receipt.findFirst({
      where: { paymentId },
    });

    if (existing) {
      // Return existing receipt with full data
      const [payment, student, institute] = await Promise.all([
        db.payment.findUnique({ where: { id: existing.paymentId } }),
        db.student.findUnique({
          where: { id: existing.studentId },
          select: { studentNumber: true, fullName: true, mobile: true, email: true },
        }),
        db.institute.findUnique({
          where: { id: existing.instituteId },
          select: { name: true, email: true, phone: true, city: true, addressLine1: true, receiptPrefix: true },
        }),
      ]);
      return NextResponse.json({
        receipt: { ...existing, payment, student, institute },
      });
    }

    // Look up the payment
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.instituteId !== instituteId) {
      return NextResponse.json({ error: "Institute mismatch" }, { status: 403 });
    }

    // Get institute for receipt prefix
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: { receiptPrefix: true, name: true, email: true, phone: true, city: true, addressLine1: true },
    });

    // Generate receipt number: prefix + dash + sequential number (e.g., RCP-0001)
    const receiptCount = await db.receipt.count({ where: { instituteId } });
    const prefix = institute?.receiptPrefix || "RCP";
    const receiptNumber = `${prefix}-${String(receiptCount + 1).padStart(4, "0")}`;

    // Get student data
    const student = await db.student.findUnique({
      where: { id: payment.studentId },
      select: { studentNumber: true, fullName: true, mobile: true, email: true },
    });

    // Create the receipt
    const receipt = await db.receipt.create({
      data: {
        instituteId,
        paymentId,
        studentId: payment.studentId,
        receiptNumber,
        totalAmount: payment.amount,
        paymentMethod: payment.paymentMethod,
        generatedBy: generatedBy || "system",
      },
    });

    return NextResponse.json({
      receipt: { ...receipt, payment, student, institute },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Receipt creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}