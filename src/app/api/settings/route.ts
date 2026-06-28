import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");
    const group = searchParams.get("group");

    if (!instituteId) {
      return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
    }

    const where: any = { instituteId };
    if (group) where.group = group;

    const settings = await db.instituteSetting.findMany({
      where,
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    // Convert to key-value object grouped by group
    const grouped: Record<string, Record<string, any>> = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = {
        value: s.value,
        type: s.type,
      };
    }

    return NextResponse.json({ settings, grouped });
  } catch (error: any) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { instituteId, settings } = body;

    if (!instituteId || !settings) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const results = [];

    for (const [key, data] of Object.entries(settings)) {
      const { value, type, group } = data as any;

      const existing = await db.instituteSetting.findUnique({
        where: {
          instituteId_key: { instituteId, key },
        },
      });

      if (existing) {
        const updated = await db.instituteSetting.update({
          where: { id: existing.id },
          data: {
            value: String(value),
            type: type || existing.type,
            group: group || existing.group,
          },
        });
        results.push(updated);
      } else {
        const created = await db.instituteSetting.create({
          data: {
            instituteId,
            key,
            value: String(value),
            type: type || "string",
            group: group || "general",
          },
        });
        results.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      settings: results,
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}