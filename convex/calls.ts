/**
 * Call Management Functions
 *
 * Implements the primary CRUD operations for funding calls as described in the
 * Phase 1 specification. Focuses on admin creation and public listing of open
 * calls while enforcing role-based access controls.
 */

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { auth } from "./auth";

const ADMIN_ROLES = ["sysadmin", "admin"] as const;
const CALL_STATUSES = ["draft", "open", "closed", "archived"] as const;
const ASSIGNMENT_METHODS = [
  "manual",
  "auto_balanced",
  "ai_matched",
] as const;

function sanitizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugCandidates(input: string) {
  const candidates = new Set<string>();
  if (input) {
    candidates.add(input);
  }
  const sanitized = sanitizeSlug(input);
  if (sanitized) {
    candidates.add(sanitized);
  }
  if (typeof input.normalize === "function") {
    const ascii = input
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
    if (ascii) {
      candidates.add(ascii.replace(/\s+/g, "-"));
      const asciiSanitized = sanitizeSlug(ascii);
      if (asciiSanitized) {
        candidates.add(asciiSanitized);
      }
    }
  }
  return Array.from(candidates);
}

function ensureStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function normalizeCallRecord(call: any) {
  const objectives = ensureStringArray(call.objectives);
  const targetAudience = ensureStringArray(call.targetAudience);

  const eligibilitySource =
    call.eligibility && typeof call.eligibility === "object" && !Array.isArray(call.eligibility)
      ? call.eligibility
      : null;

  const teamCompositionSource = eligibilitySource?.teamComposition;

  const eligibility = {
    campuses: ensureStringArray(eligibilitySource?.campuses),
    departments: ensureStringArray(eligibilitySource?.departments),
    academicRanks: ensureStringArray(eligibilitySource?.academicRanks),
    qualifications: ensureStringArray(eligibilitySource?.qualifications ?? call.eligibility),
    teamComposition: teamCompositionSource
      ? {
          requiredRoles: ensureStringArray(teamCompositionSource.requiredRoles),
          notes: teamCompositionSource.notes ? String(teamCompositionSource.notes).trim() : undefined,
          minTeamMembers: teamCompositionSource.minTeamMembers ?? undefined,
          maxTeamMembers: teamCompositionSource.maxTeamMembers ?? undefined,
        }
      : undefined,
    conflictPolicies: ensureStringArray(eligibilitySource?.conflictPolicies),
  } as const;

  const timelineSource =
    call.timeline && typeof call.timeline === "object"
      ? call.timeline
      : ({ openDate: call.openDate, closeDate: call.closeDate } as Record<string, number | undefined>);

  const timeline = {
    openDate: timelineSource.openDate ?? call.openDate,
    closeDate: timelineSource.closeDate ?? call.closeDate,
    evaluationStart: timelineSource.evaluationStart,
    evaluationEnd: timelineSource.evaluationEnd,
    decisionDate: timelineSource.decisionDate,
    projectStart: timelineSource.projectStart,
    projectEnd: timelineSource.projectEnd,
    gracePeriodHours: timelineSource.gracePeriodHours,
  } as const;

  const budgetSource =
    call.budget && typeof call.budget === "object"
      ? call.budget
      : {
          total: call.budgetTotal ?? 0,
          perProject: call.budgetPerProject ?? { min: 0, max: 0 },
        };

  const budget = {
    total: Number(budgetSource.total ?? 0),
    perProject: {
      min: Number(budgetSource.perProject?.min ?? 0),
      max: Number(budgetSource.perProject?.max ?? 0),
    },
    allowedCategories: ensureStringArray(budgetSource.allowedCategories),
    justificationThreshold:
      budgetSource.justificationThreshold !== undefined
        ? Number(budgetSource.justificationThreshold)
        : undefined,
    notes: budgetSource.notes ? String(budgetSource.notes).trim() : undefined,
  } as const;

  const documentsSource =
    call.documents && typeof call.documents === "object"
      ? call.documents
      : {
          required: call.requiredDocuments ?? [],
          optional: [],
          guidelinesId: call.guidelines,
        };

  const documents = {
    required: ensureStringArray(documentsSource.required),
    optional: ensureStringArray(documentsSource.optional),
    templateId: documentsSource.templateId ?? undefined,
    guidelinesId: documentsSource.guidelinesId ?? undefined,
  } as const;

  const evaluationSource =
    call.evaluationSettings && typeof call.evaluationSettings === "object"
      ? call.evaluationSettings
      : {};

  const evaluationSettings = {
    rubricTemplateId:
      evaluationSource.rubricTemplateId ??
      evaluationSource.rubricId ??
      undefined,
    evaluatorsRequired: Number(evaluationSource.evaluatorsRequired ?? 3),
    blindReview: Boolean(evaluationSource.blindReview ?? false),
    assignmentMethod:
      evaluationSource.assignmentMethod && ASSIGNMENT_METHODS.includes(evaluationSource.assignmentMethod)
        ? evaluationSource.assignmentMethod
        : "manual",
    conflictPolicies: ensureStringArray(evaluationSource.conflictPolicies),
  } as const;

  return {
    ...call,
    objectives,
    targetAudience,
    eligibility,
    timeline,
    budget,
    documents,
    evaluationSettings,
    status: CALL_STATUSES.includes(call.status) ? call.status : "draft",
  } as const;
}

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

