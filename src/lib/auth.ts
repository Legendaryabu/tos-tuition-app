import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Auth helper utilities for TBM OS
 * Handles password hashing, session validation, and permission checks.
 * Uses plain password comparison by default. Replace with bcrypt in production.
 */

// Simple hash function (replace with bcrypt in production)
export async function hashPassword(password: string): Promise<string> {
  // For now, store as-is. In production, use bcrypt:
  // import bcrypt from 'bcrypt';
  // return bcrypt.hash(password, 10);
  return password;
}

// Verify password (replace with bcrypt in production)
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  // For now, direct comparison. In production, use bcrypt:
  // import bcrypt from 'bcrypt';
  // return bcrypt.compare(plainPassword, hashedPassword);
  return plainPassword === hashedPassword;
}

// Get authenticated user from request headers
// Expects: x-user-id and x-institute-id headers (set by client after login)
export async function getAuthUser(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const instituteId = request.headers.get("x-institute-id");

  if (!userId) {
    return { user: null, error: "Authentication required" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      type: true,
      instituteId: true,
      status: true,
      profilePhoto: true,
    },
  });

  if (!user || user.status !== "active") {
    return { user: null, error: "User not found or inactive" };
  }

  return {
    user: {
      ...user,
      instituteId: instituteId || user.instituteId,
    },
    instituteId: instituteId || user.instituteId,
    error: null,
  };
}

// Check if user is owner of the institute
export async function isInstituteOwner(
  userId: string,
  instituteId: string
): Promise<boolean> {
  const institute = await db.institute.findFirst({
    where: { id: instituteId, ownerId: userId },
  });
  return !!institute;
}

// Check if user has access to the institute
export async function hasInstituteAccess(
  userId: string,
  instituteId: string
): Promise<boolean> {
  if (!userId || !instituteId) return false;

  // Super admin has access to all
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { type: true, instituteId: true },
  });

  if (!user) return false;
  if (user.type === "super_admin") return true;
  if (user.type === "owner") {
    const institute = await db.institute.findFirst({
      where: { id: instituteId, ownerId: userId },
    });
    return !!institute;
  }

  return user.instituteId === instituteId;
}

// Generate next student number based on institute prefix
export async function generateStudentNumber(
  instituteId: string
): Promise<string> {
  const institute = await db.institute.findUnique({
    where: { id: instituteId },
    select: { studentNumberPrefix: true, studentNumberSeq: true },
  });

  if (!institute) {
    throw new Error("Institute not found");
  }

  const seq = String(institute.studentNumberSeq).padStart(4, "0");
  const studentNumber = `${institute.studentNumberPrefix}${seq}`;

  // Increment the sequence
  await db.institute.update({
    where: { id: instituteId },
    data: { studentNumberSeq: institute.studentNumberSeq + 1 },
  });

  return studentNumber;
}

// Generate next receipt number based on institute prefix
export async function generateReceiptNumber(
  instituteId: string
): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Find existing receipts this month to determine next number
  const receiptCount = await db.receipt.count({
    where: {
      instituteId,
      issueDate: {
        gte: new Date(year, today.getMonth(), 1),
        lt: new Date(year, today.getMonth() + 1, 1),
      },
    },
  });

  const seq = String(receiptCount + 1).padStart(4, "0");

  const institute = await db.institute.findUnique({
    where: { id: instituteId },
    select: { receiptPrefix: true },
  });

  return `${institute?.receiptPrefix || "RCP"}${year}${month}${seq}`;
}