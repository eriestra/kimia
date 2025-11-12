/**
 * Evaluation Workflow Functions
 *
 * Provides rubric retrieval plus draft and submission mutations for proposal
 * evaluations. Aligns with Phase 2 roadmap by enabling reviewers to score
 * proposals through Convex-backed storage.
 */

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import { logActivity } from "./activities";

const REVIEWER_ROLES = ["sysadmin", "admin", "evaluator"] as const;
const RECOMMENDATIONS = [
  "approve",
  "approve_with_modifications",
  "reject",
  "revise_and_resubmit",
] as const;

type GenericCtx = QueryCtx | MutationCtx;

type CriterionRecord = {
  _id: Id<"evaluationCriteria">;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
};

function isAdminRole(role: string) {
  return role === "sysadmin" || role === "admin";
}

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

function assertReviewer(role: string) {
  if (!REVIEWER_ROLES.includes(role as (typeof REVIEWER_ROLES)[number])) {
    throw new Error("Reviewer permissions required");
  }
}

function sanitizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function sanitizeStringArray(values: Array<string | null | undefined>) {
  return values.map((value) => sanitizeText(value ?? "")).filter(Boolean);
}

function normalizeRubric(
  criteria: CriterionRecord[],
  submitted: Array<{
    criteriaId: Id<"evaluationCriteria">;
    score?: number | null;
    comments?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>
) {
  const submittedMap = new Map<
    Id<"evaluationCriteria">,
    {
      score?: number | null;
      comments?: string;
      strengths?: string[];
      weaknesses?: string[];
    }
  >();

  for (const item of submitted) {
    submittedMap.set(item.criteriaId, item);
  }

  const missingScores: Array<Id<"evaluationCriteria">> = [];

  const entries = criteria.map((criterion) => {
    const entry = submittedMap.get(criterion._id);
    const score = entry?.score;
    const hasNumericScore = typeof score === "number" && Number.isFinite(score);
    if (!hasNumericScore) {
      missingScores.push(criterion._id);
    }
    const numericScore = hasNumericScore ? score! : 0;

    return {
      criteriaId: criterion._id,
      score: numericScore,
      maxScore: criterion.maxScore,
      comments: sanitizeText(entry?.comments ?? ""),
      strengths: sanitizeStringArray(entry?.strengths ?? []),
      weaknesses: sanitizeStringArray(entry?.weaknesses ?? []),
    };
  });

  return { entries, missingScores };
}

function computeWeightedScore(
  entries: Array<{
    criteriaId: Id<"evaluationCriteria">;
    score: number;
    maxScore: number;
  }>,
  criteria: CriterionRecord[]
) {
  if (entries.length === 0 || criteria.length === 0) {
    return 0;
  }

  const criterionMap = new Map(
    criteria.map((criterion) => [criterion._id, criterion] as const)
  );

  let weightedTotal = 0;
  let weightSum = 0;

  for (const entry of entries) {
    const criterion = criterionMap.get(entry.criteriaId);
    if (!criterion) {
      continue;
    }

    const weight = criterion.weight;
    const maxScore = entry.maxScore;
    const score = entry.score;

    if (maxScore <= 0 || !Number.isFinite(weight)) {
      continue;
    }

    const normalized = Math.max(Math.min(score, maxScore), 0) / maxScore;
    weightedTotal += normalized * weight;
    weightSum += weight;
  }

  if (weightSum <= 0) {
    const rawTotal = entries.reduce((sum, entry) => sum + entry.score, 0);
    const rawMax = entries.reduce((sum, entry) => sum + entry.maxScore, 0);
    if (rawMax <= 0) {
      return 0;
    }
    return Number(((rawTotal / rawMax) * 100).toFixed(2));
  }

  return Number(((weightedTotal / weightSum) * 100).toFixed(2));
}

async function loadProposalAndCriteria(
  ctx: GenericCtx,
  proposalId: Id<"proposals">
) {
  const proposal = await ctx.db.get(proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }

  const call = await ctx.db.get(proposal.callId);
  if (!call) {
    throw new Error("Call configuration missing for proposal");
  }

  const criteriaIds = call.evaluationCriteria ?? [];
  const criteriaRecords = (
    await Promise.all(criteriaIds.map(async (criterionId: any) => ctx.db.get(criterionId)))
  )
    .filter((criterion: any): criterion is CriterionRecord => Boolean(criterion))
    .map((criterion: any) => ({
      _id: criterion._id,
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      maxScore: criterion.maxScore,
    }));

  return { proposal, call, criteria: criteriaRecords } as const;
}

async function ensureReviewerAccess(
  ctx: GenericCtx,
  proposal: {
    assignedEvaluators?: Id<"users">[];
  },
  userId: Id<"users">,
  role: string
) {
  if (isAdminRole(role)) {
    return;
  }

  const assigned = proposal.assignedEvaluators ?? [];
  const isAssigned = assigned.some((id) => id === userId);
  if (!isAssigned) {
    throw new Error("You are not assigned to evaluate this proposal");
  }
}

export const getEvaluationContext = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx: QueryCtx, { proposalId }: { proposalId: Id<"proposals"> }) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertReviewer(profile.role);

    const { proposal, call, criteria } = await loadProposalAndCriteria(ctx, proposalId);
    await ensureReviewerAccess(ctx, proposal, userId, profile.role);

    const evaluation = await ctx.db
      .query("evaluations")
      .withIndex("by_evaluator", (q: any) => q.eq("evaluatorId", userId))
      .filter((q: any) => q.eq("proposalId", proposalId))
      .first();

    return {
      proposal: {
        _id: proposal._id,
        title: proposal.title,
        status: proposal.status,
        submittedAt: proposal.submittedAt ?? null,
      },
      call: {
        _id: call._id,
        title: call.title,
        evaluationSettings: call.evaluationSettings,
      },
      criteria,
      evaluation: evaluation
        ? {
            _id: evaluation._id,
            rubric: evaluation.rubric,
            overallScore: evaluation.overallScore,
            recommendation: evaluation.recommendation,
            confidentialComments: evaluation.confidentialComments,
            publicComments: evaluation.publicComments,
            completedAt: evaluation.completedAt ?? null,
            aiAssistanceUsed: evaluation.aiAssistanceUsed,
          }
        : null,
    };
  },
});

