/**
 * AI Utilities - Internal Mutations
 *
 * Helper functions for AI assistance logging and data management
 */

import { internalMutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";

/**
 * Log AI usage to audit trail
 */
export const logAIUsage = internalMutation({
  args: {
    userId: v.string(),
    assistantType: v.union(
      v.literal("proposal_fit_analysis"),
      v.literal("proposal_writing"),
      v.literal("evaluation_support"),
      v.literal("project_management"),
      v.literal("financial_reporting"),
      v.literal("analytics")
    ),
    entityType: v.union(
      v.literal("proposal"),
      v.literal("evaluation"),
      v.literal("project"),
      v.literal("transaction"),
      v.literal("report")
    ),
    entityId: v.string(),
    action: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimatedCost: v.number(),
    responseAccepted: v.optional(v.boolean()),
    userModified: v.optional(v.boolean()),
    feedbackRating: v.optional(v.number()),
    feedbackComment: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args: {
    userId: string;
    assistantType: "proposal_fit_analysis" | "proposal_writing" | "evaluation_support" | "project_management" | "financial_reporting" | "analytics";
    entityType: "proposal" | "evaluation" | "project" | "transaction" | "report";
    entityId: string;
    action: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    responseAccepted?: boolean;
    userModified?: boolean;
    feedbackRating?: number;
    feedbackComment?: string;
  }) => {
    // Cast userId string to Id type and look up in users table
    const userId = args.userId as any;

    try {
      // Verify the user exists by trying to get it
      const user = await ctx.db.get(userId);

      if (!user) {
        throw new Error(`User not found: ${args.userId}`);
      }
    } catch (error) {
      throw new Error(`Invalid user ID or user not found: ${args.userId}`);
    }

    await ctx.db.insert("aiAssistanceLog", {
      userId: userId,
      assistantType: args.assistantType,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      estimatedCost: args.estimatedCost,
      responseAccepted: args.responseAccepted,
      userModified: args.userModified,
      feedbackRating: args.feedbackRating,
      feedbackComment: args.feedbackComment,
      createdAt: Date.now(),
    });
  },
});
