/**
 * Proposal Authoring Functions
 *
 * Provides draft persistence, submission, and listing for proposal authors.
 * Aligned with Phase 2 workflow in the technical specification.
 */

import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import { logActivity } from "./activities";

const AUTHOR_ROLES = ["sysadmin", "admin", "faculty"] as const;
const REVIEWER_ROLES = ["sysadmin", "admin", "evaluator"] as const;
const ASSIGNMENT_ROLES = ["sysadmin", "admin"] as const;
const ASSIGNMENT_STATUSES = ["pending", "accepted", "declined", "removed"] as const;

function isAdminRole(role: string) {
  return ASSIGNMENT_ROLES.includes(role as (typeof ASSIGNMENT_ROLES)[number]);
}

const milestoneValidator = v.object({
  milestone: v.string(),
  deadline: v.string(),
  deliverables: v.array(v.string()),
  successCriteria: v.optional(v.string()),
});

const budgetItemValidator = v.object({
  category: v.string(),
  description: v.string(),
  quantity: v.number(),
  unitCost: v.number(),
  justification: v.string(),
});

const attachmentDraftValidator = v.object({
  storageId: v.id("_storage"),
  name: v.string(),
  category: v.union(v.literal("required"), v.literal("optional")),
  requirementId: v.optional(v.string()),
});

const proposalDraftValidator = v.object({
  title: v.string(),
  keywords: v.array(v.string()),
  abstract: v.string(),
  problemStatement: v.string(),
  generalObjective: v.string(),
  specificObjectives: v.array(v.string()),
  methodology: v.string(),
  researchDesign: v.optional(v.string()),
  dataCollection: v.optional(v.string()),
  analysisPlan: v.optional(v.string()),
  timeline: v.array(milestoneValidator),
  budget: v.object({
    items: v.array(budgetItemValidator),
    narrative: v.optional(v.string()),
  }),
  impact: v.object({
    expectedOutcomes: v.string(),
    beneficiaries: v.string(),
    indicators: v.string(),
    dissemination: v.string(),
  }),
  teamMembers: v.array(v.id("users")),
  teamInvites: v.array(v.string()),
  attachments: v.array(attachmentDraftValidator),
});

type GenericCtx = QueryCtx | MutationCtx;

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

function assertAuthor(role: string) {
  if (!AUTHOR_ROLES.includes(role as (typeof AUTHOR_ROLES)[number])) {
    throw new Error("Unauthorized: proposal author role required");
  }
}

function assertReviewer(role: string) {
  if (!REVIEWER_ROLES.includes(role as (typeof REVIEWER_ROLES)[number])) {
    throw new Error("Unauthorized: reviewer access required");
  }
}

function userCanAccessProposal(
  proposal: any,
  userId: Id<"users">,
  role: string
) {
  if (proposal.principalInvestigator === userId) {
    return true;
  }
  if ((proposal.teamMembers ?? []).some((memberId: Id<"users">) => memberId === userId)) {
    return true;
  }
  if ((proposal.assignedEvaluators ?? []).some((evaluatorId: Id<"users">) => evaluatorId === userId)) {
    return true;
  }
  if (isAdminRole(role)) {
    return true;
  }
  return false;
}

function sanitizeString(value: string | null | undefined) {
  return (value ?? "").trim();
}

function sanitizeStringArray(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function computeBudgetTotal(items: Array<{ quantity: number; unitCost: number }>) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
}

function mapMilestones(
  milestones: Array<{
    milestone: string;
    deadline: string;
    deliverables: string[];
    successCriteria?: string;
  }>
) {
  return milestones.map((item) => ({
    milestone: sanitizeString(item.milestone),
    deadline: sanitizeString(item.deadline),
    deliverables: sanitizeStringArray(item.deliverables),
    successCriteria: item.successCriteria ? sanitizeString(item.successCriteria) : undefined,
  }));
}

function mapBudgetItems(
  items: Array<{
    category: string;
    description: string;
    quantity: number;
    unitCost: number;
    justification: string;
  }>
) {
  return items
    .map((item) => ({
      category: sanitizeString(item.category),
      description: sanitizeString(item.description),
      quantity: Number.isFinite(item.quantity) ? Number(item.quantity) : 0,
      unitCost: Number.isFinite(item.unitCost) ? Number(item.unitCost) : 0,
      justification: sanitizeString(item.justification),
    }))
    .filter((item) => item.category && item.description);
}

function proposalToDraft(proposal: any) {
  return {
    title: proposal.title,
    keywords: proposal.keywords ?? [],
    abstract: proposal.abstract,
    problemStatement: proposal.problemStatement ?? "",
    generalObjective: proposal.generalObjective ?? "",
    specificObjectives: proposal.specificObjectives ?? [],
    methodology: proposal.methodology,
    researchDesign: proposal.researchDesign ?? "",
    dataCollection: proposal.dataCollection ?? "",
    analysisPlan: proposal.analysisPlan ?? "",
    timeline:
      proposal.timeline?.map((milestone: any) => ({
        milestone: milestone.milestone ?? "",
        deadline: milestone.deadline ?? "",
        deliverables: milestone.deliverables ?? [],
        successCriteria: milestone.successCriteria ?? "",
      })) ?? [],
    budget: {
      narrative: proposal.budget?.narrative ?? "",
      items:
        proposal.budget?.breakdown?.map((item: any) => ({
          category: item.category ?? "",
          description: item.description ?? "",
          quantity: item.quantity ?? 0,
          unitCost: item.unitCost ?? 0,
          justification: item.justification ?? "",
        })) ?? [],
    },
    impact: {
      expectedOutcomes: proposal.impact?.expectedOutcomes ?? "",
      beneficiaries: proposal.impact?.beneficiaries ?? "",
      indicators: proposal.impact?.indicators ?? "",
      dissemination: proposal.impact?.dissemination ?? "",
    },
    teamMembers: proposal.teamMembers ?? [],
    teamInvites: proposal.teamInvites ?? [],
    assignedEvaluators: proposal.assignedEvaluators ?? [],
    attachments:
      proposal.attachments?.map((attachment: any) => ({
        storageId: attachment.storageId,
        name: attachment.name ?? "",
        category: attachment.type ?? "optional",
        requirementId: attachment.requirementId ?? undefined,
      })) ?? [],
  };
}

function proposalSummary(proposal: any, call: any) {
  return {
    _id: proposal._id,
    callId: proposal.callId,
    callTitle: call?.title ?? "Unknown Call",
    callSlug: call?.slug ?? null,
    title: proposal.title ?? "Untitled proposal",
    proposalTitle: proposal.title ?? "Untitled proposal", // Backward compatibility
    status: proposal.status,
    updatedAt: proposal.updatedAt,
    submittedAt: proposal.submittedAt,
    budgetTotal: proposal.budget?.total ?? 0,
    totalBudget: proposal.budget?.total ?? 0, // Backward compatibility
  };
}

async function ensureCall(ctx: GenericCtx, callId: Id<"calls">) {
  const call = await ctx.db.get(callId);
  if (!call) {
    throw new Error("Call not found");
  }
  return call;
}

