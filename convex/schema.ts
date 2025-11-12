import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Kimia Platform Database Schema
 *
 * This schema defines all database tables for the innovation management platform.
 * Based on spec.md requirements for managing calls, proposals, evaluations, and projects.
 */

export default defineSchema({
  // Convex Auth tables (authentication) - includes base 'users' table
  ...authTables,

  // User invitations (admin-initiated provisioning)
  userInvitations: defineTable({
    email: v.string(),
    token: v.string(), // Secure UUID for invitation link
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
    message: v.optional(v.string()), // Optional welcome message from admin
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired")
    ),
    invitedBy: v.id("users"),
    expiresAt: v.number(), // 7 days from creation by default
    acceptedAt: v.optional(v.number()),
    createdAt: v.number()
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_inviter", ["invitedBy"]),

  // Extended user profiles (separate from auth users table)
  userProfiles: defineTable({
    userId: v.string(), // References Convex Auth user ID
    role: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("evaluator"),
      v.literal("faculty"),
      v.literal("finance"),
      v.literal("observer")
    ),
    status: v.optional(v.union(
      v.literal("invited"),    // Invited via admin, not yet registered
      v.literal("pending"),    // Self-registered, awaiting admin approval
      v.literal("active"),     // Fully active account
      v.literal("suspended"),  // Temporarily disabled
      v.literal("deactivated") // Permanently disabled
    )),
    campus: v.optional(v.string()),
    department: v.optional(v.string()),
    academicDegree: v.optional(v.string()),
    researchAreas: v.optional(v.array(v.string())),
    orcid: v.optional(v.string()),
    phone: v.optional(v.string()),
    cvStorageId: v.optional(v.id("_storage")), // Uploaded CV/Resume file
    cvFileName: v.optional(v.string()), // Original filename
    cvUploadedAt: v.optional(v.number()), // Upload timestamp
    bio: v.optional(v.string()), // Short biography
    publications: v.optional(v.array(v.string())), // List of key publications
    active: v.boolean(), // Backward compatibility with existing code
    notificationPreferences: v.optional(v.object({
      email: v.boolean(),
      platform: v.boolean(),
      digest: v.union(v.literal("none"), v.literal("daily"), v.literal("weekly"))
    })),
    suspensionReason: v.optional(v.string()),
    suspendedBy: v.optional(v.id("users")),
    suspendedAt: v.optional(v.number()),
    deactivationReason: v.optional(v.string()),
    deactivatedBy: v.optional(v.id("users")),
    deactivatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    lastLogin: v.optional(v.number())
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  // Calls for proposals
  calls: defineTable({
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.string(),
    objectives: v.array(v.string()),
    projectType: v.string(),
    targetAudience: v.array(v.string()),
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
    openDate: v.number(),
    closeDate: v.number(),
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
      perProject: v.object({
        min: v.number(),
        max: v.number(),
      }),
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
    evaluationSettings: v.object({
      rubricTemplateId: v.optional(v.id("rubricTemplates")),
      evaluatorsRequired: v.number(),
      blindReview: v.boolean(),
      assignmentMethod: v.union(
        v.literal("manual"),
        v.literal("auto_balanced"),
        v.literal("ai_matched")
      ),
      conflictPolicies: v.array(v.string()),
    }),
    requiredDocuments: v.optional(v.array(v.string())), // Backward compatibility
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("closed"),
      v.literal("archived")
    ),
    evaluationCriteria: v.array(v.id("evaluationCriteria")),
    guidelines: v.optional(v.id("_storage")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number()
  })
    .index("by_status", ["status"])
    .index("by_dates", ["openDate", "closeDate"])
    .index("by_slug", ["slug"]),

  // Evaluation criteria
  evaluationCriteria: defineTable({
    name: v.string(),
    description: v.string(),
    weight: v.number(), // Percentage
    maxScore: v.number(),
    scale: v.array(v.object({
      score: v.number(),
      descriptor: v.string()
    })),
    type: v.union(
      v.literal("innovation"),
      v.literal("feasibility"),
      v.literal("impact"),
      v.literal("methodology"),
      v.literal("budget"),
      v.literal("team"),
      v.literal("sustainability")
    ),
    requireComments: v.optional(v.boolean()),
    createdAt: v.number()
  }),

  rubricTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    criteriaIds: v.array(v.id("evaluationCriteria")),
    version: v.number(),
    createdBy: v.id("users"),
    sourceTemplateId: v.optional(v.id("rubricTemplates")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  })
    .index("by_name", ["name"])
    .index("by_creator", ["createdBy"]),

  // Proposals
  proposals: defineTable({
    callId: v.id("calls"),
    title: v.string(),
    keywords: v.array(v.string()),
    principalInvestigator: v.id("users"),
    teamMembers: v.array(v.id("users")),
    teamInvites: v.optional(v.array(v.string())),
    assignedEvaluators: v.optional(v.array(v.id("users"))),
    abstract: v.string(),
    problemStatement: v.string(),
    generalObjective: v.string(),
    specificObjectives: v.array(v.string()),
    objectives: v.array(v.string()),
    methodology: v.string(),
    researchDesign: v.optional(v.string()),
    dataCollection: v.optional(v.string()),
    analysisPlan: v.optional(v.string()),
    timeline: v.array(v.object({
      milestone: v.string(),
      deadline: v.string(),
      deliverables: v.array(v.string()),
      successCriteria: v.optional(v.string())
    })),
    budget: v.object({
      total: v.number(),
      narrative: v.optional(v.string()),
      breakdown: v.array(v.object({
        category: v.string(),
        description: v.string(),
        quantity: v.number(),
        unitCost: v.number(),
        amount: v.number(),
        justification: v.string()
      }))
    }),
  impact: v.object({
    expectedOutcomes: v.string(),
    beneficiaries: v.string(),
    indicators: v.string(),
    dissemination: v.string()
  }),
  status: v.union(
    v.literal("draft"),
    v.literal("submitted"),
    v.literal("under_review"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("in_execution"),
    v.literal("completed"),
    v.literal("revise_and_resubmit")
  ),
  attachments: v.optional(v.array(v.object({
    name: v.string(),
    type: v.string(),
    storageId: v.id("_storage")
  }))),
  documents: v.array(v.id("_storage")),
  decisionBy: v.optional(v.id("users")),
  decisionAt: v.optional(v.number()),
  decisionNote: v.optional(v.string()),
  submittedAt: v.optional(v.number()),

  // ========== EXECUTION TRACKING (only when status >= "approved") ==========

  // Project kickoff (RFP Item 5: "acta de inicio")
  kickoffDocument: v.optional(v.id("_storage")),
  kickoffDate: v.optional(v.number()),
  actualStartDate: v.optional(v.number()),
  actualEndDate: v.optional(v.number()),

  // Milestone execution tracking (maps 1:1 to timeline[] array)
  milestoneExecution: v.optional(v.array(v.object({
    milestoneIndex: v.number(), // Index in timeline[] array
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("delayed"),
      v.literal("blocked")
    ),
    // Timeline compliance
    plannedDeadline: v.number(),
    actualDeadline: v.optional(v.number()), // If extended
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    daysDelayed: v.optional(v.number()),
    delayReason: v.optional(v.string()),
    delayJustification: v.optional(v.id("_storage")),

    // Deliverable submissions
    deliverableSubmissions: v.array(v.object({
      deliverableName: v.string(),
      required: v.boolean(),
      status: v.union(
        v.literal("pending"),
        v.literal("submitted"),
        v.literal("under_review"),
        v.literal("approved"),
        v.literal("needs_revision")
      ),
      fileId: v.optional(v.id("_storage")),
      submittedAt: v.optional(v.number()),
      submittedBy: v.optional(v.id("users")),
      reviewedBy: v.optional(v.id("users")),
      reviewedAt: v.optional(v.number()),
      reviewComments: v.optional(v.string())
    })),

    // Budget snapshot for this milestone
    budgetSnapshot: v.optional(v.object({
      allocated: v.number(),
      disbursed: v.number(),
      spent: v.number(),
      pending: v.number()
    })),

    // Success criteria evaluation
    successEvaluation: v.optional(v.object({
      met: v.boolean(),
      evidence: v.optional(v.string()),
      evaluatedBy: v.optional(v.id("users")),
      evaluatedAt: v.optional(v.number())
    }))
  }))),

  // Overall budget execution (aggregates all transactions)
  budgetExecution: v.optional(v.object({
    committed: v.number(),
    disbursed: v.number(),
    spent: v.number(),
    available: v.number(),
    pendingApproval: v.number(),
    byCategory: v.array(v.object({
      category: v.string(),
      committed: v.number(),
      spent: v.number(),
      percentUtilized: v.number()
    })),
    variance: v.number(),
    variancePercent: v.number(),
    lastUpdated: v.number()
  })),

  // Compliance metrics (auto-calculated)
  executionMetrics: v.optional(v.object({
    overallProgress: v.number(), // 0-100%
    onTimeDeliveryRate: v.number(),
    budgetUtilizationRate: v.number(),
    overdueDeliverables: v.number(),
    pendingReports: v.array(v.string()),
    lastCalculated: v.number()
  })),

  // Active alerts (RFP Item 6: automatic notifications)
  activeAlerts: v.optional(v.array(v.object({
    type: v.union(
      v.literal("overdue_milestone"),
      v.literal("overdue_deliverable"),
      v.literal("budget_threshold"),
      v.literal("missing_report"),
      v.literal("deadline_approaching")
    ),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
    acknowledgedBy: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number())
  }))),

  // Quick access for dashboard
  nextMilestoneDue: v.optional(v.number()),
  nextDeliverableDue: v.optional(v.string()),

  // AI Assistance (Phase 1.5)
  proposalFitScores: v.optional(v.object({
    overallScore: v.number(), // 0-100
    scores: v.object({
      eligibility: v.number(),
      budget: v.number(),
      timeline: v.number(),
      strategicFit: v.number(),
    }),
    recommendations: v.array(v.string()), // Max 5 actionable recommendations
    redFlags: v.array(v.string()), // Critical issues
    reasoning: v.string(), // AI explanation
    generatedAt: v.number(), // Timestamp
    model: v.string(), // Model used (e.g., "openai/gpt-oss-120b")
    tokensUsed: v.number(), // For cost tracking
  })),

  createdAt: v.number(),
  updatedAt: v.number()
})
    .index("by_call", ["callId"])
    .index("by_pi", ["principalInvestigator"])
    .index("by_status", ["status"])
    .index("by_next_deadline", ["nextMilestoneDue"]),

  // Evaluations
  evaluations: defineTable({
    proposalId: v.id("proposals"),
    evaluatorId: v.id("users"),
    rubric: v.array(v.object({
      criteriaId: v.id("evaluationCriteria"),
      score: v.number(),
      maxScore: v.number(),
      comments: v.string(),
      strengths: v.array(v.string()),
      weaknesses: v.array(v.string())
    })),
    overallScore: v.number(),
    recommendation: v.union(
      v.literal("approve"),
      v.literal("approve_with_modifications"),
      v.literal("reject"),
      v.literal("revise_and_resubmit")
    ),
    budgetAdjustment: v.optional(v.object({
      recommended: v.number(),
      justification: v.string()
    })),
    confidentialComments: v.string(),
    publicComments: v.string(),
    completedAt: v.optional(v.number()),
    aiAssistanceUsed: v.boolean(),
    createdAt: v.number()
  })
    .index("by_proposal", ["proposalId"])
    .index("by_evaluator", ["evaluatorId"]),

  // Clarification requests (evaluator ↔ PI communication)
  clarificationRequests: defineTable({
    proposalId: v.id("proposals"),
    evaluationId: v.optional(v.id("evaluations")), // Optional: evaluator can request before completing evaluation
    evaluatorId: v.id("users"),

    // Request from evaluator
    requestText: v.string(),
    requestCategory: v.optional(v.union(
      v.literal("methodology"),
      v.literal("budget"),
      v.literal("timeline"),
      v.literal("team"),
      v.literal("impact"),
      v.literal("other")
    )),
    requestedAt: v.number(),

    // Response from PI
    responseText: v.optional(v.string()),
    responseAttachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      uploadedAt: v.number()
    }))),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.id("users")),

    // Status tracking
    status: v.union(
      v.literal("pending"),      // Waiting for PI response
      v.literal("responded"),    // PI has responded, evaluator needs to acknowledge
      v.literal("resolved"),     // Evaluator acknowledged and incorporated into evaluation
      v.literal("withdrawn")     // Evaluator withdrew request
    ),
    resolvedAt: v.optional(v.number()),

    // Notification tracking
    piNotifiedAt: v.optional(v.number()),
    evaluatorNotifiedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_proposal", ["proposalId", "status"])
    .index("by_evaluation", ["evaluationId"])
    .index("by_evaluator", ["evaluatorId", "status"])
    .index("by_status", ["status", "requestedAt"]),

  // Financial transactions
  transactions: defineTable({
    projectId: v.id("proposals"),
    type: v.union(v.literal("expense"), v.literal("disbursement")),
    category: v.string(), // Maps to budget.breakdown[].category
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    receipt: v.optional(v.id("_storage")),

    // Milestone and budget linking (RFP Item 5 requirement)
    milestoneIndex: v.optional(v.number()), // Which timeline[] milestone this supports
    budgetLineItem: v.optional(v.string()), // Which budget.breakdown[].category

    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    approvedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  })
    .index("by_project", ["projectId"])
    .index("by_milestone", ["projectId", "milestoneIndex"])
    .index("by_status", ["approvalStatus"])
    .index("by_category", ["projectId", "category"]),

  // Reports
  reports: defineTable({
    projectId: v.id("proposals"),
    type: v.union(
      v.literal("progress"),
      v.literal("financial"),
      v.literal("final")
    ),
    period: v.string(),
    content: v.string(), // Markdown format
    attachments: v.array(v.id("_storage")),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("requires_revision")
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewComments: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    createdAt: v.number()
  })
    .index("by_project", ["projectId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  // Activity log (audit trail)
  activities: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number()
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_read", ["userId", "read"]),

  // Proposal draft collaboration comments
  proposalComments: defineTable({
    proposalId: v.id("proposals"),
    sectionId: v.string(),
    authorId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("proposalComments")),
    resolved: v.boolean(),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_proposal", ["proposalId", "createdAt"])
    .index("by_section", ["proposalId", "sectionId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentCommentId"]),

  // Call FAQs for public detail page
  callFaqs: defineTable({
    callId: v.id("calls"),
    question: v.string(),
    answer: v.string(),
    order: v.number(),
    category: v.optional(v.string()),
    aiGenerated: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_call", ["callId", "order"])
    .index("by_category", ["callId", "category"]),

  // User bookmarks for calls
  bookmarks: defineTable({
    userId: v.id("users"),
    callId: v.id("calls"),
    createdAt: v.number()
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_call", ["callId"])
    .index("unique_bookmark", ["userId", "callId"]),

  // Evaluator assignment tracking
  evaluatorAssignments: defineTable({
    proposalId: v.id("proposals"),
    evaluatorId: v.id("users"),
    assignedBy: v.id("users"),
    assignmentMethod: v.union(
      v.literal("manual"),
      v.literal("auto_balanced"),
      v.literal("ai_matched")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("removed")
    ),
    declineReason: v.optional(v.string()),
    declineComment: v.optional(v.string()),
    coiDeclared: v.boolean(),
    coiDetails: v.optional(v.string()),
    assignedAt: v.number(),
    respondedAt: v.optional(v.number())
  })
    .index("by_proposal", ["proposalId"])
    .index("by_evaluator", ["evaluatorId", "status"])
    .index("by_status", ["status"]),

  // AI-powered evaluator matching scores (pre-computed for matrix)
  evaluatorMatches: defineTable({
    proposalId: v.id("proposals"),
    evaluatorId: v.id("users"),
    matchScore: v.number(), // 0-100 overall match percentage
    expertiseScore: v.number(), // 0-100 expertise alignment
    availabilityScore: v.number(), // 0-100 availability/capacity
    performanceScore: v.number(), // 0-100 historical performance
    conflictFlags: v.array(v.string()), // e.g., ["same_department", "co_author"]
    conflictSeverity: v.union(
      v.literal("none"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("blocking")
    ),
    reasoning: v.string(), // AI-generated explanation
    generatedAt: v.number(),
    generatedBy: v.union(v.literal("ai"), v.literal("algorithm")),
    stale: v.boolean() // true if needs recalculation
  })
    .index("by_proposal", ["proposalId", "matchScore"])
    .index("by_evaluator", ["evaluatorId"])
    .index("by_stale", ["stale"]),

  // Deadline extension requests
  extensionRequests: defineTable({
    callId: v.id("calls"),
    proposalId: v.optional(v.id("proposals")),
    requestedBy: v.id("users"),
    reason: v.string(),
    description: v.string(),
    evidence: v.optional(v.array(v.id("_storage"))),
    requestedExtension: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewComment: v.optional(v.string()),
    newDeadline: v.optional(v.number()),
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number())
  })
    .index("by_call", ["callId"])
    .index("by_requester", ["requestedBy"])
    .index("by_status", ["status"]),

  // AI Assistance Log (Phase 1.5+)
  aiAssistanceLog: defineTable({
    userId: v.id("users"),
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
    entityId: v.string(), // ID of the entity (proposal ID, evaluation ID, etc.)
    action: v.string(), // Specific action taken (e.g., "analyze_fit", "improve_text")
    model: v.string(), // AI model used (e.g., "openai/gpt-oss-120b")
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimatedCost: v.number(), // Cost in USD
    responseAccepted: v.optional(v.boolean()), // Did user accept AI suggestion?
    userModified: v.optional(v.boolean()), // Did user modify AI output?
    feedbackRating: v.optional(v.number()), // User rating 1-5
    feedbackComment: v.optional(v.string()), // User feedback on AI output
    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_assistant", ["assistantType"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_date", ["createdAt"])
});