const rubricEntryInput = v.object({
  criteriaId: v.id("evaluationCriteria"),
  score: v.optional(v.union(v.number(), v.null())),
  comments: v.optional(v.string()),
  strengths: v.optional(v.array(v.string())),
  weaknesses: v.optional(v.array(v.string())),
});

const recommendationValidator = v.optional(
  v.union(
    v.literal("approve"),
    v.literal("approve_with_modifications"),
    v.literal("reject"),
    v.literal("revise_and_resubmit")
  )
);

async function upsertEvaluation(
  ctx: MutationCtx,
  {
    evaluationId,
    proposalId,
    evaluatorId,
    rubric,
    overallScore,
    recommendation,
    confidentialComments,
    publicComments,
    aiAssistanceUsed,
    completedAt,
  }: {
    evaluationId: Id<"evaluations"> | null;
    proposalId: Id<"proposals">;
    evaluatorId: Id<"users">;
    rubric: Array<{
      criteriaId: Id<"evaluationCriteria">;
      score: number;
      maxScore: number;
      comments: string;
      strengths: string[];
      weaknesses: string[];
    }>;
    overallScore: number;
    recommendation: (typeof RECOMMENDATIONS)[number] | null;
    confidentialComments: string;
    publicComments: string;
    aiAssistanceUsed: boolean;
    completedAt: number | null;
  }
) {
  if (evaluationId) {
    await ctx.db.patch(evaluationId, {
      rubric,
      overallScore,
      recommendation: recommendation ?? undefined,
      confidentialComments,
      publicComments,
      aiAssistanceUsed,
      completedAt: completedAt ?? undefined,
    });
    return evaluationId;
  }

  return await ctx.db.insert("evaluations", {
    proposalId,
    evaluatorId,
    rubric,
    overallScore,
    recommendation: recommendation ?? undefined,
    confidentialComments,
    publicComments,
    completedAt: completedAt ?? undefined,
    aiAssistanceUsed,
    createdAt: Date.now(),
  });
}