async function getUserComposite(ctx: GenericCtx, userId: Id<"users">) {
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
}

type UserComposite = Awaited<ReturnType<typeof getUserComposite>>;

/**
 * Fetch the current user's draft (or submitted) proposal for a call.
 */
export const getProposalDraft = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx: any, { callId }: any) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertAuthor(profile.role);

    await ensureCall(ctx, callId);

    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_pi", (q: any) => q.eq("principalInvestigator", userId))
      .collect();

    const proposal = proposals.find((item: any) => item.callId === callId);
    if (!proposal) {
      return null;
    }

    return {
      proposalId: proposal._id,
      status: proposal.status,
      draft: proposalToDraft(proposal),
      submittedAt: proposal.submittedAt ?? undefined,
      updatedAt: proposal.updatedAt,
    };
  },
});

/**
 * Persist a proposal draft for the current user and call.
 */
export const saveProposalDraft = mutation({
  args: {
    callId: v.id("calls"),
    draft: proposalDraftValidator,
  },
  handler: async (ctx: any, { callId, draft }: any) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertAuthor(profile.role);

    const call = await ensureCall(ctx, callId);

    const keywords = sanitizeStringArray(draft.keywords);
    const specificObjectives = sanitizeStringArray(draft.specificObjectives);
    const timeline = mapMilestones(draft.timeline);
    const budgetItems = mapBudgetItems(draft.budget.items);
    const budgetTotal = computeBudgetTotal(budgetItems);

    const objectives = [sanitizeString(draft.generalObjective), ...specificObjectives].filter(Boolean);
    const teamMembers = Array.from(
      new Set(draft.teamMembers.map((memberId: any) => memberId as Id<"users">))
    );
    const teamInvites = sanitizeStringArray(draft.teamInvites);
    const attachmentRecords = draft.attachments.map((attachment: any) => ({
      storageId: attachment.storageId as Id<"_storage">,
      name: sanitizeString(attachment.name),
      type: attachment.category,
      requirementId: attachment.requirementId ? sanitizeString(attachment.requirementId) : undefined,
    }));

    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_pi", (q: any) => q.eq("principalInvestigator", userId))
      .collect();

    const existing = proposals.find((item: any) => item.callId === callId);
    const documentIds = attachmentRecords.map((record: any) => record.storageId as Id<"_storage">);
    const removedDocumentIds =
      existing?.documents
        ?.filter((storageId: Id<"_storage">) => !documentIds.some((id: any) => id === storageId)) ?? [];

    const payload = {
      callId,
      title: sanitizeString(draft.title),
      keywords,
      principalInvestigator: userId as Id<"users">,
      teamMembers,
      teamInvites,
      abstract: sanitizeString(draft.abstract),
      problemStatement: sanitizeString(draft.problemStatement),
      generalObjective: sanitizeString(draft.generalObjective),
      specificObjectives,
      objectives,
      methodology: sanitizeString(draft.methodology),
      researchDesign: sanitizeString(draft.researchDesign),
      dataCollection: sanitizeString(draft.dataCollection),
      analysisPlan: sanitizeString(draft.analysisPlan),
      timeline,
      budget: {
        total: budgetTotal,
        narrative: sanitizeString(draft.budget.narrative ?? ""),
        breakdown: budgetItems.map((item) => ({
          ...item,
          amount: item.quantity * item.unitCost,
        })),
      },
      impact: {
        expectedOutcomes: sanitizeString(draft.impact.expectedOutcomes),
        beneficiaries: sanitizeString(draft.impact.beneficiaries),
        indicators: sanitizeString(draft.impact.indicators),
        dissemination: sanitizeString(draft.impact.dissemination),
      },
      assignedEvaluators: existing?.assignedEvaluators ?? [],
      status: "draft" as const,
      documents: documentIds,
      attachments: attachmentRecords,
      submittedAt: existing?.submittedAt ?? undefined,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      if (removedDocumentIds.length > 0) {
        for (const storageId of removedDocumentIds) {
          try {
            await ctx.storage.delete(storageId);
          } catch (error) {
            console.warn("Failed to delete detached attachment", storageId, error);
          }
        }
      }
      await logActivity(ctx, {
        userId,
        action: "proposal.draft_updated",
        entityType: "proposal",
        entityId: existing._id,
        details: {
          callId,
          attachmentCount: attachmentRecords.length,
          removedAttachments: removedDocumentIds.length,
          budgetTotal,
        },
      });
      return {
        proposalId: existing._id,
        status: "draft" as const,
        updatedAt: payload.updatedAt,
      };
    }

    const proposalId = await ctx.db.insert("proposals", payload);
    await logActivity(ctx, {
      userId,
      action: "proposal.draft_created",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        callId,
        attachmentCount: attachmentRecords.length,
        budgetTotal,
      },
    });
    return {
      proposalId,
      status: "draft" as const,
      updatedAt: payload.updatedAt,
    };
  },
});

/**
 * Submit the proposal once all required fields are satisfied.
 */
export const submitProposal = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx: any, { callId }: any) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertAuthor(profile.role);

    const call = await ensureCall(ctx, callId);

    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_pi", (q: any) => q.eq("principalInvestigator", userId))
      .collect()
      .then((list: any[]) => list.find((item) => item.callId === callId));

    if (!proposal) {
      throw new Error("Proposal draft not found");
    }

    if (proposal.status !== "draft" && proposal.status !== "revise_and_resubmit") {
      throw new Error("Only drafts can be submitted");
    }

    if (!proposal.title) {
      throw new Error("Proposal title is required");
    }
    if (!proposal.abstract) {
      throw new Error("Abstract is required");
    }
    if (!proposal.problemStatement) {
      throw new Error("Problem statement is required");
    }
    if (!proposal.generalObjective || proposal.specificObjectives.length < 1) {
      throw new Error("Objectives must be completed before submission");
    }
    if (!proposal.methodology) {
      throw new Error("Methodology is required");
    }
    if (!proposal.timeline || proposal.timeline.length === 0) {
      throw new Error("At least one milestone is required");
    }
    if (!proposal.budget || !proposal.budget.breakdown || proposal.budget.breakdown.length === 0) {
      throw new Error("Budget items are required");
    }

    const now = Date.now();
    if (now > call.closeDate) {
      throw new Error("Submission deadline has passed");
    }

    const minBudget = call.budget?.perProject?.min ?? 0;
    const maxBudget = call.budget?.perProject?.max ?? Infinity;
    if (proposal.budget.total < minBudget) {
      throw new Error("Budget total below minimum for this call");
    }
    if (proposal.budget.total > maxBudget) {
      throw new Error("Budget total exceeds maximum for this call");
    }

    await ctx.db.patch(proposal._id, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, {
      userId,
      action: "proposal.submitted",
      entityType: "proposal",
      entityId: proposal._id,
      details: {
        callId,
        attachmentCount: (proposal.attachments ?? []).length,
      },
    });

    return {
      proposalId: proposal._id,
      status: "submitted" as const,
      submittedAt: now,
    };
  },
});

/**
 * List proposals authored by the current user with basic call context.
 */
