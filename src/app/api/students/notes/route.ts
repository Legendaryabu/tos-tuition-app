import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { studentId, note, isFlagged } = await request.json();

    if (!studentId || !note?.trim()) {
      return NextResponse.json({ error: "studentId and note are required" }, { status: 400 });
    }

    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const created = await db.studentNote.create({
      data: {
        studentId,
        note: note.trim(),
        isFlagged: !!isFlagged,
      },
    });

    // Add timeline entry
    await db.studentTimeline.create({
      data: {
        studentId,
        instituteId: student.instituteId,
        type: "note_added",
        description: isFlagged ? "Important note added" : "Note added",
      },
    });

    return NextResponse.json({ note: created }, { status: 201 });
  } catch (error: any) {
    console.error("Create note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}