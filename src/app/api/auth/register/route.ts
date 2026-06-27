import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      instituteName,
      instituteType,
      city,
      district,
    } = body;

    if (!firstName || !lastName || !email || !password || !instituteName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Check if institute slug exists
    const slug = instituteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const existingInstitute = await db.institute.findUnique({ where: { slug } });
    if (existingInstitute) {
      return NextResponse.json(
        { error: "Institute name already taken" },
        { status: 409 }
      );
    }

    // Get or create Free plan
    let plan = await db.plan.findFirst({ where: { slug: "free" } });
    if (!plan) {
      plan = await db.plan.create({
        data: {
          name: "Free",
          slug: "free",
          priceMonthly: 0,
          priceYearly: 0,
          currency: "LKR",
          maxStudents: 50,
          maxTeachers: 5,
          maxBranches: 2,
          isActive: true,
          trialDays: 30,
        },
      });
    }

    // Create user
    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        password, // Plain text for demo; use bcrypt hash in production
        mobile: phone,
        type: "owner",
        status: "active",
      },
    });

    // Create institute
    const institute = await db.institute.create({
      data: {
        name: instituteName,
        slug,
        type: instituteType || "individual",
        phone: phone || "",
        email,
        city: city || "Colombo",
        district: district || "Colombo",
        currency: "LKR",
        timezone: "Asia/Colombo",
        isActive: true,
        onboardingCompleted: false,
        planId: plan.id,
        ownerId: user.id,
      },
    });

    // Update user with instituteId
    await db.user.update({
      where: { id: user.id },
      data: { instituteId: institute.id },
    });

    // Create subscription
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + (plan.trialDays || 14));
    const subEnd = new Date();
    subEnd.setFullYear(subEnd.getFullYear() + 1);

    await db.subscription.create({
      data: {
        instituteId: institute.id,
        planId: plan.id,
        status: "trial",
        billingCycle: "monthly",
        amount: 0,
        currency: "LKR",
        startedAt: new Date(),
        endsAt: subEnd,
        trialEndsAt: trialEnd,
      },
    });

    // Create default settings
    await db.instituteSetting.createMany({
      data: [
        { instituteId: institute.id, key: "attendance_method", value: "manual", type: "string", group: "attendance" },
        { instituteId: institute.id, key: "language", value: "en", type: "string", group: "general" },
        { instituteId: institute.id, key: "timezone", value: "Asia/Colombo", type: "string", group: "general" },
      ],
    });

    // Activity log
    await db.activityLog.create({
      data: {
        instituteId: institute.id,
        description: "Institute created",
        subjectType: "Institute",
        causerId: user.id,
      },
    });

    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        institute,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}