export const saveEvaluationDraft = mutation({
  args: {
    proposalId: v.id("proposals"),
    rubric: v.array(rubricEntryInput),
    recommendation: recommendationValidator,
    confidentialComments: v.optional(v.string()),
    publicComments: v.optional(v.string()),
    aiAssistanceUsed: v.optional(v.boolean()),
  },
  handler: async (
    ctx: MutationCtx,
    {
      proposalId,
      rubric,
      recommendation,
      confidentialComments,
      publicComments,
      aiAssistanceUsed,
    }: any
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertReviewer(profile.role);

    const { proposal, criteria } = await loadProposalAndCriteria(ctx, proposalId);
    await ensureReviewerAccess(ctx, proposal, userId, profile.role);

    const { entries: normalizedRubric } = normalizeRubric(criteria, rubric as any);
    const overallScore = computeWeightedScore(normalizedRubric, criteria);

    const existingEvaluation = await ctx.db
      .query("evaluations")
      .withIndex("by_evaluator", (q: any) => q.eq("evaluatorId", userId))
      .filter((q: any) => q.eq("proposalId", proposalId))
      .first();

    const evaluationId = await upsertEvaluation(ctx, {
      evaluationId: existingEvaluation?._id ?? null,
      proposalId,
      evaluatorId: userId,
      rubric: normalizedRubric,
      overallScore,
      recommendation: recommendation ?? null,
      confidentialComments: sanitizeText(confidentialComments),
      publicComments: sanitizeText(publicComments),
      aiAssistanceUsed: Boolean(aiAssistanceUsed),
      completedAt: null,
    });
    await logActivity(ctx, {
      userId,
      action: existingEvaluation ? "evaluation.draft_updated" : "evaluation.draft_created",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        evaluationId,
        overallScore,
        aiAssistanceUsed: Boolean(aiAssistanceUsed),
        recommendation: recommendation ?? null,
      },
    });

    if (proposal.status === "submitted") {
      await ctx.db.patch(proposal._id, {
        status: "under_review",
        updatedAt: Date.now(),
      });
    }
  },
});

export const submitEvaluation = mutation({
  args: {
    proposalId: v.id("proposals"),
    rubric: v.array(rubricEntryInput),
    recommendation: v.union(
      v.literal("approve"),
      v.literal("approve_with_modifications"),
      v.literal("reject"),
      v.literal("revise_and_resubmit")
    ),
    confidentialComments: v.string(),
    publicComments: v.string(),
    aiAssistanceUsed: v.optional(v.boolean()),
  },
  handler: async (
    ctx: MutationCtx,
    {
      proposalId,
      rubric,
      recommendation,
      confidentialComments,
      publicComments,
      aiAssistanceUsed,
    }: any
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertReviewer(profile.role);

    const { proposal, criteria } = await loadProposalAndCriteria(ctx, proposalId);
    await ensureReviewerAccess(ctx, proposal, userId, profile.role);

    if (criteria.length === 0) {
      throw new Error("This call does not have an evaluation rubric configured yet.");
    }

    const { entries: normalizedRubric, missingScores } = normalizeRubric(
      criteria,
      rubric as any
    );

    if (missingScores.length > 0) {
      throw new Error("Please score every criterion before submitting the evaluation.");
    }

    const overallScore = computeWeightedScore(normalizedRubric, criteria);
    const submittedAt = Date.now();

    const existingEvaluation = await ctx.db
      .query("evaluations")
      .withIndex("by_evaluator", (q: any) => q.eq("evaluatorId", userId))
      .filter((q: any) => q.eq("proposalId", proposalId))
      .first();

    const evaluationId = await upsertEvaluation(ctx, {
      evaluationId: existingEvaluation?._id ?? null,
      proposalId,
      evaluatorId: userId,
      rubric: normalizedRubric,
      overallScore,
      recommendation,
      confidentialComments: sanitizeText(confidentialComments),
      publicComments: sanitizeText(publicComments),
      aiAssistanceUsed: Boolean(aiAssistanceUsed),
      completedAt: submittedAt,
    });
    await logActivity(ctx, {
      userId,
      action: "evaluation.submitted",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        evaluationId,
        overallScore,
        recommendation,
        aiAssistanceUsed: Boolean(aiAssistanceUsed),
      },
    });

    if (proposal.status === "submitted") {
      await ctx.db.patch(proposal._id, {
        status: "under_review",
        updatedAt: submittedAt,
      });
    }
  },
});

