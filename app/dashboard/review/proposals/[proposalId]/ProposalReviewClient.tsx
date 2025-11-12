"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useStableQuery } from "@/lib/hooks/useStableQuery";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Gauge,
  Users,
  CircleCheck,
  CheckCircle,
  ClipboardCheck,
  UserPlus,
  UserMinus,
  Loader2,
  FileCheck,
  Send,
  Save,
  Clock,
  Gavel,
  XCircle,
  RotateCcw,
  Paperclip,
  Download,
} from "lucide-react";

const TABS = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "narrative", label: "Narrative", icon: ClipboardList },
  { id: "impact", label: "Impact", icon: Gauge },
  { id: "team", label: "Team", icon: Users },
  { id: "evaluation", label: "Evaluation", icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ProposalReviewClientProps = {
  proposalId: Id<"proposals">;
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const AUTOSAVE_DELAY_MS = 5000;

const RECOMMENDATION_OPTIONS = [
  { value: "approve", label: "Approve" },
  { value: "approve_with_modifications", label: "Approve with modifications" },
  { value: "reject", label: "Reject" },
  { value: "revise_and_resubmit", label: "Revise and resubmit" },
] as const;

const FINAL_DECISION_STATUSES = new Set([
  "approved",
  "rejected",
  "revise_and_resubmit",
]);

export default function ProposalReviewClient({ proposalId }: ProposalReviewClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const detail = useStableQuery(api.proposals.getProposalDetail, { proposalId });
  const evaluationContext = useStableQuery(
    api.evaluations.getEvaluationContext,
    detail ? { proposalId } : "skip"
  );
  const setAssignedEvaluators = useMutation(api.proposals.setAssignedEvaluators);
  const saveEvaluationDraft = useMutation(api.evaluations.saveEvaluationDraft);
  const submitEvaluation = useMutation(api.evaluations.submitEvaluation);
  const finalizeDecision = useMutation(api.proposals.finalizeProposalDecision);
  const evaluationInitializedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type RubricEntryState = {
    criteriaId: Id<"evaluationCriteria">;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
    score: number | "";
    comments: string;
    strengths: string;
    weaknesses: string;
  };

  const [rubricEntries, setRubricEntries] = useState<RubricEntryState[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [publicComments, setPublicComments] = useState("");
  const [confidentialComments, setConfidentialComments] = useState("");
  const [aiAssistanceUsed, setAiAssistanceUsed] = useState(false);
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionSuccess, setDecisionSuccess] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  const trimmedAssignmentSearch = assignmentSearch.trim();
  const evaluatorSearchResults = useQuery(
    api.users.searchUsers,
    trimmedAssignmentSearch.length >= 2
      ? { query: trimmedAssignmentSearch, limit: 6 }
      : "skip"
  );

  // All hooks must be called before any conditional returns
  const assignedEvaluatorIds = useMemo(
    () => (detail?.assignedEvaluators || []).map((evaluator: any) => evaluator._id),
    [detail?.assignedEvaluators]
  );
  const filteredEvaluatorResults = useMemo(
    () =>
      (Array.isArray(evaluatorSearchResults) ? evaluatorSearchResults : []).filter(
        (candidate: any) =>
          candidate.role === "evaluator" && !assignedEvaluatorIds.includes(candidate._id)
      ),
    [evaluatorSearchResults, assignedEvaluatorIds]
  );
  const formattedKeywords = useMemo(() => {
    if (!detail?.proposal?.keywords) {
      return "No keywords provided";
    }
    return detail.proposal.keywords.length > 0
      ? detail.proposal.keywords.join(" • ")
      : "No keywords provided";
  }, [detail?.proposal?.keywords]);

  useEffect(() => {
    if (detail?.decision?.note !== undefined) {
      setDecisionNote(detail.decision.note ?? "");
    } else {
      setDecisionNote("");
    }
  }, [detail?.decision?.note]);

  useEffect(() => {
    setDecisionSuccess("");
    setDecisionError("");
  }, [detail?.proposal?.status]);

  const computeWeightedScore = useCallback(
    (entries: RubricEntryState[]) => {
      if (!evaluationContext || evaluationContext === "skip" || !evaluationContext?.criteria) {
        return 0;
      }

      const criteriaMap = new Map(
        evaluationContext.criteria.map((criterion: any) => [criterion._id, criterion])
      );

      let weightedTotal = 0;
      let weightSum = 0;

      for (const entry of entries) {
        const criterion = criteriaMap.get(entry.criteriaId) as { weight: number } | undefined;
        if (!criterion) {
          continue;
        }

        const weight = criterion.weight;
        const maxScore = entry.maxScore;
        const score =
          typeof entry.score === "number" && Number.isFinite(entry.score) ? entry.score : 0;

        if (maxScore <= 0 || !Number.isFinite(weight)) {
          continue;
        }

        const normalized = Math.max(Math.min(score, maxScore), 0) / maxScore;
        weightedTotal += normalized * weight;
        weightSum += weight;
      }

      if (weightSum <= 0) {
        const rawTotal = entries.reduce((sum, entry) => {
          const score =
            typeof entry.score === "number" && Number.isFinite(entry.score)
              ? entry.score
              : 0;
          return sum + score;
        }, 0);
        const rawMax = entries.reduce((sum, entry) => sum + entry.maxScore, 0);
        if (rawMax <= 0) {
          return 0;
        }
        return Number(((rawTotal / rawMax) * 100).toFixed(2));
      }

      return Number(((weightedTotal / weightSum) * 100).toFixed(2));
    },
    [evaluationContext]
  );

  const weightedScore = useMemo(() => computeWeightedScore(rubricEntries), [
    computeWeightedScore,
    rubricEntries,
  ]);

  const recommendationLabel = useMemo(() => {
    if (!recommendation) {
      return "Not set";
    }
    return (
      RECOMMENDATION_OPTIONS.find((option) => option.value === recommendation)?.label ??
      "Not set"
    );
  }, [recommendation]);

  const markDirty = useCallback(() => {
    setIsDraftDirty(true);
    setLastChangedAt(Date.now());
    setSaveError("");
  }, []);

  const handleAssignEvaluator = useCallback(
    async (evaluator: any) => {
      setAssignmentError("");
      setAssignmentSuccess("");
      setAssignmentLoading(true);
      try {
        const nextIds = Array.from(new Set([...assignedEvaluatorIds, evaluator._id]));
        await setAssignedEvaluators({ proposalId, evaluatorIds: nextIds });
        setAssignmentSuccess("Evaluator assigned successfully.");
        setAssignmentSearch("");
      } catch (error) {
        setAssignmentError(
          error instanceof Error ? error.message : "Failed to update evaluators."
        );
      } finally {
        setAssignmentLoading(false);
      }
    },
    [assignedEvaluatorIds, proposalId, setAssignedEvaluators]
  );

  const handleRemoveEvaluator = useCallback(
    async (evaluatorId: string) => {
      setAssignmentError("");
      setAssignmentSuccess("");
      setAssignmentLoading(true);
      try {
        const nextIds = assignedEvaluatorIds.filter((id: string) => id !== evaluatorId);
        await setAssignedEvaluators({ proposalId, evaluatorIds: nextIds });
        setAssignmentSuccess("Evaluator removed.");
      } catch (error) {
        setAssignmentError(
          error instanceof Error ? error.message : "Failed to update evaluators."
        );
      } finally {
        setAssignmentLoading(false);
      }
    },
    [assignedEvaluatorIds, proposalId, setAssignedEvaluators]
  );

  useEffect(() => {
    if (!evaluationContext || evaluationContext === "skip") {
      return;
    }

    if (evaluationInitializedRef.current) {
      return;
    }

    const criteria = evaluationContext.criteria ?? [];
    const rubric = evaluationContext.evaluation?.rubric ?? [];
    const rubricById = new Map(
      rubric.map((entry: any) => [entry.criteriaId, entry] as const)
    );

    const mappedEntries: RubricEntryState[] = criteria.map((criterion: any) => {
      const stored = rubricById.get(criterion._id) as { score?: number; comments?: string; strengths?: string[]; weaknesses?: string[] } | undefined;
      const score =
        stored && typeof stored.score === "number" && Number.isFinite(stored.score)
          ? stored.score
          : "";
      return {
        criteriaId: criterion._id,
        name: criterion.name,
        description: criterion.description,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
        score,
        comments: stored?.comments ?? "",
        strengths: (stored?.strengths ?? []).join("\n"),
        weaknesses: (stored?.weaknesses ?? []).join("\n"),
      };
    });

    setRubricEntries(mappedEntries);
    setRecommendation(evaluationContext.evaluation?.recommendation ?? "");
    setPublicComments(evaluationContext.evaluation?.publicComments ?? "");
    setConfidentialComments(evaluationContext.evaluation?.confidentialComments ?? "");
    setAiAssistanceUsed(Boolean(evaluationContext.evaluation?.aiAssistanceUsed));
    setSubmittedAt(evaluationContext.evaluation?.completedAt ?? null);
    evaluationInitializedRef.current = true;
  }, [evaluationContext]);

  useEffect(() => {
    if (!isDraftDirty || lastChangedAt === null) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void (async () => {
        if (!isDraftDirty || submittedAt) {
          return;
        }
        try {
          setIsSavingDraft(true);
          setSaveMessage("Saving draft…");
          await saveEvaluationDraft({
            proposalId,
            rubric: rubricEntries.map((entry) => ({
              criteriaId: entry.criteriaId,
              score:
                entry.score === "" || !Number.isFinite(Number(entry.score))
                  ? null
                  : Number(entry.score),
              comments: entry.comments,
              strengths: entry.strengths.split("\n").map((item) => item.trim()).filter(Boolean),
              weaknesses: entry.weaknesses.split("\n").map((item) => item.trim()).filter(Boolean),
            })),
            recommendation: recommendation ? (recommendation as any) : undefined,
            confidentialComments,
            publicComments,
            aiAssistanceUsed,
          });
          setIsDraftDirty(false);
          setSaveMessage("Draft saved.");
          setSaveError("");
        } catch (error) {
          setSaveError(
            error instanceof Error ? error.message : "Failed to save evaluation draft."
          );
        } finally {
          setIsSavingDraft(false);
        }
      })();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    aiAssistanceUsed,
    confidentialComments,
    isDraftDirty,
    lastChangedAt,
    proposalId,
    publicComments,
    recommendation,
    rubricEntries,
    saveEvaluationDraft,
    submittedAt,
  ]);

  const handleManualSaveDraft = useCallback(async () => {
    if (submittedAt) {
      return;
    }
    try {
      setIsSavingDraft(true);
      setSaveMessage("Saving draft…");
      await saveEvaluationDraft({
        proposalId,
        rubric: rubricEntries.map((entry) => ({
          criteriaId: entry.criteriaId,
          score:
            entry.score === "" || !Number.isFinite(Number(entry.score))
              ? null
              : Number(entry.score),
          comments: entry.comments,
          strengths: entry.strengths.split("\n").map((item) => item.trim()).filter(Boolean),
          weaknesses: entry.weaknesses.split("\n").map((item) => item.trim()).filter(Boolean),
        })),
        recommendation: recommendation ? (recommendation as any) : undefined,
        confidentialComments,
        publicComments,
        aiAssistanceUsed,
      });
      setIsDraftDirty(false);
      setSaveMessage("Draft saved.");
      setSaveError("");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save evaluation draft."
      );
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    aiAssistanceUsed,
    confidentialComments,
    proposalId,
    publicComments,
    recommendation,
    rubricEntries,
    saveEvaluationDraft,
    submittedAt,
  ]);

  const handleSubmitEvaluation = useCallback(async () => {
    setSubmitError("");
    if (submittedAt) {
      return;
    }

    if (
      !evaluationContext ||
      evaluationContext === "skip" ||
      !evaluationContext.criteria ||
      evaluationContext.criteria.length === 0
    ) {
      setSubmitError("This call does not have an evaluation rubric yet.");
      return;
    }

    const missingScores = rubricEntries.filter(
      (entry) => entry.score === "" || !Number.isFinite(Number(entry.score))
    );
    if (missingScores.length > 0) {
      setSubmitError("Please score every criterion before submitting.");
      return;
    }

    if (!recommendation) {
      setSubmitError("Select an overall recommendation before submitting.");
      return;
    }

    setSubmitLoading(true);
    try {
      await submitEvaluation({
        proposalId,
        rubric: rubricEntries.map((entry) => ({
          criteriaId: entry.criteriaId,
          score: Number(entry.score),
          comments: entry.comments,
          strengths: entry.strengths.split("\n").map((item) => item.trim()).filter(Boolean),
          weaknesses: entry.weaknesses.split("\n").map((item) => item.trim()).filter(Boolean),
        })),
        recommendation: recommendation as any,
        confidentialComments,
        publicComments,
        aiAssistanceUsed,
      });
      setIsDraftDirty(false);
      setSaveMessage("Evaluation submitted.");
      setSubmittedAt(Date.now());
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit evaluation."
      );
    } finally {
      setSubmitLoading(false);
    }
  }, [
    aiAssistanceUsed,
    confidentialComments,
    evaluationContext,
    proposalId,
    publicComments,
    recommendation,
    rubricEntries,
    submitEvaluation,
    submittedAt,
  ]);

  const handleFinalizeDecision = useCallback(
    async (nextStatus: "approved" | "rejected" | "revise_and_resubmit") => {
      const friendlyStatus = formatStatusLabel(nextStatus);
      if (typeof window !== "undefined") {
        const confirmMessage = `Mark this proposal as "${friendlyStatus}"?`;
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      setDecisionLoading(true);
      setDecisionError("");
      setDecisionSuccess("");
      try {
        await finalizeDecision({
          proposalId,
          decision: nextStatus,
          note: decisionNote,
        });
        setDecisionSuccess(`Decision recorded as ${friendlyStatus}.`);
      } catch (error) {
        setDecisionError(
          error instanceof Error ? error.message : "Failed to finalize decision."
        );
      } finally {
        setDecisionLoading(false);
      }
    },
    [decisionNote, finalizeDecision, proposalId]
  );

  const isSubmitted = submittedAt !== null;

  // Now handle conditional returns after all hooks
  if (detail === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white rounded-2xl shadow animate-pulse" />
        <div className="h-96 bg-white rounded-2xl shadow animate-pulse" />
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-red-800">
        <h1 className="text-2xl font-semibold">Proposal not found</h1>
        <p className="mt-2">
          The requested proposal could not be located. It may have been removed or you may not have access.
        </p>
        <Link
          href="/dashboard/review/proposals"
          className="inline-flex items-center gap-2 mt-6 text-red-700 hover:text-red-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to reviews
        </Link>
      </div>
    );
  }

  const {
    proposal,
    call,
    principalInvestigator,
    teamMembers,
    assignedEvaluators = [],
    permissions,
    evaluationSummary: detailEvaluationSummary,
    decision,
    attachments = [],
  } = detail;
  const evaluationSummary = detailEvaluationSummary ?? null;
  const decisionMetadata = decision ?? null;
  const canMakeDecision = Boolean(permissions?.canMakeDecision);
  const isDecisionFinal = FINAL_DECISION_STATUSES.has(proposal.status);
  const meetsDecisionThreshold =
    evaluationSummary && evaluationSummary.requiredEvaluations > 0
      ? evaluationSummary.submittedCount >= evaluationSummary.requiredEvaluations
      : true;
  const pendingEvaluatorsList = evaluationSummary?.pendingEvaluators ?? [];

  const renderSummary = () => (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 p-6 bg-white space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            {proposal.status.replace(/_/g, " ")}
          </p>
          <div className="mt-2 text-sm text-gray-600">
            {proposal.submittedAt && (
              <p>Submitted {DATE_FORMAT.format(proposal.submittedAt)}</p>
            )}
            <p>Last updated {DATE_FORMAT.format(proposal.updatedAt)}</p>
          </div>
        </div>
        {call && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Call</h2>
            <p className="text-sm text-gray-600 mt-1">{call.title}</p>
            <p className="text-sm text-gray-500">
              Project type: {call.projectType} • Deadline {DATE_FORMAT.format(call.closeDate)}
            </p>
            <Link
              href={`/calls/${call.slug ?? ""}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2"
            >
              View call details
            </Link>
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Budget Summary</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total requested:{" "}
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: "USD",
            }).format(proposal.budget.total)}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-gray-600 mt-1">No supporting documents uploaded.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {attachments.map((attachment: any) => (
                <li
                  key={attachment.storageId}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    <span>{attachment.name}</span>
                    {attachment.category === "required" && attachment.requirementId ? (
                      <span className="text-xs text-gray-500">
                        ({attachment.requirementId})
                      </span>
                    ) : null}
                  </div>
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 p-6 bg-white space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Objectives</h2>
        <p className="text-sm text-gray-700">
          <span className="font-medium">General objective:</span> {proposal.generalObjective}
        </p>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Specific objectives</p>
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            {proposal.specificObjectives.map((objective: string, index: number) => (
              <li key={`objective-${index}`}>{objective}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  const renderNarrative = () => (
    <section className="space-y-6">
      <ArticleCard title="Abstract" content={proposal.abstract} />
      <ArticleCard title="Problem Statement" content={proposal.problemStatement} />
      <ArticleCard title="Methodology" content={proposal.methodology} />
      {proposal.analysisPlan && (
        <ArticleCard title="Analysis Plan" content={proposal.analysisPlan} />
      )}
      {proposal.researchDesign && (
        <ArticleCard title="Research Design" content={proposal.researchDesign} />
      )}
      {proposal.dataCollection && (
        <ArticleCard title="Data Collection" content={proposal.dataCollection} />
      )}
    </section>
  );

  const renderImpact = () => (
    <section className="space-y-6">
      <ArticleCard title="Expected Outcomes" content={proposal.impact.expectedOutcomes} />
      <ArticleCard title="Target Beneficiaries" content={proposal.impact.beneficiaries} />
      <ArticleCard title="Measurement Indicators" content={proposal.impact.indicators} />
      <ArticleCard title="Dissemination Plan" content={proposal.impact.dissemination} />
      <div className="rounded-2xl border border-gray-200 p-6 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
        <div className="space-y-3">
          {proposal.timeline.map((milestone: any, index: number) => (
            <div key={`milestone-${index}`} className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900">{milestone.milestone}</p>
              <p className="text-sm text-gray-600">
                Target date: {milestone.deadline}
              </p>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {milestone.deliverables.map((deliverable: string, deliverableIndex: number) => (
                  <li key={`deliverable-${index}-${deliverableIndex}`}>
                    {deliverable}
                  </li>
                ))}
              </ul>
              {milestone.successCriteria && (
                <p className="text-sm text-gray-600 mt-2">
                  Success criteria: {milestone.successCriteria}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderTeam = () => (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 p-6 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Principal Investigator</h2>
        {principalInvestigator ? (
          <div className="mt-3 space-y-1 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{principalInvestigator.name}</p>
            <p>{principalInvestigator.email}</p>
            <p className="text-gray-500 capitalize">{principalInvestigator.role.replace(/_/g, " ")}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mt-2">Information unavailable.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 p-6 bg-white space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-gray-600">No additional team members listed.</p>
        ) : (
          <ul className="space-y-3">
            {teamMembers.map((member: any) => (
              <li key={member._id} className="flex items-start gap-3">
                <CircleCheck className="w-4 h-4 text-indigo-500 mt-1" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p>{member.email}</p>
                  <p className="text-gray-500 capitalize">{member.role.replace(/_/g, " ")}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {detail.teamInvites && detail.teamInvites.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-sm font-semibold text-gray-700">Pending invitations</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {detail.teamInvites.map((invite: string) => (
                <li key={invite}>{invite}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );

  const renderEvaluation = () => (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assigned Evaluators</h2>
            <p className="text-sm text-gray-600">
              Assign evaluators responsible for reviewing this proposal. Evaluators will receive notifications in a later milestone.
            </p>
          </div>
          <span className="text-sm text-gray-500">
            {assignedEvaluators.length} assigned
          </span>
        </div>

        {permissions?.canAssignEvaluators ? (
          <>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="search"
                value={assignmentSearch}
                onChange={(event) => setAssignmentSearch(event.target.value)}
                placeholder="Search evaluators by name or email"
                className="w-full md:w-80 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">
                Evaluator accounts only. Enter at least 2 characters.
              </p>
            </div>

            {trimmedAssignmentSearch.length >= 2 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                {filteredEvaluatorResults.length === 0 ? (
                  <p className="text-sm text-gray-600">No evaluators found.</p>
                ) : (
                  filteredEvaluatorResults.map((result: any) => (
                    <div
                      key={result._id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{result.name}</p>
                        <p className="text-xs text-gray-600">{result.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAssignEvaluator(result)}
                        disabled={assignmentLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60"
                      >
                        {assignmentLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600">
            You do not have permission to modify evaluator assignments.
          </p>
        )}

        <div className="space-y-2">
          {assignedEvaluators.length === 0 ? (
            <p className="text-sm text-gray-600">No evaluators assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {assignedEvaluators.map((evaluator: any) => (
                <li
                  key={evaluator._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{evaluator.name}</p>
                    <p className="text-xs text-gray-600">{evaluator.email}</p>
                  </div>
                  {permissions?.canAssignEvaluators && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveEvaluator(evaluator._id)}
                      disabled={assignmentLoading}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {permissions?.canAssignEvaluators && (assignmentError || assignmentSuccess) && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${assignmentError ? "border border-red-200 bg-red-50 text-red-700" : "border border-green-200 bg-green-50 text-green-700"}`}
          >
            {assignmentError || assignmentSuccess}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Evaluation Rubric</h2>
            <p className="text-sm text-gray-600">
              Score each criterion and capture feedback. Drafts save automatically after edits.
            </p>
          </div>
          <div className="text-sm">
            {isSubmitted ? (
              <span className="text-green-600">
                Submitted {submittedAt ? DATE_FORMAT.format(submittedAt) : ""}
              </span>
            ) : isSavingDraft ? (
              <span className="inline-flex items-center gap-2 text-indigo-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving draft…
              </span>
            ) : saveError ? (
              <span className="text-red-600">{saveError}</span>
            ) : (
              saveMessage && <span className="text-gray-500">{saveMessage}</span>
            )}
          </div>
        </div>

        {evaluationContext === undefined || evaluationContext === "skip" ? (
          <div className="px-6 py-8 space-y-4">
            <div className="h-6 w-48 bg-gray-100 animate-pulse rounded" />
            <div className="h-32 bg-gray-100 animate-pulse rounded" />
            <div className="h-32 bg-gray-100 animate-pulse rounded" />
          </div>
        ) : evaluationContext === null ? (
          <div className="px-6 py-8 text-sm text-gray-600">
            Rubric configuration is not yet available for this call.
          </div>
        ) : rubricEntries.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-600">
            No rubric criteria have been configured for this call.
          </div>
        ) : (
          <>
            <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-white border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Overall score</p>
                  <p className="text-2xl font-semibold text-indigo-600">
                    {weightedScore.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Criteria</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {evaluationContext.criteria?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Recommendation</p>
                  <p className="text-lg font-semibold text-gray-900">{recommendationLabel}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              {rubricEntries.map((entry) => (
                <div
                  key={entry.criteriaId}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{entry.name}</h3>
                      <p className="text-sm text-gray-600">{entry.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        Weight: <span className="font-semibold">{entry.weight}%</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Max score: <span className="font-semibold">{entry.maxScore}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Score
                        <input
                          type="number"
                          min={0}
                          max={entry.maxScore}
                          step={0.5}
                          value={entry.score === "" ? "" : entry.score}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRubricEntries((current) =>
                              current.map((item) =>
                                item.criteriaId === entry.criteriaId
                                  ? {
                                      ...item,
                                      score:
                                        value === ""
                                          ? ""
                                          : Math.min(entry.maxScore, Number(value)),
                                    }
                                  : item
                              )
                            );
                            markDirty();
                          }}
                          disabled={isSubmitted}
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        />
                      </label>
                      <label className="text-sm font-medium text-gray-700">
                        Strengths (one per line)
                        <textarea
                          value={entry.strengths}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRubricEntries((current) =>
                              current.map((item) =>
                                item.criteriaId === entry.criteriaId
                                  ? { ...item, strengths: value }
                                  : item
                              )
                            );
                            markDirty();
                          }}
                          disabled={isSubmitted}
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                          rows={4}
                        />
                      </label>
                      <label className="text-sm font-medium text-gray-700">
                        Weaknesses (one per line)
                        <textarea
                          value={entry.weaknesses}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRubricEntries((current) =>
                              current.map((item) =>
                                item.criteriaId === entry.criteriaId
                                  ? { ...item, weaknesses: value }
                                  : item
                              )
                            );
                            markDirty();
                          }}
                          disabled={isSubmitted}
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                          rows={4}
                        />
                      </label>
                    </div>
                    <label className="text-sm font-medium text-gray-700">
                      Criterion comments
                      <textarea
                        value={entry.comments}
                        onChange={(event) => {
                          const value = event.target.value;
                          setRubricEntries((current) =>
                            current.map((item) =>
                              item.criteriaId === entry.criteriaId
                                ? { ...item, comments: value }
                                : item
                            )
                          );
                          markDirty();
                        }}
                        disabled={isSubmitted}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        rows={8}
                      />
                    </label>
                  </div>
                </div>
              ))}

              <div className="grid gap-6 md:grid-cols-2">
                <label className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700 space-y-3">
                  <span className="text-base font-semibold text-gray-900">
                    Overall recommendation
                  </span>
                  <select
                    value={recommendation}
                    onChange={(event) => {
                      setRecommendation(event.target.value);
                      markDirty();
                    }}
                    disabled={isSubmitted}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="">Select recommendation</option>
                    {RECOMMENDATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    Shared with admins to support decision meetings.
                  </p>
                </label>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">
                      AI assistance used?
                    </span>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={aiAssistanceUsed}
                        onChange={(event) => {
                          setAiAssistanceUsed(event.target.checked);
                          markDirty();
                        }}
                        disabled={isSubmitted}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:bg-gray-100"
                      />
                      <span className="text-sm text-gray-600">Mark if AI assisted this review</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Tracks AI usage for audit logs and cost monitoring.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700 space-y-3">
                  <span className="text-base font-semibold text-gray-900">
                    Public comments (shared with applicants)
                  </span>
                  <textarea
                    value={publicComments}
                    onChange={(event) => {
                      setPublicComments(event.target.value);
                      markDirty();
                    }}
                    disabled={isSubmitted}
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500">
                    Focus on constructive, actionable guidance. Applicants will see this verbatim.
                  </p>
                </label>

                <label className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700 space-y-3">
                  <span className="text-base font-semibold text-gray-900">
                    Confidential notes (admins only)
                  </span>
                  <textarea
                    value={confidentialComments}
                    onChange={(event) => {
                      setConfidentialComments(event.target.value);
                      markDirty();
                    }}
                    disabled={isSubmitted}
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500">
                    Only visible to DOCENTIA administrators. Capture sensitive risks or follow-up needs.
                  </p>
                </label>
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleManualSaveDraft()}
                    disabled={isSubmitted || isSavingDraft}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingDraft ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmitEvaluation()}
                    disabled={isSubmitted || submitLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit evaluation
                  </button>
                </div>
                {isSubmitted && (
                  <p className="text-sm font-medium text-green-600">
                    Evaluation submitted. Contact DOCENTIA to reopen if changes are needed.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {canMakeDecision && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Decision Panel</h2>
              <p className="text-sm text-gray-600">
                Review evaluator outcomes and finalize the proposal status.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                isDecisionFinal ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-700"
              }`}
            >
              <Gavel className="w-3 h-3" />
              {formatStatusLabel(proposal.status)}
            </span>
          </div>

          {decisionMetadata?.at && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Decision recorded {DATE_FORMAT.format(decisionMetadata.at)} by{" "}
              {decisionMetadata.by?.name ?? "Admin"}
            </div>
          )}

          {decisionSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {decisionSuccess}
            </div>
          )}

          {decisionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {decisionError}
            </div>
          )}

          {!meetsDecisionThreshold &&
            evaluationSummary &&
            evaluationSummary.requiredEvaluations > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Need {evaluationSummary.requiredEvaluations} submitted evaluations before
                approving or rejecting. Currently {evaluationSummary.submittedCount} submitted.
              </div>
            )}

          {evaluationSummary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DecisionStatCard
                  label="Assigned evaluators"
                  value={evaluationSummary.assignedCount}
                  description={`${evaluationSummary.inProgressCount} in progress`}
                />
                <DecisionStatCard
                  label="Completed reviews"
                  value={
                    evaluationSummary.requiredEvaluations > 0
                      ? `${evaluationSummary.submittedCount}/${evaluationSummary.requiredEvaluations}`
                      : evaluationSummary.submittedCount
                  }
                  description="Submitted evaluations"
                />
                <DecisionStatCard
                  label="Pending reviews"
                  value={evaluationSummary.pendingCount}
                  description={`${pendingEvaluatorsList.length} awaiting submission`}
                />
                <DecisionStatCard
                  label="Average score"
                  value={
                    evaluationSummary.averageScore !== null
                      ? `${evaluationSummary.averageScore.toFixed(1)}`
                      : "--"
                  }
                  description="Weighted overall"
                />
              </div>

              {evaluationSummary.criterionAverages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">Criterion averages</h3>
                  <div className="flex flex-wrap gap-2">
                    {evaluationSummary.criterionAverages.map((criterion: any) => (
                      <span
                        key={`criterion-${criterion.criteriaId}`}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600"
                      >
                        {criterion.name}: {criterion.averageScore.toFixed(2)} / {criterion.maxScore}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {evaluationSummary.evaluations.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No evaluations submitted yet. Assigned reviewers will appear here once they
                    begin scoring.
                  </p>
                ) : (
                  evaluationSummary.evaluations.map((evaluation: any) => (
                    <div
                      key={`evaluation-${evaluation._id}`}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {evaluation.evaluator?.name ?? "Unknown evaluator"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {evaluation.status === "submitted"
                              ? `Submitted ${
                                  evaluation.completedAt
                                    ? DATE_FORMAT.format(evaluation.completedAt)
                                    : ""
                                }`
                              : "In progress"}
                          </p>
                          {evaluation.publicComments && (
                            <p className="mt-2 text-sm text-gray-700">
                              <span className="font-medium text-gray-900">Public note:</span>{" "}
                              {evaluation.publicComments}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {evaluation.status === "submitted" ? (
                            <>
                              <p className="text-2xl font-semibold text-indigo-600">
                                {Number(evaluation.overallScore).toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatStatusLabel(evaluation.recommendation)}
                              </p>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                              <Clock className="w-3 h-3" />
                              In progress
                            </span>
                          )}
                        </div>
                      </div>
                      {evaluation.confidentialComments && (
                        <p className="mt-3 text-xs text-gray-500">
                          <span className="font-semibold text-gray-700">Confidential note:</span>{" "}
                          {evaluation.confidentialComments}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {pendingEvaluatorsList.length > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                  Pending reviewers:{" "}
                  {pendingEvaluatorsList.map((person: any) => person.name).join(", ")}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Evaluations will appear here once reviewers start scoring.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="decision-note">
              Decision note (admins only)
            </label>
            <textarea
              id="decision-note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Capture rationale, follow-up steps, or funding conditions."
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              rows={4}
              disabled={decisionLoading}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleFinalizeDecision("approved")}
              disabled={decisionLoading || !meetsDecisionThreshold}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              type="button"
              onClick={() => void handleFinalizeDecision("rejected")}
              disabled={decisionLoading || !meetsDecisionThreshold}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Reject
            </button>
            <button
              type="button"
              onClick={() => void handleFinalizeDecision("revise_and_resubmit")}
              disabled={decisionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Request revisions
            </button>
          </div>
        </div>
      )}
    </section>
  );

  const tabContent = (() => {
    switch (activeTab) {
      case "summary":
        return renderSummary();
      case "narrative":
        return renderNarrative();
      case "impact":
        return renderImpact();
      case "team":
        return renderTeam();
      case "evaluation":
        return renderEvaluation();
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-8">
      {/* Header with Tessellation - Orange/Amber colors matching Review pages */}
      <TessellationHeader
        icon={FileCheck}
        title={proposal.title}
        description={formattedKeywords}
        gradient="from-orange-500/60 via-amber-500/60 to-yellow-500/60"
        action={
          <Link
            href="/dashboard/review/proposals"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-orange-600 shadow-lg transition hover:bg-orange-50 hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Reviews
          </Link>
        }
      />

      <nav className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <ol className="flex flex-wrap">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <li key={tab.id} className="flex-1 min-w-[160px]">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition ${
                    isActive ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-600"
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="space-y-6">{tabContent}</main>
    </div>
  );
}

function DecisionStatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ArticleCard({ title, content }: { title: string; content: string }) {
  return (
    <article className="rounded-2xl border border-gray-200 p-6 bg-white space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{content}</p>
    </article>
  );
}