export const listMyProposals = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertAuthor(profile.role);

    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_pi", (q: any) => q.eq("principalInvestigator", userId))
      .collect();

    const callIds = Array.from(new Set(proposals.map((proposal: any) => proposal.callId)));

    const calls = await Promise.all(callIds.map((callId) => ctx.db.get(callId)));
    const callMap = new Map(calls.filter(Boolean).map((call: any) => [call._id, call]));

    return proposals
      .map((proposal: any) => proposalSummary(proposal, callMap.get(proposal.callId)))
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  },
});

/**
 * List all proposals (admin-only)
 */
export const listAllProposals = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { profile } = await getCurrentProfile(ctx);

    // Only admins can see all proposals
    if (profile.role !== "sysadmin" && profile.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const proposals = await ctx.db.query("proposals").collect();

    const callIds = Array.from(new Set(proposals.map((proposal: any) => proposal.callId)));
    const piIds = Array.from(new Set(proposals.map((proposal: any) => proposal.principalInvestigator)));

    const calls = await Promise.all(callIds.map((callId) => ctx.db.get(callId)));
    const callMap = new Map(calls.filter(Boolean).map((call: any) => [call._id, call]));

    // Get PI names
    const pis = await Promise.all(
      piIds.map(async (piId) => {
        const user = await ctx.db
          .query("users")
          .filter((q: any) => q.eq(q.field("_id"), piId))
          .first();
        return [piId, user?.name ?? "Unknown"] as const;
      })
    );
    const piMap = new Map(pis);

    return proposals
      .map((proposal: any) => ({
        ...proposalSummary(proposal, callMap.get(proposal.callId)),
        principalInvestigatorName: piMap.get(proposal.principalInvestigator),
      }))
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  },
});

export const listProposalsForReview = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { profile } = await getCurrentProfile(ctx);
    assertReviewer(profile.role);

    const proposals = await ctx.db.query("proposals").collect();

    const callIds = Array.from(new Set(proposals.map((proposal: any) => proposal.callId)));
    const piIds = Array.from(new Set(proposals.map((proposal: any) => proposal.principalInvestigator)));

    const callEntries = await Promise.all(
      callIds.map(async (id: any) => [id, await ctx.db.get(id)] as const)
    );
    const callMap = new Map<Id<"calls">, NonNullable<typeof callEntries[number][1]>>();
    for (const [id, call] of callEntries) {
      if (call) {
        callMap.set(id as Id<"calls">, call);
      }
    }

    const piEntries = await Promise.all(
      piIds.map(async (id: any) => [id, await getUserComposite(ctx, id)] as const)
    );
    const piMap = new Map<Id<"users">, NonNullable<UserComposite>>();
    for (const [id, user] of piEntries) {
      if (user) {
        piMap.set(id, user);
      }
    }

    return proposals
      .map((proposal: any) => {
        const call = callMap.get(proposal.callId);
        const principal = piMap.get(proposal.principalInvestigator);
        return {
          _id: proposal._id,
          title: proposal.title,
          status: proposal.status,
          updatedAt: proposal.updatedAt,
          submittedAt: proposal.submittedAt ?? null,
          budgetTotal: proposal.budget?.total ?? 0,
          call: call
            ? {
                _id: call._id,
                title: call.title,
                slug: call.slug ?? null,
                closeDate: call.closeDate,
              }
            : null,
          principalInvestigator: principal ?? null,
          assignedCount: proposal.assignedEvaluators?.length ?? 0,
        };
      })
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  },
});

export const listAssignmentBoard = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { profile } = await getCurrentProfile(ctx);
    const isAdmin = ASSIGNMENT_ROLES.includes(profile.role as (typeof ASSIGNMENT_ROLES)[number]);
    if (!isAdmin) {
      assertReviewer(profile.role);
    }

    const [proposals, assignments, evaluations] = await Promise.all([
      ctx.db.query("proposals").collect(),
      ctx.db.query("evaluatorAssignments").collect(),
      ctx.db.query("evaluations").collect(),
    ]);

    const proposalMap = new Map<Id<"proposals">, any>();
    const callIds = new Set<Id<"calls">>();
    const evaluatorIds = new Set<Id<"users">>();

    for (const proposal of proposals) {
      proposalMap.set(proposal._id, proposal);
      callIds.add(proposal.callId);
      for (const evaluatorId of proposal.assignedEvaluators ?? []) {
        evaluatorIds.add(evaluatorId as Id<"users">);
      }
    }

    for (const assignment of assignments) {
      evaluatorIds.add(assignment.evaluatorId as Id<"users">);
    }

    const [calls, evaluators] = await Promise.all([
      Promise.all(Array.from(callIds).map((callId) => ctx.db.get(callId))),
      Promise.all(Array.from(evaluatorIds).map((userId) => getUserComposite(ctx, userId))),
    ]);

    const callMap = new Map<Id<"calls">, any>();
    calls.forEach((call: any) => {
      if (call) callMap.set(call._id, call);
    });

    const evaluatorMap = new Map<Id<"users">, any>();
    evaluators.forEach((user: any) => {
      if (user) evaluatorMap.set(user._id, user);
    });

    const evaluationLookup = new Map<string, any>();
    for (const evaluation of evaluations) {
      evaluationLookup.set(`${evaluation.proposalId}:${evaluation.evaluatorId}`, evaluation);
    }

    const lanes: Record<
      "unassigned" | "pending" | "in_progress" | "submitted" | "declined" | "removed",
      any[]
    > = {
      unassigned: [],
      pending: [],
      in_progress: [],
      submitted: [],
      declined: [],
      removed: [],
    };

    for (const assignment of assignments) {
      const proposal = proposalMap.get(assignment.proposalId);
      if (!proposal) continue;
      const call = callMap.get(proposal.callId);
      const evaluator = evaluatorMap.get(assignment.evaluatorId as Id<"users">) ?? null;
      const evaluation = evaluationLookup.get(
        `${assignment.proposalId}:${assignment.evaluatorId}`
      );

      const base = {
        assignmentId: assignment._id,
        proposalId: proposal._id,
        proposalTitle: proposal.title,
        callId: proposal.callId,
        callTitle: call?.title ?? "",
        evaluator,
        assignmentStatus: assignment.status,
        assignmentMethod: assignment.assignmentMethod,
        assignedAt: assignment.assignedAt,
        respondedAt: assignment.respondedAt ?? null,
        declineReason: assignment.declineReason ?? null,
        declineComment: assignment.declineComment ?? null,
        coiDeclared: assignment.coiDeclared,
        coiDetails: assignment.coiDetails ?? null,
        evaluationStatus: evaluation
          ? evaluation.completedAt
            ? "submitted"
            : "in_progress"
          : "not_started",
        overallScore: evaluation?.overallScore ?? null,
        recommendation: evaluation?.recommendation ?? null,
      };

      if (assignment.status === "declined") {
        lanes.declined.push(base);
      } else if (assignment.status === "removed") {
        lanes.removed.push(base);
      } else if (evaluation?.completedAt) {
        lanes.submitted.push(base);
      } else if (assignment.status === "accepted") {
        lanes.in_progress.push(base);
      } else {
        lanes.pending.push(base);
      }
    }

    if (isAdmin) {
      for (const proposal of proposals) {
        if ((proposal.assignedEvaluators?.length ?? 0) === 0) {
          lanes.unassigned.push({
            assignmentId: null,
            proposalId: proposal._id,
            proposalTitle: proposal.title,
            callId: proposal.callId,
            callTitle: callMap.get(proposal.callId)?.title ?? "",
            evaluator: null,
            assignmentStatus: "unassigned",
            assignmentMethod: null,
            assignedAt: null,
            respondedAt: null,
            declineReason: null,
            declineComment: null,
            coiDeclared: false,
            coiDetails: null,
            evaluationStatus: "not_started",
            overallScore: null,
            recommendation: null,
          });
        }
      }
    }

    return {
      lanes,
    };
  },
});