function assertAdmin(role: string) {
  if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    throw new Error("Unauthorized: Kimia admin access required");
  }
}

/**
 * List calls visible to the current user.
 * - Admin roles see every call (draft/open/closed/archived).
 * - Other roles see open and closed calls (not draft or archived).
 */
export const listCalls = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("open"), v.literal("closed"), v.literal("archived"))),
  },
  handler: async (ctx: QueryCtx, args: { status?: "draft" | "open" | "closed" | "archived" }) => {
    const { profile } = await getCurrentProfile(ctx);

    if (ADMIN_ROLES.includes(profile.role as (typeof ADMIN_ROLES)[number])) {
      // Admins see all calls
      const adminCalls = await ctx.db
        .query("calls")
        .withIndex("by_dates")
        .collect();

      // Filter by status if provided
      const filteredCalls = args.status
        ? adminCalls.filter((call: any) => call.status === args.status)
        : adminCalls;

      return filteredCalls
        .sort((a: any, b: any) => b.openDate - a.openDate)
        .map((call: any) => normalizeCallRecord(call));
    }

    // Non-admins see open and closed calls only (not draft or archived)
    const allCalls = await ctx.db.query("calls").collect();

    let visibleCalls = allCalls.filter((call: any) => call.status === "open" || call.status === "closed");

    // Filter by status if provided
    if (args.status) {
      visibleCalls = visibleCalls.filter((call: any) => call.status === args.status);
    }

    return visibleCalls
      .sort((a: any, b: any) => {
        // Sort open calls first (by close date), then closed calls (by close date descending)
        if (a.status === "open" && b.status === "closed") return -1;
        if (a.status === "closed" && b.status === "open") return 1;
        return a.status === "open"
          ? a.closeDate - b.closeDate  // Open: ascending (soonest deadline first)
          : b.closeDate - a.closeDate; // Closed: descending (most recent first)
      })
      .map((call: any) => normalizeCallRecord(call));
  },
});

export const getCallSummary = query({
  args: {
    callId: v.id("calls"),
  },
  handler: async (ctx: QueryCtx, { callId }: { callId: Id<"calls"> }) => {
    const { profile } = await getCurrentProfile(ctx);
    if (!profile) {
      throw new Error("Unauthorized");
    }

    const call = await ctx.db.get(callId);
    if (!call) {
      return null;
    }

    const normalized = normalizeCallRecord(call);
    return {
      _id: normalized._id,
      title: normalized.title,
      slug: normalized.slug,
      status: normalized.status,
      openDate: normalized.openDate,
      closeDate: normalized.closeDate,
      projectType: normalized.projectType,
      budget: normalized.budget,
      timeline: normalized.timeline,
      requiredDocuments: normalized.documents.required,
    };
  },
});

/**
 * Create a new call. Restricted to Kimia/System admins.
 */
