/**
 * Assignment Matrix Functions
 *
 * Provides the global switchboard view for proposal-evaluator assignments.
 * Includes AI-powered matching, conflict detection, and workload balancing.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

const ADMIN_ROLES = ["sysadmin", "admin"] as const;

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]);
}

/**
 * Get global assignment matrix data
 * Returns all proposals and evaluators with their match scores and assignment status
 */
export const getGlobalMatrix = query({
  args: {
    callIds: v.optional(v.array(v.id("calls"))), // Filter by specific calls
    proposalStatus: v.optional(v.array(v.string())), // Filter proposals: submitted, under_review, etc.
    evaluatorCampus: v.optional(v.array(v.string())),
    evaluatorDepartment: v.optional(v.array(v.string())),
    evaluatorExpertise: v.optional(v.array(v.string())),
    showOnlyAvailable: v.optional(v.boolean()), // Show only evaluators with capacity
    assignmentStatus: v.optional(v.union(
      v.literal("all"),
      v.literal("needs_assignment"),
      v.literal("partial"),
      v.literal("complete")
    ))
  },
  handler: async (ctx, args) => {
    // Auth check
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !isAdmin(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Fetch all proposals (filtered if needed)
    let proposalsQuery = ctx.db.query("proposals");
    const proposals = await proposalsQuery.collect();

    // Apply filters
    let filteredProposals = proposals;

    if (args.callIds && args.callIds.length > 0) {
      filteredProposals = filteredProposals.filter(p =>
        args.callIds!.includes(p.callId)
      );
    }

    if (args.proposalStatus && args.proposalStatus.length > 0) {
      filteredProposals = filteredProposals.filter(p =>
        args.proposalStatus!.includes(p.status)
      );
    }

    // Fetch all evaluators
    const evaluatorProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "evaluator"))
      .collect();

    // Apply evaluator filters
    let filteredEvaluators = evaluatorProfiles;

    if (args.evaluatorCampus && args.evaluatorCampus.length > 0) {
      filteredEvaluators = filteredEvaluators.filter(e =>
        e.campus && args.evaluatorCampus!.includes(e.campus)
      );
    }

    if (args.evaluatorDepartment && args.evaluatorDepartment.length > 0) {
      filteredEvaluators = filteredEvaluators.filter(e =>
        e.department && args.evaluatorDepartment!.includes(e.department)
      );
    }

    if (args.evaluatorExpertise && args.evaluatorExpertise.length > 0) {
      filteredEvaluators = filteredEvaluators.filter(e =>
        e.researchAreas && e.researchAreas.some(area =>
          args.evaluatorExpertise!.includes(area)
        )
      );
    }

    // Get auth user details for evaluators
    const evaluators = await Promise.all(
      filteredEvaluators.map(async (profile) => {
        const authUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), profile.userId))
          .first();

        // Count current assignments
        const assignments = await ctx.db
          .query("evaluatorAssignments")
          .withIndex("by_evaluator", (q) => q.eq("evaluatorId", profile.userId))
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "accepted")
            )
          )
          .collect();

        const maxCapacity = 5; // TODO: Make this configurable per evaluator
        const currentLoad = assignments.length;
        const availableSlots = maxCapacity - currentLoad;

        return {
          _id: profile.userId,
          name: authUser?.name ?? "Unknown",
          email: authUser?.email ?? "",
          campus: profile.campus,
          department: profile.department,
          researchAreas: profile.researchAreas ?? [],
          currentLoad,
          maxCapacity,
          availableSlots,
          isAvailable: availableSlots > 0,
        };
      })
    );

    // Filter by availability if requested
    const finalEvaluators = args.showOnlyAvailable
      ? evaluators.filter(e => e.isAvailable)
      : evaluators;

    // Build matrix: For each proposal-evaluator pair, get assignment status and match score
    const matrixData = await Promise.all(
      filteredProposals.map(async (proposal) => {
        // Get call info
        const call = await ctx.db.get(proposal.callId);

        // Get PI info
        const pi = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), proposal.principalInvestigator))
          .first();

        // Get existing assignments
        const assignments = await ctx.db
          .query("evaluatorAssignments")
          .withIndex("by_proposal", (q) => q.eq("proposalId", proposal._id))
          .collect();

        const assignmentMap = new Map(
          assignments.map(a => [a.evaluatorId, a])
        );

        // Get match scores for this proposal
        const matches = await ctx.db
          .query("evaluatorMatches")
          .withIndex("by_proposal", (q) => q.eq("proposalId", proposal._id))
          .collect();

        const matchMap = new Map(
          matches.map(m => [m.evaluatorId, m])
        );

        // Build cells for each evaluator
        const cells = finalEvaluators.map((evaluator) => {
          const assignment = assignmentMap.get(evaluator._id);
          const match = matchMap.get(evaluator._id);

          return {
            evaluatorId: evaluator._id,
            evaluatorName: evaluator.name,
            assignment: assignment ? {
              _id: assignment._id,
              status: assignment.status,
              assignedAt: assignment.assignedAt,
              assignedBy: assignment.assignedBy,
              coiDeclared: assignment.coiDeclared,
              declineReason: assignment.declineReason
            } : null,
            match: match ? {
              matchScore: match.matchScore,
              expertiseScore: match.expertiseScore,
              availabilityScore: match.availabilityScore,
              conflictFlags: match.conflictFlags,
              conflictSeverity: match.conflictSeverity,
              reasoning: match.reasoning,
              stale: match.stale
            } : null
          };
        });

        const requiredEvaluators = call?.evaluationSettings.evaluatorsRequired ?? 3;
        const assignedCount = assignments.filter(a =>
          a.status === "accepted" || a.status === "pending"
        ).length;

        // Determine assignment status
        let assignStatus: "needs_assignment" | "partial" | "complete";
        if (assignedCount === 0) {
          assignStatus = "needs_assignment";
        } else if (assignedCount < requiredEvaluators) {
          assignStatus = "partial";
        } else {
          assignStatus = "complete";
        }

        return {
          proposalId: proposal._id,
          proposalTitle: proposal.title,
          callId: proposal.callId,
          callTitle: call?.title ?? "Unknown Call",
          principalInvestigator: pi?.name ?? "Unknown",
          requestedBudget: proposal.budget.total,
          status: proposal.status,
          submittedAt: proposal.submittedAt,
          requiredEvaluators,
          assignedCount,
          assignmentStatus: assignStatus,
          cells
        };
      })
    );

    // Apply assignment status filter
    const finalProposals = args.assignmentStatus && args.assignmentStatus !== "all"
      ? matrixData.filter(p => p.assignmentStatus === args.assignmentStatus)
      : matrixData;

    // Get unique calls for filter options
    const calls = await ctx.db.query("calls").collect();
    const activeCalls = calls.filter(c => c.status === "open" || c.status === "closed");

    // Get unique campuses, departments, expertise areas
    const campuses = [...new Set(evaluatorProfiles.map(e => e.campus).filter(Boolean))];
    const departments = [...new Set(evaluatorProfiles.map(e => e.department).filter(Boolean))];
    const expertiseAreas = [...new Set(
      evaluatorProfiles.flatMap(e => e.researchAreas ?? [])
    )];

    return {
      proposals: finalProposals,
      evaluators: finalEvaluators,
      filterOptions: {
        calls: activeCalls.map(c => ({ _id: c._id, title: c.title })),
        campuses: campuses as string[],
        departments: departments as string[],
        expertiseAreas: expertiseAreas.sort()
      },
      summary: {
        totalProposals: finalProposals.length,
        needsAssignment: finalProposals.filter(p => p.assignmentStatus === "needs_assignment").length,
        partialAssignment: finalProposals.filter(p => p.assignmentStatus === "partial").length,
        fullyAssigned: finalProposals.filter(p => p.assignmentStatus === "complete").length,
        totalEvaluators: finalEvaluators.length,
        availableEvaluators: finalEvaluators.filter(e => e.isAvailable).length,
        atCapacityEvaluators: finalEvaluators.filter(e => !e.isAvailable).length
      }
    };
  }
});

/**
 * Quick assign evaluator to proposal (from matrix drag-drop)
 */
export const quickAssign = mutation({
  args: {
    proposalId: v.id("proposals"),
    evaluatorId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !isAdmin(profile.role)) {
      throw new Error("Unauthorized");
    }

    // Check if already assigned
    const existing = await ctx.db
      .query("evaluatorAssignments")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .filter((q) => q.eq(q.field("evaluatorId"), args.evaluatorId))
      .first();

    if (existing && existing.status !== "removed") {
      throw new Error("Evaluator already assigned to this proposal");
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("evaluatorAssignments", {
      proposalId: args.proposalId,
      evaluatorId: args.evaluatorId,
      assignedBy: userId,
      assignmentMethod: "manual",
      status: "pending",
      coiDeclared: false,
      assignedAt: Date.now()
    });

    // TODO: Send notification to evaluator

    return { assignmentId };
  }
});

/**
 * Unassign evaluator from proposal
 */
export const unassign = mutation({
  args: {
    assignmentId: v.id("evaluatorAssignments")
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !isAdmin(profile.role)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.assignmentId, {
      status: "removed"
    });

    return { success: true };
  }
});
