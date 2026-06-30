import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/subjects/[id] — Get single subject with batch count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const subject = await db.subject.findUnique({ where: { id } });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Count batches
    const batchCount = await db.batch.count({
      where: { subjectId: id },
    });

    return NextResponse.json({
      ...subject,
      _count: { batches: batchCount },
    });
  } catch (error: any) {
    console.error("Subject detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/subjects/[id] — Update a subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      code,
      name,
      nameSinhala,
      nameTamil,
      description,
      gradeLevel,
      category,
      color,
      isActive,
    } = body;

    const existing = await db.subject.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const updated = await db.subject.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(nameSinhala !== undefined && { nameSinhala }),
        ...(nameTamil !== undefined && { nameTamil }),
        ...(description !== undefined && { description }),
        ...(gradeLevel !== undefined && { gradeLevel }),
        ...(category !== undefined && { category }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ subject: updated });
  } catch (error: any) {
    console.error("Update subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/subjects/[id] — Soft delete a subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.subject.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if any active batches use this subject
    const activeBatches = await db.batch.count({
      where: { subjectId: id, status: { in: ["active", "upcoming"] } },
    });

    if (activeBatches > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete subject. ${activeBatches} active/upcoming batch(es) use this subject.`,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db.subject.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Subject deactivated" });
  } catch (error: any) {
    console.error("Delete subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}