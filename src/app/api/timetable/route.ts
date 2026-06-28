import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const branchId = searchParams.get("branchId");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId, isActive: true };
    if (branchId) where.branchId = branchId;

    const slots = await db.timetableSlot.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Enrich with batch, teacher, hall, branch data
    const batchIds = [...new Set(slots.map((s) => s.batchId).filter(Boolean))];
    const teacherIds = [...new Set(slots.map((s) => s.teacherId).filter(Boolean))];
    const hallIds = [...new Set(slots.map((s) => s.hallId).filter(Boolean))];
    const branchIds = [...new Set(slots.map((s) => s.branchId).filter(Boolean))];

    const [batches, teachers, halls, branches, subjects] = await Promise.all([
      batchIds.length > 0
        ? db.batch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, name: true, subjectId: true },
          })
        : [],
      teacherIds.length > 0
        ? db.teacher.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [],
      hallIds.length > 0
        ? db.hall.findMany({
            where: { id: { in: hallIds } },
            select: { id: true, name: true, capacity: true },
          })
        : [],
      branchIds.length > 0
        ? db.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : [],
      db.subject.findMany({ select: { id: true, name: true, code: true, color: true } }),
    ]);

    const batchMap = new Map(batches.map((b) => [b.id, b]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const hallMap = new Map(halls.map((h) => [h.id, h]));
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const enrichedSlots = slots.map((s) => {
      const batch = batchMap.get(s.batchId);
      return {
        ...s,
        batch: batch
          ? { ...batch, subject: batch.subjectId ? subjectMap.get(batch.subjectId) || null : null }
          : null,
        teacher: s.teacherId ? teacherMap.get(s.teacherId) || null : null,
        hall: s.hallId ? hallMap.get(s.hallId) || null : null,
        branch: s.branchId ? branchMap.get(s.branchId) || null : null,
      };
    });

    // Group by day of week
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timetable: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      timetable[days[i]] = [];
    }
    for (const slot of enrichedSlots) {
      const dayName = days[slot.dayOfWeek] || "Unknown";
      timetable[dayName].push(slot);
    }

    return NextResponse.json({
      timetable,
      slots: enrichedSlots,
    });
  } catch (error: any) {
    console.error("Timetable error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}