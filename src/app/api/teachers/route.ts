import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const subjectId = searchParams.get("subjectId");
    const activeOnly = searchParams.get("active") !== "false";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "500");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };
    if (subjectId) {
      const batches = await db.batch.findMany({
        where: { instituteId, subjectId },
        select: { teacherId: true },
      });
      const teacherIds = [...new Set(batches.map((b) => b.teacherId).filter(Boolean))];
      where.id = { in: teacherIds };
    }
    if (activeOnly) where.isActive = true;

    const [teachers, total] = await Promise.all([
      db.teacher.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.teacher.count({ where }),
    ]);

    // Enrich with user data and batch counts
    const userIds = teachers.map((t) => t.userId).filter(Boolean);
    const [users, batchCounts] = await Promise.all([
      userIds.length > 0
        ? db.user.findMany({
            where: { id: { in: userIds } },
            select: {
              firstName: true, lastName: true, preferredName: true,
              email: true, mobile: true, profilePhoto: true, gender: true,
            },
          })
        : [],
      db.batch.groupBy({
        by: ["teacherId"],
        where: { teacherId: { in: teachers.map((t) => t.id) } },
        _count: { teacherId: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const countMap = new Map(batchCounts.map((c) => [c.teacherId, c._count.teacherId]));

    const enrichedTeachers = teachers.map((t) => ({
      ...t,
      user: userMap.get(t.userId) || null,
      _count: { batches: countMap.get(t.id) || 0 },
    }));

    return NextResponse.json({
      teachers: enrichedTeachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Teachers list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      firstName,
      lastName,
      preferredName,
      email,
      mobile,
      gender,
      bio,
      qualifications,
      experienceYears,
      specializations,
      employmentType,
      salaryType,
      basicSalary,
      commissionPercentage,
      zoomPersonalLink,
      googleMeetId,
    } = body;

    if (!instituteId || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create user
    const user = await db.user.create({
      data: {
        instituteId,
        firstName,
        lastName,
        preferredName,
        email,
        password: "password123",
        mobile,
        gender,
        type: "teacher",
        status: "active",
      },
    });

    // Create teacher
    const teacher = await db.teacher.create({
      data: {
        userId: user.id,
        instituteId,
        bio,
        qualifications,
        experienceYears,
        specializations: specializations ? JSON.stringify(specializations) : null,
        employmentType: employmentType || "part_time",
        salaryType,
        basicSalary,
        commissionPercentage,
        zoomPersonalLink,
        googleMeetId,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        teacher,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create teacher error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}