/**
 * User Management Functions
 *
 * Queries and mutations for managing user profiles in the Kimia platform.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

/**
 * Helper function to check if a role is an admin role
 */
function isAdminRole(role: string): boolean {
  return role === "sysadmin" || role === "admin";
}

/**
 * Get the current authenticated user (combines auth user + profile)
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    console.log('[getCurrentUser] userId:', userId);
    if (!userId) {
      console.log('[getCurrentUser] No userId, returning null');
      return null;
    }

    // Get the base auth user
    const authUser = await ctx.db.get(userId);
    console.log('[getCurrentUser] authUser:', authUser);
    if (!authUser) {
      console.log('[getCurrentUser] No authUser found, returning null');
      return null;
    }

    // Get the extended user profile
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    console.log('[getCurrentUser] userProfile:', userProfile);
    if (!userProfile) {
      console.log('[getCurrentUser] No userProfile found, returning null');
      return null;
    }

    // Combine auth user with profile data
    const result = {
      _id: userId,
      _creationTime: authUser._creationTime,
      email: authUser.email ?? "",
      name: authUser.name ?? "",
      ...userProfile,
    };
    console.log('[getCurrentUser] Returning user:', result);
    return result;
  },
});

/**
 * Get user by ID (combines auth user + profile)
 */
export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const authUser = await ctx.db.get(userId as any);
    if (!authUser) {
      return null;
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (!userProfile) {
      return null;
    }

    return {
      _id: userId,
      _creationTime: authUser._creationTime,
      email: authUser.email ?? "",
      name: authUser.name ?? "",
      ...userProfile,
    };
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }

    const limitValue = Math.min(Math.max(limit ?? 5, 1), 20);

    const authUsers = await ctx.db.query("users").collect();
    const filtered = authUsers
      .filter((user: any) => {
        const email = (user.email ?? "").toLowerCase();
        const name = (user.name ?? "").toLowerCase();
        return email.includes(term) || name.includes(term);
      })
      .slice(0, limitValue);

    return await Promise.all(
      filtered.map(async (user: any) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
          .first();
        return {
          _id: user._id,
          name: user.name ?? "",
          email: user.email ?? "",
          role: profile?.role ?? "faculty",
        };
      })
    );
  },
});

export const getUsersByIds = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, { userIds }) => {
    if (userIds.length === 0) {
      return [];
    }

    const results = await Promise.all(
      userIds.map(async (userId) => {
        const authUser = await ctx.db.get(userId);
        if (!authUser) {
          return null;
        }
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", userId))
          .first();
        return {
          _id: userId,
          name: authUser.name ?? "",
          email: authUser.email ?? "",
          role: profile?.role ?? "faculty",
        };
      })
    );

    return results.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  },
});

/**
 * Create or update user profile after signup
 */
export const createUserProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Update the auth user's name
    await ctx.db.patch(userId as any, {
      name: args.name,
    });

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      // Update the existing profile
      await ctx.db.patch(existingProfile._id, {
        role: args.role,
        active: true,
      });
      return await ctx.db.get(existingProfile._id);
    }

    // Create new user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: userId,
      role: args.role,
      active: true,
      createdAt: Date.now(),
    });

    return await ctx.db.get(profileId);
  },
});

/**
 * Update user profile
 */
