/**
 * Proposal-Call Fit Analysis AI Action
 *
 * Uses GPT-OSS-120b to analyze how well a proposal aligns with call requirements.
 * Provides actionable recommendations to improve fit before submission.
 *
 * Phase 1.5 - First AI Assistant Implementation
 */

import { action, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  OpenRouterClient,
  AI_MODELS,
  estimateCost,
} from "../lib/openrouter";

/**
 * Fit Analysis Result Schema
 */
export interface FitAnalysisResult {
  overallScore: number; // 0-100
  scores: {
    eligibility: number;
    budget: number;
    timeline: number;
    strategicFit: number;
  };
  recommendations: string[]; // Max 5 actionable recommendations
  redFlags: string[]; // Critical issues
  reasoning: string; // AI explanation
  generatedAt: number; // Timestamp
  model: string; // Model used
  tokensUsed: number; // For cost tracking
}

/**
 * Analyze proposal-call fit using AI
 */
export const analyzeProposalFit = action({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx: ActionCtx, args: { proposalId: Id<"proposals"> }): Promise<FitAnalysisResult> => {
    // 1. Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 2. Fetch proposal details (includes call, PI, and team members)
    const proposalDetail = await ctx.runQuery(api.proposals.getProposalDetail, {
      proposalId: args.proposalId,
    });

    if (!proposalDetail) {
      throw new Error("Proposal not found");
    }

    // 3. Check authorization (only PI, team members, and admins can run analysis)
    const userProfile = await ctx.runQuery(api.users.getCurrentUser);
    if (!userProfile) {
      throw new Error("User profile not found");
    }

    const userProfileId = userProfile._id;
    const userId = userProfile.userId; // users table ID for logging
    const isPI = proposalDetail.principalInvestigator?._id === userProfileId;
    const isTeamMember = proposalDetail.teamMembers?.some((member) => member._id === userProfileId);
    const isAdmin =
      userProfile.role === "sysadmin" ||
      userProfile.role === "admin";

    if (!isPI && !isTeamMember && !isAdmin) {
      throw new Error("Unauthorized: You cannot analyze this proposal");
    }

    // 4. Extract proposal and fetch full call details
    const proposal = proposalDetail.proposal;
    const callSummary = proposalDetail.call;

    if (!callSummary) {
      throw new Error("Call not found");
    }

    // Fetch complete call details (getProposalDetail only returns summary)
    const call = await ctx.runQuery(api.calls.getCallById, {
      callId: callSummary._id,
    });

    if (!call) {
      throw new Error("Call details not found");
    }

    // 5. Build AI prompt
    const systemPrompt = `You are an expert grant proposal analyzer specializing in educational innovation projects. Your task is to analyze how well a proposal aligns with specific call requirements and provide actionable recommendations.

You must be objective, specific, and constructive. Focus on alignment, feasibility, and strategic fit.

Return your analysis as a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "scores": {
    "eligibility": <number 0-100>,
    "budget": <number 0-100>,
    "timeline": <number 0-100>,
    "strategicFit": <number 0-100>
  },
  "recommendations": [<array of 3-5 specific, actionable recommendations>],
  "redFlags": [<array of critical issues, empty if none>],
  "reasoning": "<concise explanation of overall assessment>"
}`;

    const userPrompt = `Analyze this proposal against the call requirements:

CALL REQUIREMENTS:
- Title: ${call.title ?? "N/A"}
- Description: ${call.description ?? "N/A"}
- Objectives: ${call.objectives?.join(", ") ?? "N/A"}
- Project Type: ${call.projectType ?? "N/A"}
- Eligibility:
  ${call.eligibility?.campuses ? `  - Campuses: ${call.eligibility.campuses.join(", ")}` : ""}
  ${call.eligibility?.departments ? `  - Departments: ${call.eligibility.departments.join(", ")}` : ""}
  ${call.eligibility?.academicRanks ? `  - Academic Ranks: ${call.eligibility.academicRanks.join(", ")}` : ""}
- Budget Range: $${call.budget?.perProject?.min?.toLocaleString() ?? "0"} - $${call.budget?.perProject?.max?.toLocaleString() ?? "0"}
- Timeline: ${call.openDate ?? "N/A"} to ${call.closeDate ?? "N/A"}
- Duration: ${call.duration?.min ?? "N/A"}-${call.duration?.max ?? "N/A"} months

PROPOSAL SUBMITTED:
- Title: ${proposal.title ?? "N/A"}
- Keywords: ${proposal.keywords?.join(", ") ?? "N/A"}
- Abstract: ${proposal.abstract ?? "N/A"}
- Problem Statement: ${proposal.problemStatement ?? "N/A"}
- General Objective: ${proposal.generalObjective ?? "N/A"}
- Specific Objectives: ${proposal.specificObjectives?.join("; ") ?? "N/A"}
- Methodology: ${(proposal.methodology ?? "").substring(0, 500)}${(proposal.methodology ?? "").length > 500 ? "..." : ""}
- Budget Requested: $${proposal.budget?.total?.toLocaleString() ?? "0"}
- Timeline Milestones: ${proposal.timeline?.length ?? 0} milestones
- Impact: ${(proposal.impact?.expectedOutcomes ?? "").substring(0, 300)}${(proposal.impact?.expectedOutcomes ?? "").length > 300 ? "..." : ""}

Analyze alignment and provide specific, actionable recommendations. Be constructive but honest about mismatches.`;

    // 6. Call OpenRouter API
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY not configured. Please set it in Convex environment variables."
      );
    }

    const client = new OpenRouterClient({
      apiKey,
      maxRetries: 3,
      retryDelay: 1000,
    });

    const response = await client.chatCompletion({
      model: AI_MODELS.REASONING, // openai/gpt-oss-120b
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Analytical, not creative
      maxTokens: 4000,
    });

    // 7. Extract and parse response
    const content = client.extractContent(response);
    const tokenUsage = client.getTokenUsage(response);
    const cost = estimateCost(
      AI_MODELS.REASONING,
      tokenUsage.promptTokens,
      tokenUsage.completionTokens
    );

    // Parse JSON response
    let analysisResult: FitAnalysisResult;
    try {
      // Extract JSON from response (handle cases where AI adds explanation before/after JSON)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI response does not contain valid JSON");
      }
      const parsed = JSON.parse(jsonMatch[0]);

      analysisResult = {
        overallScore: parsed.overallScore,
        scores: parsed.scores,
        recommendations: parsed.recommendations.slice(0, 5), // Max 5
        redFlags: parsed.redFlags || [],
        reasoning: parsed.reasoning,
        generatedAt: Date.now(),
        model: AI_MODELS.REASONING,
        tokensUsed: tokenUsage.totalTokens,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", content);
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // 8. Save results to proposal
    await ctx.runMutation(internal.proposals.updateProposalFitScores, {
      proposalId: args.proposalId,
      fitScores: analysisResult,
    });

    // 9. Log AI usage to audit trail
    await ctx.runMutation(internal.ai.aiUtils.logAIUsage, {
      userId,
      assistantType: "proposal_fit_analysis",
      entityType: "proposal",
      entityId: args.proposalId,
      action: "analyze_fit",
      model: AI_MODELS.REASONING,
      promptTokens: tokenUsage.promptTokens,
      completionTokens: tokenUsage.completionTokens,
      totalTokens: tokenUsage.totalTokens,
      estimatedCost: cost,
    });

    return analysisResult;
  },
});
