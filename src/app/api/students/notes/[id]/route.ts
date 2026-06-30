import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/students/notes/[id] — Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const note = await db.studentNote.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentNumber: true,
            instituteId: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error: any) {
    console.error("Student note detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/students/notes/[id] — Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { note, isFlagged } = body;

    const existing = await db.studentNote.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updated = await db.studentNote.update({
      where: { id },
      data: {
        ...(note !== undefined && { note }),
        ...(isFlagged !== undefined && { isFlagged }),
      },
    });

    return NextResponse.json({ note: updated });
  } catch (error: any) {
    console.error("Update student note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/students/notes/[id] — Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.studentNote.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.studentNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete student note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}