/**
 * Get project execution details for monitoring
 * Returns comprehensive execution tracking data
 */
export const getProjectDetail = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx: QueryCtx, { proposalId }: any) => {
    console.log("[getProjectDetail] Fetching project:", proposalId);

    const { userId, profile } = await getCurrentProfile(ctx);
    console.log("[getProjectDetail] User:", userId, "Role:", profile.role);

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      console.log("[getProjectDetail] Proposal not found");
      return null;
    }

    console.log("[getProjectDetail] Proposal status:", proposal.status);

    // Only show projects (approved/in_execution/completed)
    if (!["approved", "in_execution", "completed"].includes(proposal.status)) {
      throw new Error("Not a project - proposal has not been approved");
    }

    const isPI = proposal.principalInvestigator === userId;
    const isAdmin = isAdminRole(profile.role);
    const isTeamMember = proposal.teamMembers?.includes(userId);

    console.log("[getProjectDetail] Access check - isPI:", isPI, "isAdmin:", isAdmin, "isTeamMember:", isTeamMember);

    if (!isPI && !isAdmin && !isTeamMember) {
      throw new Error("Unauthorized: Must be PI, team member, or admin");
    }

    const call = await ctx.db.get(proposal.callId);
    const principal = await getUserComposite(ctx, proposal.principalInvestigator);
    const teamMembers = await Promise.all(
      (proposal.teamMembers ?? []).map(async (memberId: any) => getUserComposite(ctx, memberId))
    );

    console.log("[getProjectDetail] Fetched call, PI, and team members");

    // Get financial transactions for this project
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_project", (q: any) => q.eq("projectId", proposalId))
      .collect();

    console.log("[getProjectDetail] Fetched", transactions.length, "transactions");

    return {
      _id: proposal._id,
      title: proposal.title,
      status: proposal.status,

      // Basic info
      call: call ? { _id: call._id, title: call.title, slug: call.slug } : null,
      principalInvestigator: principal,
      teamMembers: teamMembers.filter(Boolean),

      // Proposal commitments (immutable)
      abstract: proposal.abstract,
      objectives: proposal.objectives,
      methodology: proposal.methodology,
      timeline: proposal.timeline ?? [],
      budget: proposal.budget,

      // Execution tracking
      kickoffDocument: proposal.kickoffDocument,
      kickoffDate: proposal.kickoffDate,
      actualStartDate: proposal.actualStartDate,
      actualEndDate: proposal.actualEndDate,
      milestoneExecution: proposal.milestoneExecution ?? [],
      budgetExecution: proposal.budgetExecution,
      activeAlerts: proposal.activeAlerts ?? [],

      // Timestamps
      submittedAt: proposal.submittedAt,
      approvedAt: proposal.approvedAt,
      updatedAt: proposal.updatedAt,

      // Transactions summary
      transactions: transactions.map((t: any) => ({
        _id: t._id,
        category: t.category,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        milestoneIndex: t.milestoneIndex,
      })),

      // User permissions
      canEdit: isPI || isAdmin,
      canViewFinancials: isPI || isAdmin || profile.role === "finance",
    };
  },
});

