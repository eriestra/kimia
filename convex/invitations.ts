/**
 * User Invitation System
 *
 * Admin-controlled user provisioning via email invitations.
 * Users receive a secure token link to register with pre-assigned role.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

/**
 * Create a new user invitation (Admin only)
 * Generates secure token and stores invitation record
 */
export const createInvitation = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
    campus: v.optional(v.string()),
    department: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    // 1. Check authentication and permissions
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
      throw new Error("Unauthorized: Only admins can invite users");
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // 3. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // 4. Check for pending invitation
    const existingInvitation = await ctx.db
      .query("userInvitations")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error(
        "An invitation for this email is already pending. Resend or cancel it first."
      );
    }

    // 5. Generate secure token (UUID v4)
    const token = crypto.randomUUID();

    // 6. Calculate expiry (7 days from now)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // 7. Create invitation record
    const invitationId = await ctx.db.insert("userInvitations", {
      email: args.email,
      token,
      role: args.role,
      campus: args.campus,
      department: args.department,
      message: args.message,
      status: "pending",
      invitedBy: userId as any,
      expiresAt,
      createdAt: Date.now(),
    });

    // 8. Log audit trail
    await ctx.db.insert("activities", {
      userId: userId as any,
      action: "user_invited",
      entityType: "userInvitation",
      entityId: invitationId,
      details: {
        invitedEmail: args.email,
        role: args.role,
        campus: args.campus,
        department: args.department,
      },
      timestamp: Date.now(),
    });

    // 9. Return invitation details (frontend will send email)
    return {
      invitationId,
      token,
      email: args.email,
      role: args.role,
      expiresAt,
    };
  },
});

/**
 * Accept invitation and create user account
 * Called when user clicks invitation link and completes registration
 */
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    // 1. Find invitation by token
    const invitation = await ctx.db
      .query("userInvitations")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    // 2. Check invitation status and expiry
    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been used or expired");
    }

    if (Date.now() > invitation.expiresAt) {
      // Mark as expired
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired. Please request a new one.");
    }

    // 3. Check if email is already registered (race condition protection)
    const existingUser = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("email"), invitation.email))
      .first();

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // 4. Validate password strength
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // 5. Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // 6. Log audit trail
    await ctx.db.insert("activities", {
      userId: invitation.invitedBy,
      action: "invitation_accepted",
      entityType: "userInvitation",
      entityId: invitation._id,
      details: {
        acceptedEmail: invitation.email,
        role: invitation.role,
      },
      timestamp: Date.now(),
    });

    // 7. Return success with registration details (Convex Auth will handle actual user creation)
    return {
      email: invitation.email,
      name: args.name,
      role: invitation.role,
      campus: invitation.campus,
      department: invitation.department,
    };
  },
});

/**
 * Get invitation by token (for registration page)
 */
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx: any, { token }: any) => {
    const invitation = await ctx.db
      .query("userInvitations")
      .withIndex("by_token", (q: any) => q.eq("token", token))
      .first();

    if (!invitation) {
      return null;
    }

    // Don't return if expired or already accepted
    if (invitation.status !== "pending" || Date.now() > invitation.expiresAt) {
      return null;
    }

    return {
      email: invitation.email,
      role: invitation.role,
      campus: invitation.campus,
      department: invitation.department,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
    };
  },
});

/**
 * List all invitations (Admin only)
 */
export const listInvitations = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired"))
    ),
  },
  handler: async (ctx: any, { status }: any) => {
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

    let invitations;
    if (status) {
      invitations = await ctx.db
        .query("userInvitations")
        .withIndex("by_status", (q: any) => q.eq("status", status))
        .collect();
    } else {
      invitations = await ctx.db.query("userInvitations").collect();
    }

    // Get inviter details
    return await Promise.all(
      invitations.map(async (inv: any) => {
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          ...inv,
          inviterName: inviter?.name || "Unknown",
          inviterEmail: inviter?.email || "",
        };
      })
    );
  },
});

/**
 * Resend invitation (generates new token, extends expiry)
 */
export const resendInvitation = mutation({
  args: { invitationId: v.id("userInvitations") },
  handler: async (ctx: any, { invitationId }: any) => {
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
      throw new Error("Unauthorized: Only admins can resend invitations");
    }

    const invitation = await ctx.db.get(invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomUUID();
    const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(invitationId, {
      token: newToken,
      status: "pending",
      expiresAt: newExpiresAt,
    });

    // Log audit trail
    await ctx.db.insert("activities", {
      userId: userId as any,
      action: "invitation_resent",
      entityType: "userInvitation",
      entityId: invitationId,
      details: {
        email: invitation.email,
      },
      timestamp: Date.now(),
    });

    return {
      invitationId,
      token: newToken,
      email: invitation.email,
      expiresAt: newExpiresAt,
    };
  },
});

/**
 * Cancel/delete invitation (Admin only)
 */
export const cancelInvitation = mutation({
  args: { invitationId: v.id("userInvitations") },
  handler: async (ctx: any, { invitationId }: any) => {
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
      throw new Error("Unauthorized: Only admins can cancel invitations");
    }

    const invitation = await ctx.db.get(invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Delete invitation
    await ctx.db.delete(invitationId);

    // Log audit trail
    await ctx.db.insert("activities", {
      userId: userId as any,
      action: "invitation_cancelled",
      entityType: "userInvitation",
      entityId: invitationId,
      details: {
        email: invitation.email,
        role: invitation.role,
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
