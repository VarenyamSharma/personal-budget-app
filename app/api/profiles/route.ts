import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserGroup from "@/models/UserGroup";
import { createError, withErrorHandling } from "@/lib/error-handler";

/**
 * GET handler for fetching all user groups
 * Wrapped with error handling middleware
 */
export const GET = withErrorHandling(async () => {
  await dbConnect();
  const groups = await UserGroup.find({}).lean();
  
  if (!groups || groups.length === 0) {
    // Return empty array instead of 404 - it's a valid state to have no groups
    return NextResponse.json([]);
  }
  
  return NextResponse.json(groups);
});

/**
 * POST handler for creating a new user group
 * Wrapped with error handling middleware
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  await dbConnect();
  const body = await request.json();

  // Validate name
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    throw createError.validation("Group name is required");
  }

  // Validate group type
  const allowedGroupTypes = ['family', 'roommates', 'personal', 'other', 'friends'];
  if (!body.type || !allowedGroupTypes.includes(body.type)) {
    throw createError.validation(
      `Valid group type is required. Must be one of: ${allowedGroupTypes.join(', ')}`
    );
  }

  // Validate profiles
  if (!Array.isArray(body.profiles) || body.profiles.length === 0) {
    throw createError.validation("At least one profile is required");
  }

  for (const profile of body.profiles) {
    if (!profile.name || typeof profile.name !== "string" || profile.name.trim() === "") {
      throw createError.validation("Each profile must have a valid name");
    }
  }

  // Create and save the new group
  const group = new UserGroup({
    name: body.name.trim(),
    type: body.type,
    profiles: body.profiles.map((p: any) => ({
      name: p.name.trim(),
      avatar: p.avatar || '',
      color: p.color || '#3B82F6',
    })),
  });

  try {
    const savedGroup = await group.save();
    return NextResponse.json(savedGroup, { status: 201 });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      throw createError.validation("Validation failed", validationErrors);
    }
    
    // Re-throw other errors to be handled by the wrapper
    throw createError.database("Failed to create user group", error);
  }
});