function normalizeUserRecord(user: any, profile: any) {
  return {
    _id: user._id as Id<"users">,
    name: user.name ?? "",
    email: user.email ?? "",
    role: profile?.role ?? "faculty",
  };
}

export const listEvaluationAssignments = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertReviewer(profile.role);

    const proposals = await ctx.db.query("proposals").collect();
    const evaluations = await ctx.db.query("evaluations").collect();

    const evaluationMap = new Map<string, any>();
    for (const evaluation of evaluations) {
      const key = `${evaluation.proposalId}:${evaluation.evaluatorId}`;
      evaluationMap.set(key, evaluation);
    }

    const visibleProposals = isAdminRole(profile.role)
      ? proposals
      : proposals.filter((proposal: any) =>
          (proposal.assignedEvaluators ?? []).some((evaluatorId: any) => evaluatorId === userId)
        );

    const callIds = new Set<Id<"calls">>();
    const evaluatorIds = new Set<Id<"users">>();
    for (const proposal of visibleProposals) {
      callIds.add(proposal.callId);
      for (const evaluatorId of proposal.assignedEvaluators ?? []) {
        evaluatorIds.add(evaluatorId);
      }
    }

    const callEntries = await Promise.all(
      Array.from(callIds).map(async (callId) => [callId, await ctx.db.get(callId)] as const)
    );
    const callMap = new Map<Id<"calls">, any>();
    for (const [callId, call] of callEntries) {
      if (call) {
        callMap.set(callId, call);
      }
    }

    const evaluatorEntries = await Promise.all(
      Array.from(evaluatorIds).map(async (evaluatorId) => {
        const userRecord = await ctx.db.get(evaluatorId);
        if (!userRecord) {
          return null;
        }

        const profileRecord = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", evaluatorId))
          .first();

        return normalizeUserRecord(userRecord, profileRecord);
      })
    );

    const evaluatorMap = new Map<Id<"users">, ReturnType<typeof normalizeUserRecord>>();
    for (const entry of evaluatorEntries) {
      if (entry) {
        evaluatorMap.set(entry._id, entry);
      }
    }

    const assignments: Array<{
      id: string;
      proposalId: Id<"proposals">;
      proposalTitle: string;
      callId: Id<"calls">;
      callTitle: string;
      evaluator: ReturnType<typeof normalizeUserRecord> | null;
      status: "unassigned" | "pending" | "in_progress" | "submitted";
      submittedAt: number | null;
      updatedAt: number;
    }> = [];

    for (const proposal of visibleProposals) {
      const assignedEvaluators = proposal.assignedEvaluators ?? [];
      const call = callMap.get(proposal.callId);
      const callTitle = call?.title ?? "";

      if (assignedEvaluators.length === 0 && isAdminRole(profile.role)) {
        assignments.push({
          id: `${proposal._id}:unassigned`,
          proposalId: proposal._id,
          proposalTitle: proposal.title,
          callId: proposal.callId,
          callTitle,
          evaluator: null,
          status: "unassigned",
          submittedAt: null,
          updatedAt: proposal.updatedAt,
        });
        continue;
      }

      for (const evaluatorId of assignedEvaluators) {
        if (!isAdminRole(profile.role) && evaluatorId !== userId) {
          continue;
        }

        const key = `${proposal._id}:${evaluatorId}`;
        const evaluation = evaluationMap.get(key);

        let status: "pending" | "in_progress" | "submitted" = "pending";
        if (evaluation) {
          status = evaluation.completedAt ? "submitted" : "in_progress";
        }

        assignments.push({
          id: key,
          proposalId: proposal._id,
          proposalTitle: proposal.title,
          callId: proposal.callId,
          callTitle,
          evaluator:
            evaluatorMap.get(evaluatorId) ?? {
              _id: evaluatorId,
              name: "Unknown evaluator",
              email: "",
              role: "evaluator",
            },
          status,
          submittedAt: evaluation?.completedAt ?? null,
          updatedAt:
            evaluation?.completedAt ??
            evaluation?._creationTime ??
            proposal.updatedAt,
        });
      }
    }

    return assignments.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get assignments for the current evaluator (for "My Evaluations" page)
 */
