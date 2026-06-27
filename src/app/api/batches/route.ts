import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const subjectId = searchParams.get("subjectId");
    const teacherId = searchParams.get("teacherId");
    const status = searchParams.get("status");
    const classType = searchParams.get("classType");
    const gradeLevel = searchParams.get("gradeLevel");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { instituteId, status: { not: "archived" } };

    if (subjectId) where.subjectId = subjectId;
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;
    if (classType) where.classType = classType;
    if (gradeLevel) where.gradeLevel = gradeLevel;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const [total, batches] = await Promise.all([
      db.batch.count({ where }),
      db.batch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Enrich with subject, teacher, branch, student count
    const subjectIds = [...new Set(batches.map((b) => b.subjectId).filter(Boolean))];
    const teacherIds = [...new Set(batches.map((b) => b.teacherId).filter(Boolean))];
    const branchIds = [...new Set(batches.map((b) => b.branchId).filter(Boolean))];

    const [subjects, teacherUsers, branches, studentCounts] = await Promise.all([
      subjectIds.length > 0
        ? db.subject.findMany({ where: { id: { in: subjectIds } } })
        : [],
      (async () => {
        const tRecords = teacherIds.length > 0
          ? await db.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, userId: true } })
          : [];
        const uIds = tRecords.map((t) => t.userId).filter(Boolean);
        const users = uIds.length > 0
          ? await db.user.findMany({ where: { id: { in: uIds } }, select: { id: true, firstName: true, lastName: true } })
          : [];
        const tMap = new Map(tRecords.map((t) => [t.userId, t.id]));
        return users.map((u) => ({ id: tMap.get(u.id), firstName: u.firstName, lastName: u.lastName }));
      })(),
      branchIds.length > 0
        ? db.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true, city: true },
          })
        : [],
      db.batchStudent.groupBy({
        by: ["batchId"],
        where: { batchId: { in: batches.map((b) => b.id) }, status: "active" },
        _count: { batchId: true },
      }),
    ]);

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const teacherMap = new Map(teacherUsers.map((t) => [t.id, t]));
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const countMap = new Map(studentCounts.map((c) => [c.batchId, c._count.batchId]));

    const enrichedBatches = batches.map((b) => ({
      ...b,
      subject: subjectMap.get(b.subjectId) || null,
      teacher: b.teacherId ? teacherMap.get(b.teacherId) || null : null,
      branch: b.branchId ? branchMap.get(b.branchId) || null : null,
      _count: { students: countMap.get(b.id) || 0 },
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      batches: enrichedBatches,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error: any) {
    console.error("Batches list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      branchId,
      subjectId,
      teacherId,
      name,
      code,
      description,
      gradeLevel,
      academicYear,
      medium,
      classType,
      maxStudents,
      monthlyFee,
      registrationFee,
      daysOfWeek,
      startTime,
      endTime,
      typicalDurationMin,
      onlinePlatform,
      onlineMeetingUrl,
      onlineMeetingId,
      onlinePasscode,
    } = body;

    if (!instituteId || !subjectId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const batch = await db.batch.create({
      data: {
        instituteId,
        branchId: branchId || null,
        subjectId,
        teacherId: teacherId || null,
        name,
        code: code || null,
        description,
        gradeLevel,
        academicYear,
        medium: medium || "english",
        classType: classType || "physical",
        maxStudents,
        monthlyFee,
        registrationFee: registrationFee || 0,
        daysOfWeek: JSON.stringify(daysOfWeek || []),
        startTime,
        endTime,
        typicalDurationMin,
        onlinePlatform,
        onlineMeetingUrl,
        onlineMeetingId,
        onlinePasscode,
        status: "upcoming",
        isVisibleToStudents: true,
        isEnrollmentOpen: true,
      },
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error: any) {
    console.error("Create batch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}