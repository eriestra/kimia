import {
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";

const ADMIN_ROLES = ["sysadmin", "admin"] as const;

type GenericCtx = MutationCtx | QueryCtx;

async function getCurrentProfile(ctx: GenericCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) {
    throw new Error("User profile not found");
  }

  return { userId, profile } as const;
}

export async function logActivity(
  ctx: GenericCtx,
  activity: {
    userId?: Id<"users">;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const actorId =
    activity.userId ?? (await auth.getUserId(ctx));
  if (!actorId) {
    throw new Error("Unable to determine actor for activity log");
  }

  await ctx.db.insert("activities", {
    userId: actorId,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    details: activity.details,
    ipAddress: activity.ipAddress,
    userAgent: activity.userAgent,
    timestamp: Date.now(),
  });
}

export const listRecentActivities = query({
  args: {
    limit: v.optional(v.number()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (
    ctx: QueryCtx,
    { limit, entityType, entityId }: { limit?: number; entityType?: string; entityId?: string }
  ) => {
    const { profile } = await getCurrentProfile(ctx);
    if (!ADMIN_ROLES.includes(profile.role as (typeof ADMIN_ROLES)[number])) {
      throw new Error("Unauthorized");
    }

    const resolvedLimit = Math.min(limit ?? 50, 200);

    let records: any[] = [];
    if (entityType && entityId) {
      records = await ctx.db
        .query("activities")
        .withIndex("by_entity", (q: any) =>
          q.eq("entityType", entityType).eq("entityId", entityId)
        )
        .order("desc")
        .take(resolvedLimit);
    } else {
      records = await ctx.db
        .query("activities")
        .withIndex("by_timestamp", (q: any) => q)
        .order("desc")
        .take(resolvedLimit);
    }

    const userIds = Array.from(
      new Set(records.map((record) => record.userId as Id<"users">))
    );

    const userDetails = await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        const profileRecord = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", userId))
          .first();
        return {
          userId,
          user,
          profile: profileRecord,
        };
      })
    );

    const userMap = new Map<
      Id<"users">,
      {
        name: string;
        email: string;
        role: string;
      }
    >();

    for (const detail of userDetails) {
      if (detail.user) {
        userMap.set(detail.userId, {
          name: detail.user.name ?? "",
          email: detail.user.email ?? "",
          role: detail.profile?.role ?? "unknown",
        });
      }
    }

    return records.map((record) => ({
      _id: record._id,
      userId: record.userId,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      details: record.details,
      ipAddress: record.ipAddress ?? null,
      userAgent: record.userAgent ?? null,
      timestamp: record.timestamp,
      user: userMap.get(record.userId as Id<"users">) ?? null,
    }));
  },
});