export const getMyAssignments = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    // Only evaluators and admins can access
    if (!REVIEWER_ROLES.includes(profile.role as any)) {
      throw new Error("Unauthorized: Evaluator access required");
    }

    // Get all assignments for this evaluator
    const assignments = await ctx.db
      .query("evaluatorAssignments")
      .withIndex("by_evaluator", (q: any) => q.eq("evaluatorId", userId))
      .filter((q: any) =>
        q.neq(q.field("status"), "removed")
      )
      .collect();

    // Build response with proposal details and evaluation status
    const results = await Promise.all(
      assignments.map(async (assignment) => {
        const proposal = await ctx.db.get(assignment.proposalId);
        if (!proposal) return null;

        const call = await ctx.db.get(proposal.callId);
        const pi = await ctx.db
          .query("users")
          .filter((q: any) => q.eq(q.field("_id"), proposal.principalInvestigator))
          .first();

        // Get evaluation if exists
        const evaluation = await ctx.db
          .query("evaluations")
          .withIndex("by_evaluator", (q: any) => q.eq("evaluatorId", userId))
          .filter((q: any) => q.eq(q.field("proposalId"), assignment.proposalId))
          .first();

        return {
          _id: assignment._id,
          proposalId: proposal._id,
          proposalTitle: proposal.title,
          callTitle: call?.title ?? "Unknown Call",
          principalInvestigator: pi?.name ?? "Unknown",
          requestedBudget: proposal.budget?.total ?? 0,
          assignedAt: assignment.assignedAt,
          deadline: call?.deadlines?.evaluation ?? undefined,
          status: assignment.status,
          evaluation: evaluation ? {
            status: evaluation.completedAt ? "submitted" : "draft",
            submittedAt: evaluation.completedAt,
            overallScore: evaluation.overallScore,
          } : undefined,
        };
      })
    );

    // Filter out nulls and return
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Clarification Request Functions
 * Enables iterative proposal refinement through evaluator-PI communication
 */

