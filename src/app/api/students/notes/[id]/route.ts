import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { note } = await request.json();

    if (!note?.trim()) {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }

    const updated = await db.studentNote.update({
      where: { id },
      data: { note: note.trim() },
    });

    return NextResponse.json({ note: updated });
  } catch (error: any) {
    console.error("Update note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.studentNote.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}