export const updateUserProfile = mutation({
  args: {
    campus: v.optional(v.string()),
    department: v.optional(v.string()),
    academicDegree: v.optional(v.string()),
    researchAreas: v.optional(v.array(v.string())),
    orcid: v.optional(v.string()),
    phone: v.optional(v.string()),
    notificationPreferences: v.optional(
      v.object({
        email: v.boolean(),
        platform: v.boolean(),
        digest: v.union(v.literal("none"), v.literal("daily"), v.literal("weekly")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(userProfile._id, {
      ...args,
      lastLogin: Date.now(),
    });

    return await ctx.db.get(userProfile._id);
  },
});

/**
 * Update last login timestamp
 */
export const updateLastLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (userProfile) {
      await ctx.db.patch(userProfile._id, {
        lastLogin: Date.now(),
      });
    }
  },
});

/**
 * Get all users (admin only)
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (!currentUserProfile || (currentUserProfile.role !== "sysadmin" && currentUserProfile.role !== "admin")) {
      throw new Error("Unauthorized: Admin access required");
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    // Fetch auth user details for each profile to get name and email
    const usersWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        const authUser = await ctx.db.get(profile.userId as any);
        return {
          ...profile,
          email: authUser?.email || "",
          name: authUser?.name || "",
        };
      })
    );

    return usersWithDetails;
  },
});

/**
 * Deactivate user (admin only)
 */
export const deactivateUser = mutation({
  args: { userProfileId: v.id("userProfiles") },
  handler: async (ctx, { userProfileId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", currentUserId))
      .first();

    if (!currentUserProfile || currentUserProfile.role !== "sysadmin") {
      throw new Error("Unauthorized: System admin access required");
    }

    await ctx.db.patch(userProfileId, { active: false });
  },
});

/**
 * Approve pending user and assign role (Admin only)
 * Used for self-registered users awaiting approval
 */
export const approveUser = mutation({
  args: {
    userProfileId: v.id("userProfiles"),
    role: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
  },
  handler: async (ctx, { userProfileId, role }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", currentUserId))
      .first();

    if (
      !currentUserProfile ||
      (currentUserProfile.role !== "sysadmin" &&
        currentUserProfile.role !== "admin")
    ) {
      throw new Error("Unauthorized: Admin access required");
    }

    const targetProfile = await ctx.db.get(userProfileId);
    if (!targetProfile) {
      throw new Error("User profile not found");
    }

    // Update user profile with assigned role and active status
    await ctx.db.patch(userProfileId, {
      role,
      status: "active",
      active: true,
      updatedAt: Date.now(),
    });

    // Log audit trail
    await ctx.db.insert("activities", {
      userId: currentUserId as any,
      action: "user_approved",
      entityType: "userProfile",
      entityId: userProfileId,
      details: {
        targetUserId: targetProfile.userId,
        assignedRole: role,
        approvedBy: currentUserId,
      },
      timestamp: Date.now(),
    });

    return { success: true, role };
  },
});

/**
 * Reject pending user (Admin only)
 * Marks user as deactivated with rejection reason
 */
export const rejectUser = mutation({
  args: {
    userProfileId: v.id("userProfiles"),
    reason: v.string(),
  },
  handler: async (ctx, { userProfileId, reason }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", currentUserId))
      .first();

    if (
      !currentUserProfile ||
      (currentUserProfile.role !== "sysadmin" &&
        currentUserProfile.role !== "admin")
    ) {
      throw new Error("Unauthorized: Admin access required");
    }

    const targetProfile = await ctx.db.get(userProfileId);
    if (!targetProfile) {
      throw new Error("User profile not found");
    }

    // Update user profile to deactivated
    await ctx.db.patch(userProfileId, {
      status: "deactivated",
      active: false,
      deactivationReason: reason,
      deactivatedBy: currentUserId as any,
      deactivatedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log audit trail
    await ctx.db.insert("activities", {
      userId: currentUserId as any,
      action: "user_rejected",
      entityType: "userProfile",
      entityId: userProfileId,
      details: {
        targetUserId: targetProfile.userId,
        reason,
        rejectedBy: currentUserId,
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get pending users awaiting approval (Admin only)
 */
export const getPendingUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (
      !currentUserProfile ||
      (currentUserProfile.role !== "sysadmin" &&
        currentUserProfile.role !== "admin")
    ) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all pending users
    const pendingProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .collect();

    // Fetch auth user details for each profile
    const usersWithDetails = await Promise.all(
      pendingProfiles.map(async (profile) => {
        const authUser = await ctx.db.get(profile.userId as any);
        return {
          ...profile,
          email: authUser?.email || "",
          name: authUser?.name || "",
        };
      })
    );

    return usersWithDetails;
  },
});

/**
 * Switch role (localhost only - for testing/demo purposes)
 * Allows any user to temporarily switch their role on localhost to test different interfaces
 * In production, this should be disabled or restricted to sysadmin only
 */
export const switchRole = mutation({
  args: {
    newRole: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
  },
  handler: async (ctx: any, { newRole }: any) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get current user profile
    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (!currentUserProfile) {
      throw new Error("User profile not found");
    }

    // In production, only sysadmin should be able to switch roles
    // For development, allow anyone to switch (dev-only convenience feature)
    // Set CONVEX_ENV=production in production deployments to disable this
    const isDevelopment = process.env.CONVEX_ENV !== "production";

    if (!isDevelopment && currentUserProfile.role !== "sysadmin") {
      throw new Error("Unauthorized: Only system administrators can switch roles in production");
    }

    // Update the role
    await ctx.db.patch(currentUserProfile._id, {
      role: newRole,
      updatedAt: Date.now(),
    });

    return { success: true, newRole };
  },
});

/**
 * Get all evaluators with their profile details (admin-only)
 */
export const getEvaluators = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !isAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all evaluators
    const evaluatorProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "evaluator"))
      .collect();

    // Get auth user details
    const evaluators = await Promise.all(
      evaluatorProfiles.map(async (profile) => {
        const authUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), profile.userId))
          .first();

        return {
          _id: profile.userId,
          name: authUser?.name ?? "Unknown",
          email: authUser?.email ?? "",
          campus: profile.campus,
          department: profile.department,
          academicDegree: profile.academicDegree,
          researchAreas: profile.researchAreas ?? [],
          orcid: profile.orcid,
          cvStorageId: profile.cvStorageId,
          cvFileName: profile.cvFileName,
          cvUploadedAt: profile.cvUploadedAt,
          bio: profile.bio,
          publications: profile.publications ?? [],
          status: profile.status ?? "active",
        };
      })
    );

    return evaluators;
  },
});

/**
 * Update evaluator profile (admin-only)
 */
export const updateEvaluatorProfile = mutation({
  args: {
    userId: v.string(),
    bio: v.optional(v.string()),
    publications: v.optional(v.array(v.string())),
    cvStorageId: v.optional(v.id("_storage")),
    cvFileName: v.optional(v.string()),
    cvUploadedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await auth.getUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const adminProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", adminUserId))
      .first();

    if (!adminProfile || !isAdminRole(adminProfile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get evaluator profile
    const evaluatorProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!evaluatorProfile) {
      throw new Error("Evaluator not found");
    }

    // Update profile
    await ctx.db.patch(evaluatorProfile._id, {
      bio: args.bio,
      publications: args.publications,
      cvStorageId: args.cvStorageId,
      cvFileName: args.cvFileName,
      cvUploadedAt: args.cvUploadedAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Generate upload URL for CV
 */
export const generateCVUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Generate download URL for CV
 */
export const generateCVDownloadUrl = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const requestingUserId = await auth.getUserId(ctx);
    if (!requestingUserId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", requestingUserId))
      .first();

    if (!profile || !isAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get evaluator profile
    const evaluatorProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!evaluatorProfile?.cvStorageId) {
      throw new Error("No CV uploaded");
    }

    return await ctx.storage.getUrl(evaluatorProfile.cvStorageId);
  },
});
