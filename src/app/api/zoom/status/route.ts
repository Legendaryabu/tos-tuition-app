import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getZoomAccessToken, getCurrentUser } from "@/lib/zoom";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: {
        zoomEnabled: true,
        zoomAccountId: true,
        zoomApiKey: true,
        zoomAccessToken: true,
        zoomRefreshToken: true,
        zoomTokenExpiresAt: true,
      },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    // If credentials exist, try to verify the connection is still valid
    let isLive = false;
    let zoomUser: any = null;

    if (institute.zoomEnabled && institute.zoomAccountId && institute.zoomApiKey && institute.zoomApiSecret) {
      try {
        const token = await getZoomAccessToken(
          institute.zoomAccountId,
          institute.zoomApiKey,
          institute.zoomApiSecret,
          instituteId
        );
        zoomUser = await getCurrentUser(token);
        isLive = true;
      } catch {
        isLive = false;
      }
    }

    return NextResponse.json({
      connected: institute.zoomEnabled,
      isLive,
      hasCredentials: !!(institute.zoomApiKey && institute.zoomAccountId),
      zoomUser: zoomUser ? {
        email: zoomUser.email,
        displayName: zoomUser.display_name,
        planType: zoomUser.plan_type,
      } : null,
      tokenExpiresAt: institute.zoomTokenExpiresAt,
    });
  } catch (error: any) {
    console.error("Zoom status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}