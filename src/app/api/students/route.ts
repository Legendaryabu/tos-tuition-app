import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const branchId = searchParams.get("branchId");
    const batchId = searchParams.get("batchId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };

    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
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

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.student.count({ where }),
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

    // Wrap all writes in a transaction for atomicity
    const student = await db.$transaction(async (tx) => {
      // Generate student number
      const institute = await tx.institute.findUnique({
        where: { id: instituteId },
        select: { studentNumberPrefix: true, studentNumberSeq: true, name: true },
      });

      const prefix = institute?.studentNumberPrefix || "STU";
      const seq = (institute?.studentNumberSeq || 0) + 1;
      const studentNumber = `${prefix}${String(seq).padStart(4, "0")}`;

      // Create user
      const user = await tx.user.create({
        data: {
          instituteId,
          firstName,
          lastName,
          email: email || null,
          password: "password123",
          mobile,
          whatsapp: whatsapp || mobile,
          gender,
          type: "student",
          status: "active",
        },
      });

      // Create student
      const newStudent = await tx.student.create({
        data: {
          userId: user.id,
          instituteId,
          branchId: branchId || null,
          studentNumber,
          fullName: `${firstName} ${lastName}`,
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
      await tx.institute.update({
        where: { id: instituteId },
        data: { studentNumberSeq: seq },
      });

      // Enroll in batches if provided
      if (batchIds && batchIds.length > 0) {
        await tx.batchStudent.createMany({
          data: batchIds.map((batchId: string) => ({
            batchId,
            studentId: newStudent.id,
            status: "active",
          })),
        });

        for (const batchId of batchIds) {
          const count = await tx.batchStudent.count({
            where: { batchId, status: "active" },
          });
          await tx.batch.update({
            where: { id: batchId },
            data: { currentStudents: count },
          });
        }
      }

      // Timeline entry
      await tx.studentTimeline.create({
        data: {
          studentId: newStudent.id,
          instituteId,
          type: "enrollment",
          description: `Student enrolled in ${institute?.name || "the institute"}`,
        },
      });

      return newStudent;
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error: any) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}