export const getProposalDetail = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx: QueryCtx, { proposalId }: any) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      return null;
    }

    const isAuthor = proposal.principalInvestigator === userId;
    if (!isAuthor) {
      assertReviewer(profile.role);
    }

    const call = await ctx.db.get(proposal.callId);
    const principal = await getUserComposite(ctx, proposal.principalInvestigator);
    const teamMembers = await Promise.all(
      proposal.teamMembers.map(async (memberId: any) => getUserComposite(ctx, memberId))
    );
  const assignedEvaluators = await Promise.all(
    (proposal.assignedEvaluators ?? []).map(async (evaluatorId: any) =>
      getUserComposite(ctx, evaluatorId)
    )
  );
  const canAssignEvaluators = ASSIGNMENT_ROLES.includes(
    profile.role as (typeof ASSIGNMENT_ROLES)[number]
  );
  const decisionByUser = proposal.decisionBy
    ? await getUserComposite(ctx, proposal.decisionBy)
    : null;

  const assignedEvaluatorMap = new Map<
    Id<"users">,
    NonNullable<UserComposite>
  >(
    assignedEvaluators
      .filter((evaluator: any): evaluator is NonNullable<UserComposite> => evaluator !== null)
      .map((evaluator: any) => [evaluator._id, evaluator] as const)
  );

  let evaluationSummary: {
    requiredEvaluations: number;
    assignedCount: number;
    submittedCount: number;
    inProgressCount: number;
    pendingCount: number;
    averageScore: number | null;
    criterionAverages: Array<{
      criteriaId: Id<"evaluationCriteria">;
      name: string;
      weight: number;
      maxScore: number;
      averageScore: number;
    }>;
    evaluations: Array<{
      _id: Id<"evaluations">;
      evaluator: UserComposite | null;
      status: "submitted" | "in_progress";
      overallScore: number;
      recommendation: string;
      completedAt: number | null;
      aiAssistanceUsed: boolean;
      confidentialComments: string;
      publicComments: string;
      rubric: Array<{
        criteriaId: Id<"evaluationCriteria">;
        criteriaName: string;
        score: number;
        maxScore: number;
        comments: string;
        strengths: string[];
        weaknesses: string[];
      }>;
    }>;
    pendingEvaluators: Array<UserComposite>;
  } | null = null;

  if (canAssignEvaluators) {
    const evaluationRecords = await ctx.db
      .query("evaluations")
      .withIndex("by_proposal", (q: any) => q.eq("proposalId", proposalId))
      .collect();

    const criteriaRecords = call?.evaluationCriteria
      ? await Promise.all(
          (call.evaluationCriteria as Id<"evaluationCriteria">[]).map((criterionId) =>
            ctx.db.get(criterionId)
          )
        )
      : [];

    const criteriaMap = new Map<
      Id<"evaluationCriteria">,
      {
        _id: Id<"evaluationCriteria">;
        name: string;
        weight: number;
        maxScore: number;
      }
    >(
      criteriaRecords
        .filter((entry: any): entry is NonNullable<typeof entry> => entry !== null)
        .map((entry: any) => [
          entry._id,
          {
            _id: entry._id,
            name: entry.name,
            weight: entry.weight,
            maxScore: entry.maxScore,
          },
        ])
    );

    const additionalEvaluatorIds = evaluationRecords
      .map((record: any) => record.evaluatorId)
      .filter((evaluatorId: any) => !assignedEvaluatorMap.has(evaluatorId));

    if (additionalEvaluatorIds.length > 0) {
      const additionalEvaluators = await Promise.all(
        additionalEvaluatorIds.map((id: any) => getUserComposite(ctx, id))
      );
      for (const evaluator of additionalEvaluators) {
        if (evaluator) {
          assignedEvaluatorMap.set(evaluator._id, evaluator);
        }
      }
    }

    const requiredEvaluations = call?.evaluationSettings?.evaluatorsRequired ?? 0;

    const submittedEvaluations = evaluationRecords.filter(
      (record) => record.completedAt !== undefined && record.completedAt !== null
    );
    const inProgressEvaluations = evaluationRecords.filter((record) => !record.completedAt);

    const pendingEvaluatorIds = (proposal.assignedEvaluators ?? []).filter(
      (evaluatorId) =>
        !evaluationRecords.some((record) => record.evaluatorId === evaluatorId)
    );

    const pendingEvaluators = pendingEvaluatorIds
      .map((id) => assignedEvaluatorMap.get(id))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    let overallScoreSum = 0;
    for (const record of submittedEvaluations) {
      overallScoreSum += record.overallScore;
    }
    const averageScore =
      submittedEvaluations.length > 0
        ? Number((overallScoreSum / submittedEvaluations.length).toFixed(2))
        : null;

    const criterionStats = new Map<
      Id<"evaluationCriteria">,
      {
        criteriaId: Id<"evaluationCriteria">;
        name: string;
        weight: number;
        maxScore: number;
        sum: number;
        count: number;
      }
    >();

    for (const record of submittedEvaluations) {
      for (const entry of record.rubric) {
        const criterion = criteriaMap.get(entry.criteriaId);
        if (!criterion) {
          continue;
        }
        if (!criterionStats.has(entry.criteriaId)) {
          criterionStats.set(entry.criteriaId, {
            criteriaId: entry.criteriaId,
            name: criterion.name,
            weight: criterion.weight,
            maxScore: criterion.maxScore,
            sum: 0,
            count: 0,
          });
        }
        const stats = criterionStats.get(entry.criteriaId)!;
        stats.sum += entry.score;
        stats.count += 1;
      }
    }

    const criterionAverages = Array.from(criterionStats.values())
      .map((stats) => ({
        criteriaId: stats.criteriaId,
        name: stats.name,
        weight: stats.weight,
        maxScore: stats.maxScore,
        averageScore: Number((stats.sum / stats.count).toFixed(2)),
      }))
      .sort((a, b) => b.weight - a.weight);

    const evaluationDetails = evaluationRecords
      .map((record) => {
        const evaluator = assignedEvaluatorMap.get(record.evaluatorId) ?? null;
        const status = record.completedAt ? "submitted" : "in_progress";
        const rubricDetails = record.rubric.map((entry) => {
          const criterion = criteriaMap.get(entry.criteriaId);
          return {
            criteriaId: entry.criteriaId,
            criteriaName: criterion?.name ?? "Criterion",
            score: entry.score,
            maxScore: entry.maxScore,
            comments: entry.comments,
            strengths: entry.strengths,
            weaknesses: entry.weaknesses,
          };
        });

        return {
          _id: record._id,
          evaluator,
          status,
          overallScore: record.overallScore,
          recommendation: record.recommendation,
          completedAt: record.completedAt ?? null,
          aiAssistanceUsed: record.aiAssistanceUsed,
          confidentialComments: record.confidentialComments,
          publicComments: record.publicComments,
          rubric: rubricDetails,
        };
      })
      .sort((a, b) => {
        const aTime = a.completedAt ?? 0;
        const bTime = b.completedAt ?? 0;
        return bTime - aTime;
      });

    evaluationSummary = {
      requiredEvaluations,
      assignedCount: proposal.assignedEvaluators?.length ?? 0,
      submittedCount: submittedEvaluations.length,
      inProgressCount: inProgressEvaluations.length,
      pendingCount: pendingEvaluators.length,
      averageScore,
      criterionAverages,
      evaluations: evaluationDetails,
      pendingEvaluators,
    };
  }

    const attachmentEntries = await Promise.all(
      (proposal.attachments ?? []).map(async (attachment: any) => {
        try {
          const downloadUrl = await ctx.storage.getUrl(attachment.storageId);
          if (!downloadUrl) {
            return null;
          }
          return {
            storageId: attachment.storageId,
            name: attachment.name ?? "",
            category: attachment.type ?? "optional",
            requirementId: attachment.requirementId ?? null,
            downloadUrl,
          };
        } catch (error) {
          console.warn("Failed to load attachment URL", attachment.storageId, error);
          return null;
        }
      })
    );
    const attachments = attachmentEntries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null
    );

    return {
      proposal: {
        _id: proposal._id,
        title: proposal.title,
        status: proposal.status,
        submittedAt: proposal.submittedAt ?? null,
        updatedAt: proposal.updatedAt,
        abstract: proposal.abstract,
        problemStatement: proposal.problemStatement,
        generalObjective: proposal.generalObjective,
        specificObjectives: proposal.specificObjectives,
        methodology: proposal.methodology,
        researchDesign: proposal.researchDesign ?? "",
        dataCollection: proposal.dataCollection ?? "",
        analysisPlan: proposal.analysisPlan ?? "",
        timeline: proposal.timeline,
        budget: proposal.budget,
        impact: proposal.impact,
        keywords: proposal.keywords,
        decisionAt: proposal.decisionAt ?? null,
        decisionNote: proposal.decisionNote ?? "",
      },
      call: call
        ? {
            _id: call._id,
            title: call.title,
            slug: call.slug ?? null,
            status: call.status,
            closeDate: call.closeDate,
            projectType: call.projectType,
            budgetRange: call.budget?.perProject ?? null,
            evaluationSettings: call.evaluationSettings ?? null,
          }
        : null,
      principalInvestigator: principal,
      teamMembers: teamMembers.filter(
        (member): member is NonNullable<UserComposite> => member !== null
      ),
      teamInvites: proposal.teamInvites ?? [],
      assignedEvaluators: assignedEvaluators.filter(
        (evaluator): evaluator is NonNullable<UserComposite> => evaluator !== null
      ),
      permissions: {
        canAssignEvaluators,
        canMakeDecision: canAssignEvaluators,
      },
      decision: {
        by: decisionByUser,
        at: proposal.decisionAt ?? null,
        note: proposal.decisionNote ?? "",
      },
      evaluationSummary,
      attachments,
    };
  },
});

function assertAssignmentManager(role: string) {
  if (!ASSIGNMENT_ROLES.includes(role as (typeof ASSIGNMENT_ROLES)[number])) {
    throw new Error("Unauthorized: evaluator assignment access required");
  }
}

