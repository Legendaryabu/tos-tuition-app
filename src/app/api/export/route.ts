import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const instituteId = searchParams.get("instituteId");

    if (!type || !["students", "payments"].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'students' or 'payments'" }, { status: 400 });
    }

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    if (type === "students") {
      const studentIdsParam = searchParams.get("studentIds");
      const where: any = { instituteId };
      if (studentIdsParam) {
        const ids = studentIdsParam.split(",").filter(Boolean);
        if (ids.length > 0) where.id = { in: ids };
      }

      const students = await db.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const userIds = students.map((s) => s.userId).filter(Boolean);
      const users = userIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u.email || ""]));

      const header = "Student Number,Full Name,Gender,Grade,School,Mobile,Email,Status,Outstanding Balance,Total Paid";
      const rows = students.map((s) =>
        [
          escapeCSV(s.studentNumber),
          escapeCSV(s.fullName),
          escapeCSV(s.gender),
          escapeCSV(s.grade),
          escapeCSV(s.schoolName),
          escapeCSV(s.mobile),
          escapeCSV(userMap.get(s.userId)),
          escapeCSV(s.status),
          escapeCSV(s.outstandingBalance),
          escapeCSV(s.totalPaid),
        ].join(",")
      );

      const csv = [header, ...rows].join("\n");
      const filename = `students-${today}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "payments") {
      const payments = await db.payment.findMany({
        where: { instituteId },
        orderBy: { recordedAt: "desc" },
      });

      const studentIds = [...new Set(payments.map((p) => p.studentId).filter(Boolean))];
      const paymentIds = payments.map((p) => p.id);

      const [students, receipts] = await Promise.all([
        studentIds.length > 0
          ? db.student.findMany({
              where: { id: { in: studentIds } },
              select: { id: true, fullName: true },
            })
          : [],
        paymentIds.length > 0
          ? db.receipt.findMany({
              where: { paymentId: { in: paymentIds } },
              select: { paymentId: true, receiptNumber: true },
            })
          : [],
      ]);

      const studentMap = new Map(students.map((s) => [s.id, s.fullName]));
      const receiptMap = new Map(receipts.map((r) => [r.paymentId, r.receiptNumber]));

      const methodLabels: Record<string, string> = {
        cash: "Cash",
        bank_transfer: "Bank Transfer",
        online: "Online",
        cheque: "Cheque",
      };

      const header = "Receipt Number,Student Name,Amount,Payment Method,Reference,Status,Recorded Date,Notes";
      const rows = payments.map((p) =>
        [
          escapeCSV(receiptMap.get(p.id)),
          escapeCSV(studentMap.get(p.studentId)),
          escapeCSV(p.amount),
          escapeCSV(methodLabels[p.paymentMethod] || p.paymentMethod),
          escapeCSV(p.referenceNumber),
          escapeCSV(p.status),
          escapeCSV(formatDate(p.recordedAt)),
          escapeCSV(p.notes),
        ].join(",")
      );

      const csv = [header, ...rows].join("\n");
      const filename = `payments-${today}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}