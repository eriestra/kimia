/**
 * Migration functions to fix data issues
 */

import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create missing userProfile for existing admin user
 */
export const createMissingAdminProfile = mutation({
  args: {
    userId: v.string(),
    role: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
  },
  handler: async (ctx: MutationCtx, args: any) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .first();

    if (existingProfile) {
      return { success: true, message: "Profile already exists", profileId: existingProfile._id };
    }

    // Create the profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      role: args.role,
      active: true,
      createdAt: Date.now(),
    });

    return { success: true, message: "Profile created", profileId };
  },
});

/**
 * Migrate legacy role names to current role names
 * Example: Use this to rename roles during schema updates
 */
export const migrateLegacyRolesToCurrent = mutation({
  args: {
    fromRole: v.string(),
    toRole: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
  },
  handler: async (ctx: MutationCtx, args: any) => {
    // Update userProfiles
    const userProfiles = await ctx.db.query("userProfiles").collect();
    let updatedProfiles = 0;

    for (const profile of userProfiles) {
      if ((profile as any).role === args.fromRole) {
        await ctx.db.patch(profile._id, { role: args.toRole });
        updatedProfiles++;
      }
    }

    // Update userInvitations
    const invitations = await ctx.db.query("userInvitations").collect();
    let updatedInvitations = 0;

    for (const invitation of invitations) {
      if ((invitation as any).role === args.fromRole) {
        await ctx.db.patch(invitation._id, { role: args.toRole });
        updatedInvitations++;
      }
    }

    return {
      success: true,
      message: `Migration complete: Updated ${updatedProfiles} profiles and ${updatedInvitations} invitations`,
      updatedProfiles,
      updatedInvitations,
    };
  },
});
