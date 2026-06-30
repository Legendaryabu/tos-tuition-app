import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/teachers/[id] — Get single teacher with user data and batch count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacher = await db.teacher.findUnique({ where: { id } });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get user data
    const user = teacher.userId
      ? await db.user.findFirst({
          where: { id: teacher.userId },
          select: {
            firstName: true,
            lastName: true,
            preferredName: true,
            email: true,
            mobile: true,
            profilePhoto: true,
            gender: true,
            status: true,
          },
        })
      : null;

    // Count batches
    const batchCount = await db.batch.count({
      where: { teacherId: id },
    });

    // Get recent batches
    const recentBatches = await db.batch.findMany({
      where: { teacherId: id },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true, subjectId: true },
    });

    // Get subject names for batches
    const subjectIds = [...new Set(recentBatches.map((b) => b.subjectId).filter(Boolean))];
    const subjects =
      subjectIds.length > 0
        ? await db.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, name: true, code: true },
          })
        : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const enrichedBatches = recentBatches.map((b) => ({
      ...b,
      subject: subjectMap.get(b.subjectId) || null,
    }));

    // Get session count
    const sessionCount = await db.classSession.count({
      where: { teacherId: id },
    });

    return NextResponse.json({
      ...teacher,
      user,
      batches: enrichedBatches,
      _count: { batches: batchCount, sessions: sessionCount },
    });
  } catch (error: any) {
    console.error("Teacher detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/teachers/[id] — Update a teacher
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
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
      isActive,
    } = body;

    const existing = await db.teacher.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Update user data if provided
    if (existing.userId && (firstName || lastName || email || mobile || preferredName || gender)) {
      await db.user.update({
        where: { id: existing.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(preferredName !== undefined && { preferredName }),
          ...(email !== undefined && { email }),
          ...(mobile !== undefined && { mobile }),
          ...(gender !== undefined && { gender }),
        },
      });
    }

    // Update teacher data
    const updated = await db.teacher.update({
      where: { id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(qualifications !== undefined && { qualifications }),
        ...(experienceYears !== undefined && { experienceYears }),
        ...(specializations !== undefined && {
          specializations: specializations ? JSON.stringify(specializations) : null,
        }),
        ...(employmentType !== undefined && { employmentType }),
        ...(salaryType !== undefined && { salaryType }),
        ...(basicSalary !== undefined && { basicSalary }),
        ...(commissionPercentage !== undefined && { commissionPercentage }),
        ...(zoomPersonalLink !== undefined && { zoomPersonalLink }),
        ...(googleMeetId !== undefined && { googleMeetId }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Get updated user for response
    const updatedUser = existing.userId
      ? await db.user.findFirst({
          where: { id: existing.userId },
          select: { firstName: true, lastName: true, email: true, mobile: true },
        })
      : null;

    return NextResponse.json({
      teacher: updated,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Update teacher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/teachers/[id] — Soft delete a teacher
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.teacher.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Check if any active batches assigned to this teacher
    const activeBatches = await db.batch.count({
      where: {
        teacherId: id,
        status: { in: ["active", "upcoming"] },
      },
    });

    if (activeBatches > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete teacher. ${activeBatches} active/upcoming batch(es) assigned to this teacher.`,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db.teacher.update({
      where: { id },
      data: { isActive: false },
    });

    // Also deactivate user
    if (existing.userId) {
      await db.user.update({
        where: { id: existing.userId },
        data: { status: "inactive" },
      });
    }

    return NextResponse.json({ success: true, message: "Teacher deactivated" });
  } catch (error: any) {
    console.error("Delete teacher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}