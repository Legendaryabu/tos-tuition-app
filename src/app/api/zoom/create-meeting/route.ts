import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getZoomAccessToken, createZoomMeeting } from "@/lib/zoom";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instituteId,
      batchId,
      classSessionId,
      teacherId,
      topic,
      duration,
      scheduledTime,
      hostEmail,
      enableRecording,
      enableWaitingRoom,
    } = body;

    if (!instituteId || !topic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get institute Zoom credentials
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: {
        zoomEnabled: true,
        zoomAccountId: true,
        zoomApiKey: true,
        zoomApiSecret: true,
        zoomAccessToken: true,
        zoomTokenExpiresAt: true,
      },
    });

    if (!institute?.zoomEnabled || !institute.zoomAccountId || !institute.zoomApiKey || !institute.zoomApiSecret) {
      return NextResponse.json(
        { error: "Zoom is not configured for this institute. Please connect your Zoom account first." },
        { status: 400 }
      );
    }

    // Get a fresh access token (handles refresh automatically)
    const accessToken = await getZoomAccessToken(
      institute.zoomAccountId,
      institute.zoomApiKey,
      institute.zoomApiSecret,
      instituteId
    );

    // Create the meeting on Zoom
    const zoomMeeting = await createZoomMeeting(accessToken, {
      topic,
      type: scheduledTime ? 2 : 1,
      startTime: scheduledTime,
      duration: duration || 60,
      hostEmail: hostEmail || undefined,
      settings: {
        host_video: true,
        participant_video: false,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: enableWaitingRoom ?? false,
        auto_recording: enableRecording ? "cloud" : "none",
        meeting_authentication: false,
      },
    });

    // Save to database
    const meeting = await db.zoomMeeting.create({
      data: {
        instituteId,
        batchId: batchId || null,
        classSessionId: classSessionId || null,
        teacherId: teacherId || null,
        zoomMeetingId: zoomMeeting.id,
        zoomMeetingNumber: parseInt(zoomMeeting.id) || null,
        topic: zoomMeeting.topic || topic,
        hostEmail: zoomMeeting.host_email || hostEmail || null,
        joinUrl: zoomMeeting.join_url,
        startUrl: zoomMeeting.start_url,
        passcode: zoomMeeting.password,
        status: "scheduled",
        startTime: zoomMeeting.start_time ? new Date(zoomMeeting.start_time) : (scheduledTime ? new Date(scheduledTime) : null),
        durationMinutes: zoomMeeting.duration || duration || 60,
        tbosCreated: true,
        settings: JSON.stringify(zoomMeeting.settings),
      },
    });

    // Update class session if linked
    if (classSessionId) {
      await db.classSession.update({
        where: { id: classSessionId },
        data: {
          isOnline: true,
          onlinePlatform: "zoom",
          onlineMeetingUrl: zoomMeeting.join_url,
          onlineMeetingId: zoomMeeting.id,
          onlinePasscode: zoomMeeting.password,
        },
      });
    }

    // Log activity
    await db.activityLog.create({
      data: {
        instituteId,
        description: `Zoom meeting created: ${topic}`,
        subjectType: "ZoomMeeting",
        subjectId: meeting.id,
      },
    });

    return NextResponse.json({
      success: true,
      meeting,
      zoom: zoomMeeting,
    });
  } catch (error: any) {
    console.error("Create Zoom meeting error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Zoom meeting" },
      { status: 500 }
    );
  }
}