async function getAssignmentForProposal(
  ctx: GenericCtx,
  proposalId: Id<"proposals">
) {
  return await ctx.db
    .query("evaluatorAssignments")
    .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
    .collect();
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getCurrentProfile(ctx);
    assertAuthor(profile.role);

    return await ctx.storage.generateUploadUrl();
  },
});

export const generateAttachmentDownloadUrl = mutation({
  args: {
    proposalId: v.id("proposals"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { proposalId, storageId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    const hasAccess = userCanAccessProposal(proposal, userId, profile.role);
    if (!hasAccess) {
      throw new Error("Unauthorized access to proposal document");
    }

    const isAttachmentKnown =
      (proposal.documents ?? []).some((documentId: Id<"_storage">) => documentId === storageId) ||
      (proposal.attachments ?? []).some(
        (attachment: { storageId: Id<"_storage"> }) => attachment.storageId === storageId
      );

    if (!isAttachmentKnown) {
      throw new Error("Requested document is not associated with this proposal");
    }

    const downloadUrl = await ctx.storage.getUrl(storageId);
    if (!downloadUrl) {
      throw new Error("Unable to generate download link for this document");
    }

    return downloadUrl;
  },
});

export const setAssignedEvaluators = mutation({
  args: {
    proposalId: v.id("proposals"),
    evaluatorIds: v.array(v.id("users")),
  },
  handler: async (ctx, { proposalId, evaluatorIds }) => {
    const { profile, userId } = await getCurrentProfile(ctx);
    assertAssignmentManager(profile.role);

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    const uniqueIds = Array.from(new Set(evaluatorIds)) as Array<Id<"users">>;
    const previousAssignments = new Set(
      (proposal.assignedEvaluators ?? []) as Array<Id<"users">>
    );
    const assignments = await getAssignmentForProposal(ctx, proposalId);

    const activeAssignments = new Map<Id<"users">, any>();
    for (const record of assignments) {
      if (record.status !== "removed") {
        activeAssignments.set(record.evaluatorId as Id<"users">, record);
      }
    }

    const now = Date.now();
    for (const evaluatorId of uniqueIds) {
      if (activeAssignments.has(evaluatorId)) {
        continue;
      }
      const existing = assignments.find(
        (record) => record.evaluatorId === evaluatorId && record.status === "removed"
      );
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "pending",
          declineReason: undefined,
          declineComment: undefined,
          coiDeclared: false,
          coiDetails: undefined,
          assignedAt: now,
          respondedAt: undefined,
          assignedBy: userId,
        });
      } else {
        await ctx.db.insert("evaluatorAssignments", {
          proposalId,
          evaluatorId,
          assignedBy: userId,
          assignmentMethod: "manual",
          status: "pending",
          declineReason: undefined,
          declineComment: undefined,
          coiDeclared: false,
          coiDetails: undefined,
          assignedAt: now,
          respondedAt: undefined,
        });
      }
    }

    for (const assignment of assignments) {
      if (
        assignment.status !== "removed" &&
        !uniqueIds.some((id) => id === assignment.evaluatorId)
      ) {
        await ctx.db.patch(assignment._id, {
          status: "removed",
          respondedAt: now,
        });
      }
    }

    await ctx.db.patch(proposalId, {
      assignedEvaluators: uniqueIds,
      updatedAt: Date.now(),
    });
    const addedEvaluators = uniqueIds.filter((id) => !previousAssignments.has(id));
    const removedEvaluators = Array.from(previousAssignments).filter(
      (id) => !uniqueIds.some((targetId) => targetId === id)
    );

    await logActivity(ctx, {
      userId,
      action: "proposal.evaluators_updated",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        addedEvaluators,
        removedEvaluators,
        totalAssigned: uniqueIds.length,
      },
    });
  },
});

const FINAL_DECISION_STATUSES = [
  "approved",
  "rejected",
  "revise_and_resubmit",
] as const;

export const finalizeProposalDecision = mutation({
  args: {
    proposalId: v.id("proposals"),
    decision: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("revise_and_resubmit")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, { proposalId, decision, note }) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    if (!ASSIGNMENT_ROLES.includes(profile.role as (typeof ASSIGNMENT_ROLES)[number])) {
      throw new Error("Unauthorized: admin decision required");
    }

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (!FINAL_DECISION_STATUSES.includes(decision as (typeof FINAL_DECISION_STATUSES)[number])) {
      throw new Error("Unsupported decision status");
    }

    const call = await ctx.db.get(proposal.callId);
    if (!call) {
      throw new Error("Call configuration missing for proposal");
    }

    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
      .collect();

    const submittedEvaluations = evaluations.filter(
      (record) => record.completedAt !== undefined && record.completedAt !== null
    );

    const requiredEvaluations = call.evaluationSettings?.evaluatorsRequired ?? 0;
    if (
      (decision === "approved" || decision === "rejected") &&
      requiredEvaluations > 0 &&
      submittedEvaluations.length < requiredEvaluations
    ) {
      throw new Error(
        `At least ${requiredEvaluations} completed evaluations are required before finalizing this decision.`
      );
    }

    const sanitizedNote = note ? sanitizeString(note) : undefined;
    const now = Date.now();

    await ctx.db.patch(proposalId, {
      status: decision,
      decisionBy: userId,
      decisionAt: now,
      decisionNote: sanitizedNote,
      updatedAt: now,
    });
    await logActivity(ctx, {
      userId,
      action: "proposal.decision_finalized",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        decision,
        submittedEvaluations: submittedEvaluations.length,
        requiredEvaluations,
      },
    });
  },
});

