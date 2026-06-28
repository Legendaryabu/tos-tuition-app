import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meeting = await db.zoomMeeting.findUnique({ where: { id } });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Fetch related data
    const [institute, batch, teacher, classSession, subject] = await Promise.all([
      db.institute.findUnique({
        where: { id: meeting.instituteId },
        select: { name: true, zoomEnabled: true },
      }),
      meeting.batchId
        ? db.batch.findUnique({ where: { id: meeting.batchId } })
        : null,
      meeting.teacherId
        ? db.teacher.findUnique({
            where: { id: meeting.teacherId },
            select: { id: true, firstName: true, lastName: true },
          })
        : null,
      meeting.classSessionId
        ? db.classSession.findUnique({
            where: { id: meeting.classSessionId },
            select: { sessionDate: true, topic: true, startTime: true, endTime: true },
          })
        : null,
      batch?.subjectId
        ? db.subject.findUnique({ where: { id: batch.subjectId } })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      meeting: {
        ...meeting,
        institute: institute || null,
        batch: batch ? { ...batch, subject } : null,
        teacher: teacher || null,
        classSession: classSession || null,
      },
    });
  } catch (error: any) {
    console.error("Zoom meeting detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}