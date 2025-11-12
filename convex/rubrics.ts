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

const ADMIN_ROLES = ["sysadmin", "admin"] as const;
const CRITERION_TYPES = new Set([
  "innovation",
  "feasibility",
  "impact",
  "methodology",
  "budget",
  "team",
  "sustainability",
]);

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

function ensureAdmin(role: string) {
  if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    throw new Error("Admin privileges required");
  }
}

function sanitizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

type CriterionInput = {
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  type: string;
  scale: Array<{ score: number; descriptor: string }>;
  requireComments?: boolean;
};

const scaleValidator = v.array(
  v.object({
    score: v.number(),
    descriptor: v.string(),
  })
);

const criterionValidator = v.object({
  name: v.string(),
  description: v.string(),
  weight: v.number(),
  maxScore: v.number(),
  type: v.string(),
  scale: scaleValidator,
  requireComments: v.optional(v.boolean()),
});

function validateCriteria(criteria: CriterionInput[]) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.5) {
    throw new Error("Criterion weights must add up to 100%");
  }

  for (const criterion of criteria) {
    if (!CRITERION_TYPES.has(criterion.type)) {
      throw new Error(`Unsupported criterion type: ${criterion.type}`);
    }
    if (criterion.maxScore <= 0) {
      throw new Error(`Criterion "${criterion.name}" must have a positive max score.`);
    }
  }
}

async function createCriterionRecords(
  ctx: MutationCtx,
  criteria: CriterionInput[],
  timestamp: number
) {
  const criterionIds: Array<Id<"evaluationCriteria">> = [];
  for (const criterion of criteria) {
    const criterionId = await ctx.db.insert("evaluationCriteria", {
      name: sanitizeText(criterion.name),
      description: sanitizeText(criterion.description),
      weight: Number(criterion.weight),
      maxScore: Number(criterion.maxScore),
      scale: criterion.scale.map((entry) => ({
        score: Number(entry.score),
        descriptor: sanitizeText(entry.descriptor),
      })),
      type: criterion.type,
      requireComments: Boolean(criterion.requireComments),
      createdAt: timestamp,
    });
    criterionIds.push(criterionId);
  }
  return criterionIds;
}

export const listTemplates = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const { profile } = await getCurrentProfile(ctx);
    ensureAdmin(profile.role);

    const templates = await ctx.db
      .query("rubricTemplates")
      .withIndex("by_name", (q: any) => q)
      .take(200);

    const criteriaIds = new Set<Id<"evaluationCriteria">>();
    for (const template of templates) {
      for (const criterionId of template.criteriaIds ?? []) {
        criteriaIds.add(criterionId as Id<"evaluationCriteria">);
      }
    }

    const criteriaEntries = await Promise.all(
      Array.from(criteriaIds).map(async (criterionId) => [criterionId, await ctx.db.get(criterionId)] as const)
    );
    const criteriaMap = new Map<Id<"evaluationCriteria">, any>();
    for (const [criterionId, record] of criteriaEntries) {
      if (record) {
        criteriaMap.set(criterionId, record);
      }
    }

    return templates
      .map((template) => ({
        _id: template._id,
        name: template.name,
        description: template.description ?? "",
        version: template.version,
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt ?? template.createdAt,
        sourceTemplateId: template.sourceTemplateId ?? null,
        criteria: (template.criteriaIds ?? []).map((criterionId: Id<"evaluationCriteria">) => {
          const criterion = criteriaMap.get(criterionId);
          if (!criterion) {
            return null;
          }
          return {
            _id: criterion._id,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            maxScore: criterion.maxScore,
            scale: criterion.scale,
            type: criterion.type,
            requireComments: Boolean(criterion.requireComments),
          };
        }).filter((criterion): criterion is NonNullable<typeof criterion> => criterion !== null),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    criteria: v.array(criterionValidator),
    sourceTemplateId: v.optional(v.id("rubricTemplates")),
  },
  handler: async (
    ctx: MutationCtx,
    {
      name,
      description,
      criteria,
      sourceTemplateId,
    }: { name: string; description?: string; criteria: CriterionInput[]; sourceTemplateId?: Id<"rubricTemplates"> }
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    ensureAdmin(profile.role);

    validateCriteria(criteria);
    const now = Date.now();
    const criterionIds = await createCriterionRecords(ctx, criteria, now);

    const templateId = await ctx.db.insert("rubricTemplates", {
      name: sanitizeText(name),
      description: sanitizeText(description ?? ""),
      criteriaIds: criterionIds,
      version: 1,
      createdBy: userId,
      sourceTemplateId,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      userId,
      action: "rubric.template_created",
      entityType: "rubric",
      entityId: templateId,
      details: {
        name: sanitizeText(name),
        criteriaCount: criteria.length,
      },
    });

    return templateId;
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("rubricTemplates"),
    name: v.string(),
    description: v.optional(v.string()),
    criteria: v.array(criterionValidator),
  },
  handler: async (
    ctx: MutationCtx,
    {
      templateId,
      name,
      description,
      criteria,
    }: { templateId: Id<"rubricTemplates">; name: string; description?: string; criteria: CriterionInput[] }
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    ensureAdmin(profile.role);

    const template = await ctx.db.get(templateId);
    if (!template) {
      throw new Error("Rubric template not found");
    }

    validateCriteria(criteria);
    const now = Date.now();
    const criterionIds = await createCriterionRecords(ctx, criteria, now);

    const nextVersion = (template.version ?? 1) + 1;

    await ctx.db.patch(templateId, {
      name: sanitizeText(name),
      description: sanitizeText(description ?? ""),
      criteriaIds,
      version: nextVersion,
      updatedAt: now,
    });

    await logActivity(ctx, {
      userId,
      action: "rubric.template_updated",
      entityType: "rubric",
      entityId: templateId,
      details: {
        name: sanitizeText(name),
        criteriaCount: criteria.length,
        version: nextVersion,
      },
    });
  },
});

export const duplicateTemplate = mutation({
  args: {
    templateId: v.id("rubricTemplates"),
    name: v.string(),
  },
  handler: async (
    ctx: MutationCtx,
    { templateId, name }: { templateId: Id<"rubricTemplates">; name: string }
  ) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    ensureAdmin(profile.role);

    const template = await ctx.db.get(templateId);
    if (!template) {
      throw new Error("Rubric template not found");
    }

    const criteriaRecords = await Promise.all(
      (template.criteriaIds ?? []).map((criterionId: Id<"evaluationCriteria">) => ctx.db.get(criterionId))
    );

    const sourceCriteria: CriterionInput[] = criteriaRecords
      .filter((record): record is NonNullable<typeof record> => record !== null)
      .map((record) => ({
        name: record.name,
        description: record.description,
        weight: record.weight,
        maxScore: record.maxScore,
        type: record.type,
        scale: record.scale,
        requireComments: Boolean(record.requireComments),
      }));

    if (sourceCriteria.length === 0) {
      throw new Error("Cannot duplicate an empty rubric template");
    }

    const now = Date.now();
    const criterionIds = await createCriterionRecords(ctx, sourceCriteria, now);

    const duplicateId = await ctx.db.insert("rubricTemplates", {
      name: sanitizeText(name),
      description: template.description ?? "",
      criteriaIds,
      version: 1,
      createdBy: userId,
      sourceTemplateId: templateId,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      userId,
      action: "rubric.template_duplicated",
      entityType: "rubric",
      entityId: duplicateId,
      details: {
        sourceTemplateId: templateId,
        criteriaCount: sourceCriteria.length,
      },
    });

    return duplicateId;
  },
});
