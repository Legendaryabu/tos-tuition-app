import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const branchId = searchParams.get("branchId");
    const batchId = searchParams.get("batchId");
    const status = searchParams.get("status");
    const grade = searchParams.get("grade");
    const district = searchParams.get("district");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };

    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (grade) where.grade = grade;
    if (district) where.district = district;

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { studentNumber: { contains: search } },
        { mobile: { contains: search } },
        { email: { contains: search } },
        { schoolName: { contains: search } },
      ];
    }

    if (batchId) {
      const enrollments = await db.batchStudent.findMany({
        where: { batchId, status: "active" },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);
      where.id = { in: studentIds };
    }

    // Build orderBy
    const allowedSortFields = ["createdAt", "fullName", "studentNumber", "grade", "outstandingBalance", "totalPaid"];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderBy: any = { [orderByField]: sortOrder === "asc" ? "asc" : "desc" };

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.student.count({ where }),
    ]);

    // Get unique grades and districts for filter dropdowns
    const [allGrades, allDistricts] = await Promise.all([
      db.student.findMany({
        where: { instituteId, status: status || undefined },
        select: { grade: true },
        distinct: ["grade"],
        orderBy: { grade: "asc" },
      }).then((items) => items.map((i) => i.grade).filter(Boolean)),
      db.student.findMany({
        where: { instituteId, status: status || undefined },
        select: { district: true },
        distinct: ["district"],
        orderBy: { district: "asc" },
      }).then((items) => items.map((i) => i.district).filter(Boolean)),
    ]);

    // Enrich with user email and branch info
    const userIds = students.map((s) => s.userId).filter(Boolean);
    const branchIds = students.map((s) => s.branchId).filter(Boolean);

    const [users, branches] = await Promise.all([
      userIds.length > 0
        ? db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, profilePhoto: true },
          })
        : [],
      branchIds.length > 0
        ? db.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true, city: true },
          })
        : [],
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const branchMap = new Map(branches.map((b) => [b.id, b]));

    const enrichedStudents = students.map((s) => ({
      ...s,
      user: userMap.get(s.userId) || null,
      branch: s.branchId ? branchMap.get(s.branchId) || null : null,
    }));

    return NextResponse.json({
      students: enrichedStudents,
      filters: { grades: allGrades, districts: allDistricts },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Students list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      branchId,
      firstName,
      lastName,
      gender,
      dateOfBirth,
      schoolName,
      grade,
      stream,
      examYear,
      mobile,
      whatsapp,
      email,
      addressLine1,
      city,
      district,
      batchIds,
    } = body;

    if (!instituteId || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Duplicate detection: check by mobile number (skip if forceDuplicate)
    const fullName = `${firstName} ${lastName}`.trim();
    const forceDuplicate = body.forceDuplicate;

    if (!forceDuplicate && mobile) {
      const duplicates = await db.student.findMany({
        where: { instituteId, mobile, status: "active" },
        select: { id: true, fullName: true, mobile: true, studentNumber: true },
        take: 5,
      });

      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: "Possible duplicate student(s) found",
            duplicates,
            message: "A student with this mobile number already exists. Please review and confirm.",
          },
          { status: 409 }
        );
      }
    }

    // Generate student number
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: { studentNumberPrefix: true, studentNumberSeq: true, name: true },
    });

    const prefix = institute?.studentNumberPrefix || "STU";
    const seq = (institute?.studentNumberSeq || 0) + 1;
    const studentNumber = `${prefix}-${String(seq).padStart(4, "0")}`;

    // Create user
    const user = await db.user.create({
      data: {
        instituteId,
        firstName,
        lastName,
        email: email || null,
        password: `tbos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        mobile,
        whatsapp: whatsapp || mobile,
        gender,
        type: "student",
        status: "active",
      },
    });

    // Create student
    const student = await db.student.create({
      data: {
        userId: user.id,
        instituteId,
        branchId: branchId || null,
        studentNumber,
        fullName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        schoolName,
        grade,
        stream,
        examYear,
        mobile,
        whatsapp: whatsapp || mobile,
        email,
        addressLine1,
        city,
        district,
        status: "active",
      },
    });

    // Update institute student number sequence
    await db.institute.update({
      where: { id: instituteId },
      data: { studentNumberSeq: seq },
    });

    // Enroll in batches if provided
    if (batchIds && batchIds.length > 0) {
      await db.batchStudent.createMany({
        data: batchIds.map((batchId: string) => ({
          batchId,
          studentId: student.id,
          status: "active",
        })),
      });

      for (const batchId of batchIds) {
        const count = await db.batchStudent.count({
          where: { batchId, status: "active" },
        });
        await db.batch.update({
          where: { id: batchId },
          data: { currentStudents: count },
        });
      }
    }

    // Timeline entry
    await db.studentTimeline.create({
      data: {
        studentId: student.id,
        instituteId,
        type: "enrollment",
        description: `Student enrolled in ${institute?.name || "the institute"}`,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error: any) {
    console.error("Create student error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email or mobile already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}