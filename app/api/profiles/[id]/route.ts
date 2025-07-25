import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserGroup from "@/models/UserGroup";
import ProfileTransaction from "@/models/ProfileTransaction";
import ProfileBudget from "@/models/ProfileBudget";
import mongoose from "mongoose";
import { createError, withErrorHandling } from "@/lib/error-handler";

/**
 * Update a group or its profiles
 * Wrapped with error handling middleware
 */
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  await dbConnect();
  const body = await request.json();

  // Validate MongoDB ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError.validation("Invalid group ID format");
  }

  const group = await UserGroup.findById(id);
  if (!group) {
    throw createError.notFound("Group not found");
  }

  // Validate request body
  if (!body.name || !body.name.trim()) {
    throw createError.validation("Group name is required");
  }

  if (!Array.isArray(body.profiles) || body.profiles.length === 0) {
    throw createError.validation("At least one profile is required");
  }

  // Update group properties
  group.name = body.name.trim();
  group.profiles = body.profiles;

  try {
    const updatedGroup = await group.save();
    return NextResponse.json(updatedGroup);
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      throw createError.validation("Validation failed", validationErrors);
    }
    
    throw createError.database("Failed to update user group", error);
  }
});

/**
 * Delete a group or a specific profile
 * Wrapped with error handling middleware
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const profileIdToDelete = searchParams.get('profileId');

  // Validate MongoDB ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError.validation("Invalid group ID format");
  }

  await dbConnect();

  // If a profileId is provided, delete only that profile
  if (profileIdToDelete) {
    // Validate profile ID format
    if (!mongoose.Types.ObjectId.isValid(profileIdToDelete)) {
      throw createError.validation("Invalid profile ID format");
    }

    const group = await UserGroup.findById(id);
    if (!group) {
      throw createError.notFound("Group not found");
    }

    // Prevent deleting the last profile in a group
    if (group.profiles.length <= 1) {
      throw createError.validation("Cannot delete the last profile in a group. Delete the group instead.");
    }
    
    // Pull the profile from the array
    group.profiles.pull({ _id: new mongoose.Types.ObjectId(profileIdToDelete) });
    
    // Also delete associated transactions and budgets
    await ProfileTransaction.deleteMany({ profileId: profileIdToDelete });
    await ProfileBudget.deleteMany({ profileId: profileIdToDelete });

    await group.save();
    return NextResponse.json(group);

  } else {
    // If no profileId, delete the entire group and all its associated data
    const group = await UserGroup.findByIdAndDelete(id);
    if (!group) {
      throw createError.notFound("Group not found");
    }
    
    // Delete all associated transactions and budgets for the entire group
    await ProfileTransaction.deleteMany({ groupId: id });
    await ProfileBudget.deleteMany({ groupId: id });

    return NextResponse.json({
      success: true,
      message: "Group deleted successfully"
    });
  }
});