export const updateAssignmentStatus = mutation({
  args: {
    proposalId: v.id("proposals"),
    evaluatorId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("removed")
    ),
    declineReason: v.optional(v.string()),
    declineComment: v.optional(v.string()),
    coiDeclared: v.optional(v.boolean()),
    coiDetails: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { proposalId, evaluatorId, status, declineReason, declineComment, coiDeclared, coiDetails }
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    if (!ASSIGNMENT_STATUSES.includes(status as (typeof ASSIGNMENT_STATUSES)[number])) {
      throw new Error("Unsupported assignment status");
    }

    const assignments = await getAssignmentForProposal(ctx, proposalId);
    const assignment = assignments.find((record) => record.evaluatorId === evaluatorId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const isAdmin = ASSIGNMENT_ROLES.includes(profile.role as (typeof ASSIGNMENT_ROLES)[number]);
    const isEvaluator = assignment.evaluatorId === userId;

    if (!isAdmin && !isEvaluator) {
      throw new Error("Unauthorized: cannot modify assignment");
    }

    if (isEvaluator && !["accepted", "declined"].includes(status)) {
      throw new Error("Evaluators may only accept or decline assignments.");
    }

    if (status === "pending" && !isAdmin) {
      throw new Error("Only administrators can reset assignments to pending.");
    }

    const now = Date.now();

    await ctx.db.patch(assignment._id, {
      status,
      declineReason: declineReason ? sanitizeString(declineReason) : undefined,
      declineComment: declineComment ? sanitizeString(declineComment) : undefined,
      coiDeclared: coiDeclared ?? assignment.coiDeclared,
      coiDetails: coiDetails ? sanitizeString(coiDetails) : assignment.coiDetails,
      respondedAt:
        status === "pending" ? undefined : isEvaluator || status === "removed" ? now : assignment.respondedAt,
    });
    await logActivity(ctx, {
      userId,
      action: "proposal.assignment_updated",
      entityType: "proposal",
      entityId: proposalId,
      details: {
        evaluatorId,
        status,
        byAdmin: isAdmin,
      },
    });

    if (status === "removed" && isAdmin) {
      const proposal = await ctx.db.get(proposalId);
      if (proposal) {
        const remaining = (proposal.assignedEvaluators ?? []).filter((id) => id !== evaluatorId);
        await ctx.db.patch(proposalId, {
          assignedEvaluators: remaining,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Get call assignment overview with budget allocation tracking
 * For admin assignment manager view
 */
export const getCallAssignmentOverview = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx, { callId }) => {
    const { profile } = await getCurrentProfile(ctx);
    assertAssignmentManager(profile.role);

    // Get call with budget info
    const call = await ctx.db.get(callId);
    if (!call) {
      throw new Error("Call not found");
    }

    // Get all submitted proposals for this call
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_call", (q) => q.eq("callId", callId))
      .filter((q) => q.neq(q.field("status"), "draft"))
      .collect();

    // Get evaluators (all users with evaluator role)
    const allUsers = await ctx.db
      .query("users")
      .collect();

    const evaluators = allUsers.filter((u: any) => u.role === "evaluator");

    // Calculate evaluator workload
    const evaluatorWorkload = new Map<Id<"users">, number>();
    for (const evaluator of evaluators) {
      evaluatorWorkload.set(evaluator._id as Id<"users">, 0);
    }

    // Get all assignments for these proposals
    const allAssignments = await ctx.db
      .query("evaluatorAssignments")
      .collect();

    const proposalAssignments = new Map<Id<"proposals">, any[]>();
    for (const assignment of allAssignments) {
      const pId = assignment.proposalId as Id<"proposals">;
      if (proposals.some((p) => p._id === pId)) {
        if (!proposalAssignments.has(pId)) {
          proposalAssignments.set(pId, []);
        }
        proposalAssignments.get(pId)!.push(assignment);

        // Count workload (only active assignments)
        if (assignment.status !== "removed" && assignment.status !== "declined") {
          const evId = assignment.evaluatorId as Id<"users">;
          evaluatorWorkload.set(evId, (evaluatorWorkload.get(evId) || 0) + 1);
        }
      }
    }

    // Calculate budget allocation
    let totalRequested = 0;
    let totalApproved = 0;
    const proposalData = [];

    for (const proposal of proposals) {
      const budgetRequested = proposal.budget?.total ?? 0;
      totalRequested += budgetRequested;

      if (proposal.status === "approved" || proposal.status === "in_execution" || proposal.status === "completed") {
        totalApproved += budgetRequested;
      }

      const assignments = proposalAssignments.get(proposal._id as Id<"proposals">) || [];
      const activeAssignments = assignments.filter(
        (a) => a.status !== "removed" && a.status !== "declined"
      );

      const evaluatorDetails = await Promise.all(
        activeAssignments.map(async (assignment) => {
          const evaluator = await ctx.db.get(assignment.evaluatorId as Id<"users">);
          return {
            evaluatorId: assignment.evaluatorId,
            evaluatorName: evaluator?.name || "Unknown",
            evaluatorEmail: evaluator?.email || "",
            status: assignment.status,
            assignedAt: assignment.assignedAt,
          };
        })
      );

      proposalData.push({
        _id: proposal._id,
        title: proposal.title,
        principalInvestigator: proposal.principalInvestigator,
        status: proposal.status,
        budgetRequested,
        submittedAt: proposal.submittedAt,
        assignedEvaluators: evaluatorDetails,
        evaluationProgress: {
          assigned: activeAssignments.length,
          required: call.evaluationSettings?.evaluatorsRequired ?? 3,
        },
      });
    }

    // Prepare evaluator pool data
    const evaluatorPool = await Promise.all(
      evaluators.map(async (evaluator: any) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", evaluator._id))
          .first();

        return {
          _id: evaluator._id,
          name: evaluator.name || "Unknown",
          email: evaluator.email || "",
          department: userProfile?.department,
          researchAreas: userProfile?.researchAreas || [],
          currentWorkload: evaluatorWorkload.get(evaluator._id as Id<"users">) || 0,
        };
      })
    );

    return {
      call: {
        _id: call._id,
        title: call.title,
        totalBudget: call.budget?.total ?? 0,
        budgetPerProject: call.budget?.perProject,
        evaluatorsRequired: call.evaluationSettings?.evaluatorsRequired ?? 3,
        status: call.status,
      },
      budget: {
        total: call.budget?.total ?? 0,
        requested: totalRequested,
        approved: totalApproved,
        available: (call.budget?.total ?? 0) - totalApproved,
        utilizationRate: call.budget?.total ? (totalApproved / call.budget.total) * 100 : 0,
      },
      proposals: proposalData,
      evaluatorPool,
      summary: {
        totalProposals: proposals.length,
        fullyAssigned: proposalData.filter(
          (p) => p.evaluationProgress.assigned >= p.evaluationProgress.required
        ).length,
        needsAssignment: proposalData.filter(
          (p) => p.evaluationProgress.assigned < p.evaluationProgress.required
        ).length,
      },
    };
  },
});

/**
 * Get evaluator workload across all calls
 * For admin capacity planning view
 */
export const getEvaluatorWorkloadOverview = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getCurrentProfile(ctx);
    assertAssignmentManager(profile.role);

    // Get all evaluators
    const allUsers = await ctx.db.query("users").collect();
    const evaluators = allUsers.filter((u: any) => u.role === "evaluator");

    // Get all active calls
    const activeCalls = await ctx.db
      .query("calls")
      .withIndex("by_status")
      .filter((q) => q.or(q.eq(q.field("status"), "open"), q.eq(q.field("status"), "closed")))
      .collect();

    // Get all assignments
    const allAssignments = await ctx.db.query("evaluatorAssignments").collect();

    // Get all evaluations
    const allEvaluations = await ctx.db.query("evaluations").collect();

    // Build evaluator workload data
    const evaluatorData = await Promise.all(
      evaluators.map(async (evaluator: any) => {
        const evaluatorId = evaluator._id as Id<"users">;

        // Get user profile
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", evaluatorId))
          .first();

        // Get assignments for this evaluator
        const assignments = allAssignments.filter(
          (a) => a.evaluatorId === evaluatorId && a.status !== "removed" && a.status !== "declined"
        );

        // Get evaluations for this evaluator
        const evaluations = allEvaluations.filter((e) => e.evaluatorId === evaluatorId);

        // Calculate statistics
        const totalAssigned = assignments.length;
        const totalCompleted = evaluations.filter((e) => e.status === "submitted").length;
        const inProgress = evaluations.filter((e) => e.status === "draft").length;
        const pending = totalAssigned - totalCompleted - inProgress;

        // Get proposals with call info
        const assignmentDetails = await Promise.all(
          assignments.map(async (assignment) => {
            const proposal = await ctx.db.get(assignment.proposalId as Id<"proposals">);
            const call = proposal ? await ctx.db.get(proposal.callId as Id<"calls">) : null;
            const evaluation = evaluations.find((e) => e.proposalId === assignment.proposalId);

            return {
              assignmentId: assignment._id,
              proposalId: assignment.proposalId,
              proposalTitle: proposal?.title || "Unknown Proposal",
              callId: call?._id,
              callTitle: call?.title || "Unknown Call",
              assignedAt: assignment.assignedAt,
              status: evaluation?.status || "pending",
              submittedAt: evaluation?.submittedAt,
            };
          })
        );

        return {
          _id: evaluatorId,
          name: evaluator.name || "Unknown",
          email: evaluator.email || "",
          department: userProfile?.department,
          researchAreas: userProfile?.researchAreas || [],
          campus: userProfile?.campus,
          workload: {
            total: totalAssigned,
            pending,
            inProgress,
            completed: totalCompleted,
            utilizationRate: totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0,
          },
          assignments: assignmentDetails,
        };
      })
    );

    // Sort by workload (descending)
    evaluatorData.sort((a, b) => b.workload.total - a.workload.total);

    return {
      evaluators: evaluatorData,
      summary: {
        totalEvaluators: evaluatorData.length,
        activeEvaluators: evaluatorData.filter((e) => e.workload.total > 0).length,
        totalAssignments: evaluatorData.reduce((sum, e) => sum + e.workload.total, 0),
        averageWorkload:
          evaluatorData.length > 0
            ? evaluatorData.reduce((sum, e) => sum + e.workload.total, 0) / evaluatorData.length
            : 0,
        maxWorkload: Math.max(...evaluatorData.map((e) => e.workload.total), 0),
        minWorkload: Math.min(...evaluatorData.map((e) => e.workload.total), Infinity),
      },
      activeCalls: activeCalls.map((call) => ({
        _id: call._id,
        title: call.title,
        status: call.status,
      })),
    };
  },
});