export const createCall = mutation({
  args: {
    overview: v.object({
      title: v.string(),
      slug: v.optional(v.string()),
      description: v.string(),
      objectives: v.array(v.string()),
      projectType: v.string(),
      targetAudience: v.array(v.string()),
    }),
    eligibility: v.object({
      campuses: v.optional(v.array(v.string())),
      departments: v.optional(v.array(v.string())),
      academicRanks: v.optional(v.array(v.string())),
      qualifications: v.optional(v.array(v.string())),
      teamComposition: v.optional(
        v.object({
          requiredRoles: v.optional(v.array(v.string())),
          notes: v.optional(v.string()),
          minTeamMembers: v.optional(v.number()),
          maxTeamMembers: v.optional(v.number()),
        })
      ),
      conflictPolicies: v.optional(v.array(v.string())),
    }),
    timeline: v.object({
      openDate: v.number(),
      closeDate: v.number(),
      evaluationStart: v.optional(v.number()),
      evaluationEnd: v.optional(v.number()),
      decisionDate: v.optional(v.number()),
      projectStart: v.optional(v.number()),
      projectEnd: v.optional(v.number()),
      gracePeriodHours: v.optional(v.number()),
    }),
    budget: v.object({
      total: v.number(),
      perProject: v.object({ min: v.number(), max: v.number() }),
      allowedCategories: v.array(v.string()),
      justificationThreshold: v.optional(v.number()),
      notes: v.optional(v.string()),
    }),
    documents: v.object({
      required: v.array(v.string()),
      optional: v.array(v.string()),
      templateId: v.optional(v.id("_storage")),
      guidelinesId: v.optional(v.id("_storage")),
    }),
    evaluation: v.object({
      rubricTemplateId: v.optional(v.id("rubricTemplates")),
      rubricId: v.optional(v.id("evaluationCriteria")),
      evaluatorsRequired: v.number(),
      blindReview: v.boolean(),
      assignmentMethod: v.union(
        v.literal("manual"),
        v.literal("auto_balanced"),
        v.literal("ai_matched")
      ),
      conflictPolicies: v.array(v.string()),
    }),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("open"),
        v.literal("closed"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx: MutationCtx, args: any) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    assertAdmin(profile.role);

    const trimList = (list: string[]) => list.map((item: string) => item.trim()).filter(Boolean);

    if (args.timeline.openDate >= args.timeline.closeDate) {
      throw new Error("Close date must be after open date");
    }

    if (args.budget.perProject.min > args.budget.perProject.max) {
      throw new Error("Minimum budget per project cannot exceed maximum");
    }

    if (args.budget.perProject.max > args.budget.total) {
      throw new Error("Per-project maximum cannot exceed total call budget");
    }

    if (!CALL_STATUSES.includes((args.status ?? "draft") as (typeof CALL_STATUSES)[number])) {
      throw new Error("Invalid call status provided");
    }

    const {
      rubricTemplateId: evaluationTemplateId,
      rubricId: legacyRubricId,
      ...evaluationConfig
    } = args.evaluation;

    if (!ASSIGNMENT_METHODS.includes(evaluationConfig.assignmentMethod as (typeof ASSIGNMENT_METHODS)[number])) {
      throw new Error("Invalid assignment method");
    }

    if (evaluationConfig.evaluatorsRequired < 1) {
      throw new Error("At least one evaluator is required");
    }

    if (args.timeline.gracePeriodHours && args.timeline.gracePeriodHours < 0) {
      throw new Error("Grace period cannot be negative");
    }

    const trimmedObjectives = trimList(args.overview.objectives);
    const targetAudience = trimList(args.overview.targetAudience);
    const allowedCategories = trimList(args.budget.allowedCategories);
    const requiredDocuments = trimList(args.documents.required);
    const optionalDocuments = trimList(args.documents.optional);
    const evaluationConflictPolicies = trimList(evaluationConfig.conflictPolicies ?? []);

    const rubricTemplateId = evaluationTemplateId ?? null;
    let evaluationCriteriaIds: Array<Id<"evaluationCriteria">> = [];

    if (rubricTemplateId) {
      const template = await ctx.db.get(rubricTemplateId);
      if (!template) {
        throw new Error("Rubric template not found");
      }
      evaluationCriteriaIds = (template.criteriaIds ?? []) as Array<Id<"evaluationCriteria">>;
    } else if (legacyRubricId) {
      evaluationCriteriaIds = [legacyRubricId as Id<"evaluationCriteria">];
    }

    const teamComposition = args.eligibility.teamComposition
      ? {
          ...args.eligibility.teamComposition,
          requiredRoles: args.eligibility.teamComposition.requiredRoles
            ?.map((item: string) => item.trim())
            .filter(Boolean),
          notes: args.eligibility.teamComposition.notes?.trim(),
        }
      : undefined;

    const eligibility = {
      campuses: args.eligibility.campuses?.map((item: string) => item.trim()).filter(Boolean),
      departments: args.eligibility.departments?.map((item: string) => item.trim()).filter(Boolean),
      academicRanks: args.eligibility.academicRanks?.map((item: string) => item.trim()).filter(Boolean),
      qualifications: args.eligibility.qualifications?.map((item: string) => item.trim()).filter(Boolean),
      teamComposition,
      conflictPolicies: args.eligibility.conflictPolicies?.map((item: string) => item.trim()).filter(Boolean),
    };

    const desiredSlugRaw = args.overview.slug?.trim() || args.overview.title;
    const baseSlug = desiredSlugRaw ? sanitizeSlug(desiredSlugRaw) : "";
    let uniqueSlug: string | undefined = baseSlug || undefined;
    if (baseSlug) {
      uniqueSlug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await ctx.db
          .query("calls")
          .withIndex("by_slug", (q: any) => q.eq("slug", uniqueSlug!))
          .first();
        if (!existing) {
          break;
        }
        counter += 1;
        uniqueSlug = `${baseSlug}-${counter}`;
      }
    }

    const callId = await ctx.db.insert("calls", {
      title: args.overview.title.trim(),
      slug: uniqueSlug,
      description: args.overview.description.trim(),
      objectives: trimmedObjectives,
      projectType: args.overview.projectType.trim(),
      targetAudience,
      eligibility,
      openDate: args.timeline.openDate,
      closeDate: args.timeline.closeDate,
      timeline: args.timeline,
      budget: {
        ...args.budget,
        allowedCategories,
      },
      documents: {
        required: requiredDocuments,
        optional: optionalDocuments,
        templateId: args.documents.templateId,
        guidelinesId: args.documents.guidelinesId,
      },
      evaluationSettings: {
        ...evaluationConfig,
        rubricTemplateId: rubricTemplateId ?? undefined,
        conflictPolicies: evaluationConflictPolicies,
      },
      status: args.status ?? "draft",
      evaluationCriteria: evaluationCriteriaIds,
      requiredDocuments,
      guidelines: args.documents.guidelinesId,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishedAt: args.status === "open" ? Date.now() : undefined,
    });

    return callId;
  },
});

