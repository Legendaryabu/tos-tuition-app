import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const studentId = searchParams.get("studentId");
    const paymentMethod = searchParams.get("paymentMethod");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    // Build AND conditions
    const andConditions: Record<string, unknown>[] = [{ instituteId }];

    if (studentId) andConditions.push({ studentId });
    if (paymentMethod) andConditions.push({ paymentMethod });
    if (status) andConditions.push({ status });
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      andConditions.push({ recordedAt: dateFilter });
    }

    // Handle search: match student fullName, studentNumber, or receipt receiptNumber
    if (search && search.trim()) {
      const term = search.trim();

      const [matchingStudents, matchingReceipts] = await Promise.all([
        db.student.findMany({
          where: {
            instituteId,
            OR: [
              { fullName: { contains: term } },
              { studentNumber: { contains: term } },
            ],
          },
          select: { id: true },
        }),
        db.receipt.findMany({
          where: {
            instituteId,
            receiptNumber: { contains: term },
          },
          select: { paymentId: true },
        }),
      ]);

      const matchingStudentIds = matchingStudents.map((s) => s.id);
      const matchingPaymentIds = matchingReceipts.map((r) => r.paymentId);

      const orClauses: Record<string, unknown>[] = [];
      if (matchingStudentIds.length > 0) {
        orClauses.push({ studentId: { in: matchingStudentIds } });
      }
      if (matchingPaymentIds.length > 0) {
        orClauses.push({ id: { in: matchingPaymentIds } });
      }

      if (orClauses.length === 0) {
        return NextResponse.json({
          payments: [],
          summary: { totalPayments: 0, totalAmount: 0 },
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      if (orClauses.length === 1) {
        andConditions.push(orClauses[0]);
      } else {
        andConditions.push({ OR: orClauses });
      }
    }

    const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    // Enrich with student, allocations, receipt, and recordedBy user data
    const studentIds = [...new Set(payments.map((p) => p.studentId).filter(Boolean))];
    const paymentIds = payments.map((p) => p.id);
    const recordedByIds = [...new Set(payments.map((p) => p.recordedBy).filter(Boolean))];

    // Phase 1: fetch students, allocations, receipts, users in parallel
    const [students, allocations, receipts, users] = await Promise.all([
      studentIds.length > 0
        ? db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true, studentNumber: true },
          })
        : [],
      paymentIds.length > 0
        ? db.paymentAllocation.findMany({
            where: { paymentId: { in: paymentIds } },
          })
        : [],
      paymentIds.length > 0
        ? db.receipt.findMany({
            where: { paymentId: { in: paymentIds } },
            select: { paymentId: true, receiptNumber: true },
          })
        : [],
      recordedByIds.length > 0
        ? db.user.findMany({
            where: { id: { in: recordedByIds } },
            select: { id: true, firstName: true, lastName: true, preferredName: true },
          })
        : [],
    ]);

    // Phase 2: fetch fee dues (depends on allocations)
    const dueIds = [...new Set(allocations.map((a) => a.feeDueId).filter(Boolean))];
    const feeDues = dueIds.length > 0
      ? await db.feeDue.findMany({
          where: { id: { in: dueIds } },
          select: { id: true, description: true, periodMonth: true, periodYear: true },
        })
      : [];

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const receiptMap = new Map(receipts.map((r) => [r.paymentId, r]));
    const dueMap = new Map(feeDues.map((d) => [d.id, d]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Group allocations by paymentId
    const allocByPayment = new Map<string, (typeof allocations[number] & { feeDue?: typeof feeDues[number] })[]>();
    for (const a of allocations) {
      const arr = allocByPayment.get(a.paymentId) || [];
      arr.push({ ...a, feeDue: dueMap.get(a.feeDueId) || null });
      allocByPayment.set(a.paymentId, arr);
    }

    const enrichedPayments = payments.map((p) => {
      const user = userMap.get(p.recordedBy);
      const recordedByName = user
        ? user.preferredName || `${user.firstName} ${user.lastName}`
        : null;

      return {
        ...p,
        student: studentMap.get(p.studentId) || null,
        allocations: allocByPayment.get(p.id) || [],
        receipt: receiptMap.get(p.id) || null,
        recordedByName,
      };
    });

    const summary = await db.payment.aggregate({
      where: {
        instituteId,
        status: "completed",
        ...(dateFrom || dateTo
          ? {
              recordedAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      payments: enrichedPayments,
      summary: {
        totalPayments: summary._count,
        totalAmount: summary._sum.amount || 0,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error("Payments list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      studentId,
      amount,
      currency,
      paymentMethod,
      referenceNumber,
      bankName,
      slipImage,
      notes,
      feeDueIds,
      recordedBy,
    } = body;

    if (!instituteId || !studentId || !amount || !recordedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const paymentAmount = parseFloat(amount);

    // Wrap all writes in a transaction for atomicity
    const { payment, receipt } = await db.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          instituteId,
          studentId,
          amount: paymentAmount,
          currency: currency || "LKR",
          paymentMethod: paymentMethod || "cash",
          referenceNumber,
          bankName,
          slipImage,
          notes,
          status: "completed",
          recordedBy,
        },
      });

      let remainingAmount = paymentAmount;
      let allocatedDueIds: string[] = feeDueIds || [];
      const excludedIds = new Set<string>();

      // If specific feeDueIds provided (e.g. Quick Pay), allocate to those first
      // If no feeDueIds, find all unpaid/partial dues (oldest first)
      if (allocatedDueIds.length === 0) {
        const unpaidDues = await tx.feeDue.findMany({
          where: {
            studentId,
            status: { in: ["unpaid", "partial"] },
          },
          orderBy: { dueDate: "asc" },
        });
        allocatedDueIds = unpaidDues.map((d) => d.id);
      } else {
        // Track these so we can skip them when auto-allocating overflow
        for (const id of allocatedDueIds) excludedIds.add(id);
      }

      // Allocate to fee dues
      for (const dueId of allocatedDueIds) {
        if (remainingAmount <= 0) break;

        const feeDue = await tx.feeDue.findUnique({ where: { id: dueId } });
        if (!feeDue || feeDue.status === "paid") continue;

        const outstanding = feeDue.amount - feeDue.amountPaid - feeDue.waivedAmount;
        const allocAmount = Math.min(remainingAmount, Math.max(outstanding, 0));

        if (allocAmount <= 0) continue;

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            feeDueId: dueId,
            amount: allocAmount,
          },
        });

        const newPaid = feeDue.amountPaid + allocAmount;
        const isFullyPaid = newPaid >= feeDue.amount;

        await tx.feeDue.update({
          where: { id: dueId },
          data: {
            amountPaid: newPaid,
            status: isFullyPaid ? "paid" : "partial",
            paidAt: isFullyPaid ? new Date() : null,
          },
        });

        remainingAmount -= allocAmount;
      }

      // Overflow: if money remains after targeted dues, auto-allocate to other unpaid dues
      if (remainingAmount > 0 && excludedIds.size > 0) {
        const otherDues = await tx.feeDue.findMany({
          where: {
            studentId,
            status: { in: ["unpaid", "partial"] },
            id: { notIn: [...excludedIds] },
          },
          orderBy: { dueDate: "asc" },
        });

        for (const due of otherDues) {
          if (remainingAmount <= 0) break;

          const outstanding = due.amount - due.amountPaid - due.waivedAmount;
          const allocAmount = Math.min(remainingAmount, Math.max(outstanding, 0));
          if (allocAmount <= 0) continue;

          await tx.paymentAllocation.create({
            data: { paymentId: payment.id, feeDueId: due.id, amount: allocAmount },
          });

          const newPaid = due.amountPaid + allocAmount;
          const isFullyPaid = newPaid >= due.amount;

          await tx.feeDue.update({
            where: { id: due.id },
            data: {
              amountPaid: newPaid,
              status: isFullyPaid ? "paid" : "partial",
              paidAt: isFullyPaid ? new Date() : null,
            },
          });

          remainingAmount -= allocAmount;
        }
      }

      // Update student totalPaid
      await tx.student.update({
        where: { id: studentId },
        data: { totalPaid: { increment: paymentAmount } },
      });

      // Recalculate student's outstandingBalance
      const allUnpaidDues = await tx.feeDue.findMany({
        where: { studentId, status: { in: ["unpaid", "partial"] } },
      });
      const outstanding = allUnpaidDues.reduce(
        (sum, d) => sum + d.amount - (d.amountPaid || 0) - (d.waivedAmount || 0),
        0
      );
      await tx.student.update({
        where: { id: studentId },
        data: { outstandingBalance: outstanding },
      });

      // Generate receipt number WITH dash: RCP-0001
      const institute = await tx.institute.findUnique({
        where: { id: instituteId },
        select: { receiptPrefix: true },
      });

      const receiptCount = await tx.receipt.count({ where: { instituteId } });
      const receiptNumber = `${institute?.receiptPrefix || "RCP"}-${String(receiptCount + 1).padStart(4, "0")}`;

      // Create receipt
      const receipt = await tx.receipt.create({
        data: {
          instituteId,
          paymentId: payment.id,
          studentId,
          receiptNumber,
          totalAmount: paymentAmount,
          paymentMethod: paymentMethod || "cash",
          generatedBy: recordedBy,
        },
      });

      // Activity log
      await tx.activityLog.create({
        data: {
          instituteId,
          description: `Payment received: LKR ${paymentAmount.toLocaleString()}`,
          subjectType: "Payment",
          subjectId: payment.id,
          causerId: recordedBy,
        },
      });

      return { payment, receipt };
    });

    return NextResponse.json({ payment, receipt }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}