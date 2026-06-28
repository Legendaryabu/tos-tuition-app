import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getZoomAccessToken, getCurrentUser } from "@/lib/zoom";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instituteId, accountId, clientId, clientSecret } = body;

    if (!instituteId || !accountId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "instituteId, accountId, clientId, and clientSecret are required" },
        { status: 400 }
      );
    }

    // Verify institute exists
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    // Step 1: Try to get an access token from Zoom (real API call)
    let accessToken: string | null = null;
    let zoomUser: any = null;
    let connectionError: string | null = null;

    try {
      accessToken = await getZoomAccessToken(accountId, clientId, clientSecret, instituteId);

      // Step 2: Verify the token by fetching user info
      zoomUser = await getCurrentUser(accessToken);
    } catch (err: any) {
      connectionError = err.message || "Failed to connect to Zoom API";
      console.error("Zoom connection test failed:", connectionError);
    }

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: connectionError,
        message: "Could not verify your Zoom credentials. Please double-check your Account ID, Client ID, and Client Secret.",
      }, { status: 400 });
    }

    // Step 3: Save credentials to database
    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const updated = await db.institute.update({
      where: { id: instituteId },
      data: {
        zoomAccountId: accountId,
        zoomApiKey: clientId,
        zoomApiSecret: clientSecret,
        zoomAccessToken: accessToken,
        zoomTokenExpiresAt: tokenExpiresAt,
        zoomEnabled: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        instituteId,
        description: `Zoom account connected: ${zoomUser?.email || zoomUser?.display_name || "Unknown"}`,
        subjectType: "Institute",
      },
    });

    return NextResponse.json({
      success: true,
      zoomEnabled: true,
      message: "Zoom account connected successfully!",
      zoomUser: {
        email: zoomUser?.email,
        displayName: zoomUser?.display_name,
        accountNumber: zoomUser?.account_number,
        planType: zoomUser?.plan_type,
      },
    });
  } catch (error: any) {
    console.error("Zoom connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    await db.institute.update({
      where: { id: instituteId },
      data: {
        zoomEnabled: false,
        zoomAccessToken: null,
        zoomRefreshToken: null,
        zoomTokenExpiresAt: null,
      },
    });

    await db.activityLog.create({
      data: {
        instituteId,
        description: "Zoom account disconnected",
        subjectType: "Institute",
      },
    });

    return NextResponse.json({
      success: true,
      zoomEnabled: false,
      message: "Zoom account disconnected",
    });
  } catch (error: any) {
    console.error("Zoom disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}