/**
 * Update call status (admin only) to advance lifecycle without editing all metadata.
 */
export const updateCallStatus = mutation({
  args: {
    callId: v.id("calls"),
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("closed"),
      v.literal("archived")
    ),
  },
  handler: async (ctx: MutationCtx, args: any) => {
    const { profile } = await getCurrentProfile(ctx);
    assertAdmin(profile.role);

    if (args.status === "open" || args.status === "closed") {
      const call = await ctx.db.get(args.callId);
      if (!call) {
        throw new Error("Call not found");
      }

      if (args.status === "open" && call.openDate > Date.now()) {
        throw new Error("Cannot open a call before its scheduled open date");
      }
    }

    await ctx.db.patch(args.callId, {
      status: args.status,
      publishedAt: args.status === "open" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get call by ID (for internal use, e.g., AI actions)
 */
export const getCallById = query({
  args: { callId: v.id("calls") },
  handler: async (ctx: QueryCtx, { callId }: { callId: Id<"calls"> }) => {
    const call = await ctx.db.get(callId);
    return call;
  },
});

/**
 * Fetch a single call by slug (or id fallback) including FAQs and bookmark stats.
 */
export const getCallDetail = query({
  args: { slug: v.string() },
  handler: async (ctx: QueryCtx, { slug }: { slug: string }) => {
    let call = null;
    for (const candidate of slugCandidates(slug)) {
      call = await ctx.db
        .query("calls")
        .withIndex("by_slug", (q: any) => q.eq("slug", candidate))
        .first();
      if (call) {
        break;
      }
    }

    if (!call) {
      try {
        call = await ctx.db.get(slug as Id<"calls">);
      } catch (error) {
        // Ignore cast errors; treat as not found
      }
    }

    if (!call) {
      return null;
    }

    const userId = await auth.getUserId(ctx);
    const profile = userId
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", userId))
          .first()
      : null;

    const isAdmin = profile
      ? ADMIN_ROLES.includes(profile.role as (typeof ADMIN_ROLES)[number])
      : false;

    const faqs = await ctx.db
      .query("callFaqs")
      .withIndex("by_call", (q: any) => q.eq("callId", call._id))
      .collect();

    const bookmarkDocs = await ctx.db
      .query("bookmarks")
      .withIndex("by_call", (q: any) => q.eq("callId", call._id))
      .collect();

    let isBookmarked = false;
    if (userId) {
      const userBookmark = await ctx.db
        .query("bookmarks")
        .withIndex("unique_bookmark", (q: any) => q.eq("userId", userId).eq("callId", call._id))
        .first();
      isBookmarked = !!userBookmark;
    }

    let proposalCount: number | undefined;
    if (isAdmin) {
      const proposals = await ctx.db
        .query("proposals")
        .withIndex("by_call", (q: any) => q.eq("callId", call._id))
        .collect();
      proposalCount = proposals.length;
    }

    const sortedFaqs = faqs.sort((a: any, b: any) => a.order - b.order);

    const normalizedCall = normalizeCallRecord(call);

    return {
      call: normalizedCall,
      faqs: sortedFaqs,
      permissions: { isAdmin },
      stats: {
        bookmarkCount: bookmarkDocs.length,
        proposalCount,
      },
      isBookmarked,
    } as const;
  },
});

/**
 * Set or clear a bookmark for the current user.
 */
export const setBookmark = mutation({
  args: {
    callId: v.id("calls"),
    bookmarked: v.boolean(),
  },
  handler: async (ctx: MutationCtx, { callId, bookmarked }: { callId: Id<"calls">; bookmarked: boolean }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("unique_bookmark", (q: any) => q.eq("userId", userId).eq("callId", callId))
      .first();

    if (bookmarked) {
      if (!existing) {
        await ctx.db.insert("bookmarks", {
          userId,
          callId,
          createdAt: Date.now(),
        });
      }
      return;
    }

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const saveFaq = mutation({
  args: {
    callId: v.id("calls"),
    faqId: v.optional(v.id("callFaqs")),
    question: v.string(),
    answer: v.string(),
    order: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args: any) => {
    const { profile, userId } = await getCurrentProfile(ctx);
    assertAdmin(profile.role);

    const question = args.question.trim();
    const answer = args.answer.trim();
    const category = args.category?.trim();

    if (!question) {
      throw new Error("FAQ question is required");
    }
    if (!answer) {
      throw new Error("FAQ answer is required");
    }

    const call = await ctx.db.get(args.callId);
    if (!call) {
      throw new Error("Call not found");
    }

    if (args.faqId) {
      const existingFaq = await ctx.db.get(args.faqId);
      if (!existingFaq || existingFaq.callId !== args.callId) {
        throw new Error("FAQ not found");
      }
      await ctx.db.patch(args.faqId, {
        question,
        answer,
        category: category || undefined,
        order: args.order ?? existingFaq.order,
        updatedAt: Date.now(),
      });
      return { faqId: args.faqId, mode: "updated" as const };
    }

    let nextOrder = args.order ?? 0;
    if (!nextOrder || nextOrder <= 0) {
      const existingFaqs = await ctx.db
        .query("callFaqs")
        .withIndex("by_call", (q: any) => q.eq("callId", args.callId))
        .collect();
      nextOrder = existingFaqs.length + 1;
    }

    const newFaqId = await ctx.db.insert("callFaqs", {
      callId: args.callId,
      question,
      answer,
      order: nextOrder,
      category: category || undefined,
      aiGenerated: false,
      createdBy: userId as Id<"users">,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { faqId: newFaqId, mode: "created" as const };
  },
});

export const deleteFaq = mutation({
  args: {
    faqId: v.id("callFaqs"),
  },
  handler: async (ctx: MutationCtx, { faqId }: { faqId: Id<"callFaqs"> }) => {
    const { profile } = await getCurrentProfile(ctx);
    assertAdmin(profile.role);

    const faq = await ctx.db.get(faqId);
    if (!faq) {
      throw new Error("FAQ not found");
    }

    const callId = faq.callId;
    await ctx.db.delete(faqId);

    const remainingFaqs = await ctx.db
      .query("callFaqs")
      .withIndex("by_call", (q: any) => q.eq("callId", callId))
      .collect();

    const sorted = remainingFaqs
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((record: any, index: number) => ({ record, newOrder: index + 1 }));

    await Promise.all(
      sorted.map(({ record, newOrder }: { record: any; newOrder: number }) =>
        ctx.db.patch(record._id, {
          order: newOrder,
          updatedAt: Date.now(),
        })
      )
    );
  },
});