export const createClarificationRequest = mutation({
  args: {
    proposalId: v.id("proposals"),
    evaluationId: v.optional(v.id("evaluations")),
    requestText: v.string(),
    requestCategory: v.optional(
      v.union(
        v.literal("methodology"),
        v.literal("budget"),
        v.literal("timeline"),
        v.literal("team"),
        v.literal("impact"),
        v.literal("other")
      )
    ),
  },
  handler: async (
    ctx: MutationCtx,
    { proposalId, evaluationId, requestText, requestCategory }
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertReviewer(profile.role);

    // Verify access to proposal
    const { proposal } = await loadProposalAndCriteria(ctx, proposalId);
    await ensureReviewerAccess(ctx, proposal, userId, profile.role);

    // Create clarification request
    const clarificationId = await ctx.db.insert("clarificationRequests", {
      proposalId,
      evaluationId,
      evaluatorId: userId,
      requestText: sanitizeText(requestText),
      requestCategory,
      requestedAt: Date.now(),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log activity
    await logActivity(ctx, {
      userId,
      action: "clarification.requested",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        clarificationId,
        category: requestCategory,
      },
    });

    return clarificationId;
  },
});

export const respondToClarificationRequest = mutation({
  args: {
    clarificationId: v.id("clarificationRequests"),
    responseText: v.string(),
    responseAttachments: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          name: v.string(),
        })
      )
    ),
  },
  handler: async (
    ctx: MutationCtx,
    { clarificationId, responseText, responseAttachments }
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const clarification = await ctx.db.get(clarificationId);
    if (!clarification) {
      throw new Error("Clarification request not found");
    }

    // Verify user is PI, team member, or admin of the proposal
    const proposal = await ctx.db.get(clarification.proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    const canRespond =
      proposal.principalInvestigator === userId ||
      (proposal.teamMembers ?? []).includes(userId) ||
      isAdminRole(profile.role);

    if (!canRespond) {
      throw new Error(
        "Only the PI, team members, or admins can respond to clarification requests"
      );
    }

    // Update clarification request
    await ctx.db.patch(clarificationId, {
      responseText: sanitizeText(responseText),
      responseAttachments: responseAttachments?.map((att) => ({
        ...att,
        uploadedAt: Date.now(),
      })),
      respondedAt: Date.now(),
      respondedBy: userId,
      status: "responded",
      updatedAt: Date.now(),
    });

    // Log activity
    await logActivity(ctx, {
      userId,
      action: "clarification.responded",
      entityType: "proposal",
      entityId: clarification.proposalId,
      details: {
        clarificationId,
        hasAttachments: !!responseAttachments && responseAttachments.length > 0,
      },
    });

    return clarificationId;
  },
});

export const resolveClarificationRequest = mutation({
  args: {
    clarificationId: v.id("clarificationRequests"),
  },
  handler: async (ctx: MutationCtx, { clarificationId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const clarification = await ctx.db.get(clarificationId);
    if (!clarification) {
      throw new Error("Clarification request not found");
    }

    // Only the requesting evaluator can resolve
    if (clarification.evaluatorId !== userId && !isAdminRole(profile.role)) {
      throw new Error(
        "Only the requesting evaluator can mark this as resolved"
      );
    }

    await ctx.db.patch(clarificationId, {
      status: "resolved",
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log activity
    await logActivity(ctx, {
      userId,
      action: "clarification.resolved",
      entityType: "proposal",
      entityId: clarification.proposalId,
      details: { clarificationId },
    });

    return clarificationId;
  },
});

export const getClarificationRequests = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx: QueryCtx, { proposalId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    // Check access: PI, team members, assigned evaluators, or admins
    const isPIOrTeam =
      proposal.principalInvestigator === userId ||
      (proposal.teamMembers ?? []).includes(userId);

    const isAssignedEvaluator = (proposal.assignedEvaluators ?? []).includes(
      userId
    );

    if (!isPIOrTeam && !isAssignedEvaluator && !isAdminRole(profile.role)) {
      throw new Error("Access denied");
    }

    // Get all clarification requests for this proposal
    const clarifications = await ctx.db
      .query("clarificationRequests")
      .withIndex("by_proposal", (q: any) => q.eq("proposalId", proposalId))
      .collect();

    // Enrich with evaluator info
    const enriched = await Promise.all(
      clarifications.map(async (clarification) => {
        const evaluator = await ctx.db.get(clarification.evaluatorId);
        const responder = clarification.respondedBy
          ? await ctx.db.get(clarification.respondedBy)
          : null;

        return {
          ...clarification,
          evaluator: evaluator
            ? { _id: evaluator._id, name: evaluator.name }
            : null,
          responder: responder
            ? { _id: responder._id, name: responder.name }
            : null,
        };
      })
    );

    // Sort by most recent first
    return enriched.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});
