import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const gradeLevel = searchParams.get("gradeLevel");
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active") !== "false";

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };
    if (gradeLevel) where.gradeLevel = gradeLevel;
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const subjects = await db.subject.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Count batches per subject
    const subjectIds = subjects.map((s) => s.id);
    const batchCounts = subjectIds.length > 0
      ? await db.batch.groupBy({
          by: ["subjectId"],
          where: { subjectId: { in: subjectIds } },
          _count: { subjectId: true },
        })
      : [];
    const countMap = new Map(batchCounts.map((c) => [c.subjectId, c._count.subjectId]));

    const enrichedSubjects = subjects.map((s) => ({
      ...s,
      _count: { batches: countMap.get(s.id) || 0 },
    }));

    return NextResponse.json({ subjects: enrichedSubjects });
  } catch (error: any) {
    console.error("Subjects list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      code,
      name,
      nameSinhala,
      nameTamil,
      description,
      gradeLevel,
      category,
      color,
    } = body;

    if (!instituteId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subject = await db.subject.create({
      data: {
        instituteId,
        code,
        name,
        nameSinhala,
        nameTamil,
        description,
        gradeLevel,
        category,
        color,
        isActive: true,
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error: any) {
    console.error("Create subject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}