/**
 * Get evaluation summary for proposal owners
 * Shows evaluations as they come in (real-time transparency)
 */
export const getProposalEvaluationsForOwner = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx: QueryCtx, { proposalId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) {
      return null;
    }

    // Verify access: Must be PI, team member, or admin
    const isAdmin = profile.role === "sysadmin" || profile.role === "admin";
    const isPIOrTeam =
      proposal.principalInvestigator === userId ||
      (proposal.teamMembers ?? []).includes(userId);

    if (!isAdmin && !isPIOrTeam) {
      throw new Error("Access denied: Only PI, team members, and admins can view evaluations");
    }

    // Only show evaluations if proposal is submitted or later
    if (proposal.status === "draft") {
      return {
        canView: false,
        reason: "Evaluations will be visible after submission",
      };
    }

    // Get all evaluations for this proposal
    const allEvaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_proposal", (q: any) => q.eq("proposalId", proposalId))
      .collect();

    // Get call settings for blind review
    const call = await ctx.db.get(proposal.callId);
    const blindReview = call?.evaluationSettings?.blindReview ?? false;
    const requiredEvaluations = call?.evaluationSettings?.evaluatorsRequired ?? 0;

    // Separate completed vs in-progress
    const completedEvaluations = allEvaluations.filter((e) => e.completedAt);
    const inProgressEvaluations = allEvaluations.filter((e) => !e.completedAt);

    // Calculate statistics
    const averageScore =
      completedEvaluations.length > 0
        ? completedEvaluations.reduce((sum, e) => sum + e.overallScore, 0) /
          completedEvaluations.length
        : null;

    const recommendationCounts = completedEvaluations.reduce(
      (acc, e) => {
        acc[e.recommendation] = (acc[e.recommendation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get evaluator details (names only if not blind)
    const evaluationsWithDetails = await Promise.all(
      completedEvaluations.map(async (evaluation) => {
        const evaluator = blindReview
          ? null
          : await ctx.db.get(evaluation.evaluatorId);

        return {
          _id: evaluation._id,
          evaluatorName: blindReview
            ? "Anonymous Reviewer"
            : evaluator?.name ?? "Unknown",
          overallScore: evaluation.overallScore,
          recommendation: evaluation.recommendation,
          publicComments: evaluation.publicComments,
          rubric: evaluation.rubric.map((r) => ({
            criteriaId: r.criteriaId,
            score: r.score,
            maxScore: r.maxScore,
            comments: r.comments,
            strengths: r.strengths,
            weaknesses: r.weaknesses,
          })),
          completedAt: evaluation.completedAt,
          aiAssistanceUsed: evaluation.aiAssistanceUsed,
        };
      })
    );

    // Get clarification requests
    const clarificationRequests = await ctx.db
      .query("clarificationRequests")
      .withIndex("by_proposal", (q: any) => q.eq("proposalId", proposalId))
      .collect();

    const clarificationsWithDetails = await Promise.all(
      clarificationRequests.map(async (clarification) => {
        const evaluator = blindReview
          ? null
          : await ctx.db.get(clarification.evaluatorId);

        return {
          _id: clarification._id,
          evaluatorName: blindReview
            ? "Anonymous Reviewer"
            : evaluator?.name ?? "Unknown",
          requestText: clarification.requestText,
          requestCategory: clarification.requestCategory,
          requestedAt: clarification.requestedAt,
          responseText: clarification.responseText,
          responseAttachments: clarification.responseAttachments,
          respondedAt: clarification.respondedAt,
          status: clarification.status,
        };
      })
    );

    // Get decision info
    const decision = proposal.decisionBy
      ? {
          decidedBy: proposal.decisionBy,
          decidedAt: proposal.decisionAt,
          note: proposal.decisionNote,
          status: proposal.status,
        }
      : null;

    return {
      canView: true,
      summary: {
        totalEvaluators: proposal.assignedEvaluators?.length ?? 0,
        requiredEvaluations,
        completedCount: completedEvaluations.length,
        inProgressCount: inProgressEvaluations.length,
        averageScore,
        recommendationCounts,
      },
      evaluations: evaluationsWithDetails.sort(
        (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
      ),
      clarifications: clarificationsWithDetails.sort(
        (a, b) => b.requestedAt - a.requestedAt
      ),
      decision,
      blindReview,
    };
  },
});

/**
 * Update proposal with AI fit analysis scores (internal only)
 */
export const updateProposalFitScores = internalMutation({
  args: {
    proposalId: v.id("proposals"),
    fitScores: v.object({
      overallScore: v.number(),
      scores: v.object({
        eligibility: v.number(),
        budget: v.number(),
        timeline: v.number(),
        strategicFit: v.number(),
      }),
      recommendations: v.array(v.string()),
      redFlags: v.array(v.string()),
      reasoning: v.string(),
      generatedAt: v.number(),
      model: v.string(),
      tokensUsed: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.proposalId, {
      proposalFitScores: args.fitScores,
      updatedAt: Date.now(),
    });
  },
});
