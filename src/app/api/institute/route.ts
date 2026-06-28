import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const institute = await db.institute.findUnique({
      where: { id: instituteId },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    // Get owner
    const owner = await db.user.findFirst({
      where: { id: institute.ownerId },
      select: { id: true, firstName: true, lastName: true, email: true, mobile: true },
    });

    // Counts
    const [branchCount, subjectCount, batchCount, studentCount, teacherCount] = await Promise.all([
      db.branch.count({ where: { instituteId } }),
      db.subject.count({ where: { instituteId } }),
      db.batch.count({ where: { instituteId } }),
      db.student.count({ where: { instituteId, status: "active" } }),
      db.teacher.count({ where: { instituteId, isActive: true } }),
    ]);

    // Get subscription info
    const subscription = await db.subscription.findFirst({
      where: { instituteId },
      orderBy: { createdAt: "desc" },
    });

    let plan = null;
    if (subscription) {
      plan = await db.plan.findUnique({ where: { id: subscription.planId } });
    }

    return NextResponse.json({
      institute,
      owner,
      subscription: subscription ? { ...subscription, plan } : null,
      _count: {
        branches: branchCount,
        subjects: subjectCount,
        batches: batchCount,
        students: studentCount,
        teachers: teacherCount,
      },
    });
  } catch (error: any) {
    console.error("Institute profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { instituteId, ...updateData } = body;

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const institute = await db.institute.update({
      where: { id: instituteId },
      data: updateData,
    });

    return NextResponse.json({ institute });
  } catch (error: any) {
    console.error("Update institute error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}