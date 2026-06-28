import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/receipt/:id?instituteId=XXX
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    const receipt = await db.receipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    if (instituteId && receipt.instituteId !== instituteId) {
      return NextResponse.json({ error: "Institute mismatch" }, { status: 403 });
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
    console.error("Receipt fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}