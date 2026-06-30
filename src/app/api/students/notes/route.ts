import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/students/notes?studentId=xxx — List notes for a student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    const notes = await db.studentNote.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("Student notes list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/students/notes — Add a note to a student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, note, isFlagged } = body;

    if (!studentId || !note) {
      return NextResponse.json(
        { error: "studentId and note are required" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, instituteId: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const studentNote = await db.studentNote.create({
      data: {
        studentId,
        note,
        isFlagged: isFlagged || false,
      },
    });

    // Add timeline entry
    await db.studentTimeline.create({
      data: {
        studentId,
        instituteId: student.instituteId,
        type: "note_added",
        description: `Note added: ${note.substring(0, 100)}${note.length > 100 ? "..." : ""}`,
      },
    });

    return NextResponse.json({ note: studentNote }, { status: 201 });
  } catch (error: any) {
    console.error("Create student note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/students/notes?id=xxx — Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("id");

    if (!noteId) {
      return NextResponse.json(
        { error: "Note id is required" },
        { status: 400 }
      );
    }

    await db.studentNote.delete({
      where: { id: noteId },
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