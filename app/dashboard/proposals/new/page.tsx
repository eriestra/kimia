"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { useStableQuery } from "@/lib/hooks/useStableQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
  Send,
  Target,
  ClipboardList,
  Calendar,
  Wallet,
  Gauge,
  Users,
  FileUp,
  UserPlus,
  UserMinus,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import TessellationHeader from "@/components/TessellationHeader";
import ProposalFitPanel, { type FitAnalysisScore } from "@/components/ProposalFitPanel";

const STEPS = [
  { id: "basic", title: "Basic Information", icon: Target },
  { id: "objectives", title: "Objectives & Methodology", icon: ClipboardList },
  { id: "timeline", title: "Timeline", icon: Calendar },
  { id: "budget", title: "Budget", icon: Wallet },
  { id: "team_documents", title: "Team & Documents", icon: Users },
  { id: "impact", title: "Impact & Review", icon: Gauge },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type SpecificObjectivesState = string[];

type MilestoneState = {
  id: string;
  milestone: string;
  deadline: string;
  deliverables: string;
  successCriteria: string;
};

type BudgetItemState = {
  id: string;
  category: string;
  description: string;
  quantity: string;
  unitCost: string;
  justification: string;
};

type AttachmentState = {
  id: string;
  name: string;
  category: "required" | "optional";
  requirementId?: string;
  storageId?: string;
  fileName?: string;
};

type WizardState = {
  basic: {
    title: string;
    keywords: string;
    abstract: string;
    problemStatement: string;
  };
  objectives: {
    generalObjective: string;
    specificObjectives: SpecificObjectivesState;
    methodology: string;
    researchDesign: string;
    dataCollection: string;
    analysisPlan: string;
  };
  timeline: {
    milestones: MilestoneState[];
  };
  budget: {
    narrative: string;
    items: BudgetItemState[];
  };
  team: {
    memberIds: string[];
    invites: string[];
  };
  documents: {
    attachments: AttachmentState[];
  };
  impact: {
    expectedOutcomes: string;
    beneficiaries: string;
    indicators: string;
    dissemination: string;
  };
};

const emptyMilestone = (): MilestoneState => ({
  id: createId(),
  milestone: "",
  deadline: "",
  deliverables: "",
  successCriteria: "",
});

const emptyBudgetItem = (): BudgetItemState => ({
  id: createId(),
  category: "",
  description: "",
  quantity: "",
  unitCost: "",
  justification: "",
});

const DEFAULT_STATE: WizardState = {
  basic: {
    title: "",
    keywords: "",
    abstract: "",
    problemStatement: "",
  },
  objectives: {
    generalObjective: "",
    specificObjectives: ["", "", ""],
    methodology: "",
    researchDesign: "",
    dataCollection: "",
    analysisPlan: "",
  },
  timeline: {
    milestones: [
      emptyMilestone(),
      emptyMilestone(),
    ],
  },
  budget: {
    narrative: "",
    items: [emptyBudgetItem()],
  },
  team: {
    memberIds: [],
    invites: [],
  },
  documents: {
    attachments: [],
  },
  impact: {
    expectedOutcomes: "",
    beneficiaries: "",
    indicators: "",
    dissemination: "",
  },
};

function parseKeywords(input: string) {
  return input
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function convertStateToDraft(state: WizardState) {
  return {
    title: state.basic.title,
    keywords: parseKeywords(state.basic.keywords),
    abstract: state.basic.abstract,
    problemStatement: state.basic.problemStatement,
    generalObjective: state.objectives.generalObjective,
    specificObjectives: state.objectives.specificObjectives
      .map((objective) => objective.trim())
      .filter(Boolean),
    methodology: state.objectives.methodology,
    researchDesign: state.objectives.researchDesign,
    dataCollection: state.objectives.dataCollection,
    analysisPlan: state.objectives.analysisPlan,
    timeline: state.timeline.milestones
      .filter((milestone) => milestone.milestone.trim())
      .map((milestone) => ({
        milestone: milestone.milestone,
        deadline: milestone.deadline,
        deliverables: milestone.deliverables
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        successCriteria: milestone.successCriteria,
      })),
    budget: {
      narrative: state.budget.narrative,
      items: state.budget.items
        .filter((item) => item.category.trim() && item.description.trim())
        .map((item) => ({
          category: item.category,
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitCost: Number(item.unitCost) || 0,
          justification: item.justification,
        })),
    },
    teamMembers: state.team.memberIds,
    teamInvites: state.team.invites.map((invite) => invite.trim()).filter(Boolean),
    attachments: state.documents.attachments
      .filter((attachment) => attachment.storageId)
      .map((attachment) => ({
        storageId: attachment.storageId as string,
        name: attachment.name,
        category: attachment.category,
        requirementId: attachment.requirementId,
      })),
    impact: {
      expectedOutcomes: state.impact.expectedOutcomes,
      beneficiaries: state.impact.beneficiaries,
      indicators: state.impact.indicators,
      dissemination: state.impact.dissemination,
    },
  };
}

function hydrateStateFromDraft(draft: ReturnType<typeof convertStateToDraft>): WizardState {
  return {
    basic: {
      title: draft.title ?? "",
      keywords: draft.keywords.join(", "),
      abstract: draft.abstract ?? "",
      problemStatement: draft.problemStatement ?? "",
    },
    objectives: {
      generalObjective: draft.generalObjective ?? "",
      specificObjectives:
        draft.specificObjectives.length > 0 ? draft.specificObjectives : ["", "", ""],
      methodology: draft.methodology ?? "",
      researchDesign: draft.researchDesign ?? "",
      dataCollection: draft.dataCollection ?? "",
      analysisPlan: draft.analysisPlan ?? "",
    },
    timeline: {
      milestones:
        draft.timeline.length > 0
          ? draft.timeline.map((milestone) => ({
              id: createId(),
              milestone: milestone.milestone ?? "",
              deadline: milestone.deadline ?? "",
              deliverables: (milestone.deliverables ?? []).join("\n"),
              successCriteria: milestone.successCriteria ?? "",
            }))
          : [emptyMilestone(), emptyMilestone()],
    },
    budget: {
      narrative: draft.budget.narrative ?? "",
      items:
        draft.budget.items.length > 0
          ? draft.budget.items.map((item) => ({
              id: createId(),
              category: item.category ?? "",
              description: item.description ?? "",
              quantity:
                item.quantity !== undefined && item.quantity !== null
                  ? String(item.quantity)
                  : "",
              unitCost:
                item.unitCost !== undefined && item.unitCost !== null
                  ? String(item.unitCost)
                  : "",
              justification: item.justification ?? "",
            }))
          : [emptyBudgetItem()],
    },
    team: {
      memberIds: draft.teamMembers ?? [],
      invites: draft.teamInvites ?? [],
    },
    documents: {
      attachments:
        draft.attachments?.map((attachment) => ({
          id: createId(),
          name: attachment.name ?? "",
          category: (attachment.category as "required" | "optional") ?? "optional",
          requirementId: attachment.requirementId ?? undefined,
          storageId: attachment.storageId,
          fileName: attachment.name ?? "",
        })) ?? [],
    },
    impact: {
      expectedOutcomes: draft.impact.expectedOutcomes ?? "",
      beneficiaries: draft.impact.beneficiaries ?? "",
      indicators: draft.impact.indicators ?? "",
      dissemination: draft.impact.dissemination ?? "",
    },
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function ProposalWizardPage() {
  const params = useSearchParams();
  const router = useRouter();
  const callIdParam = params.get("callId") as Id<"calls"> | null;
  const editProposalId = params.get("edit") as Id<"proposals"> | null;

  // When editing, get the proposal by ID first
  const editingProposal = useStableQuery(
    api.proposals.getProposalDetail,
    editProposalId ? { proposalId: editProposalId } : "skip"
  );

  // Extract callId from either URL param or editing proposal
  const callId = callIdParam || (editingProposal?.proposal?.callId as Id<"calls"> | undefined) || null;

  const callSummary = useQuery(
    api.calls.getCallSummary,
    callId ? { callId: callId } : "skip"
  );
  const proposalData = useStableQuery(
    api.proposals.getProposalDraft,
    callId ? { callId: callId } : "skip"
  );
  const currentUser = useQuery(api.users.getCurrentUser);
  const proposalIdForDownloads = proposalData?.proposalId ?? editProposalId;

  const saveDraft = useMutation(api.proposals.saveProposalDraft);
  const submitProposal = useMutation(api.proposals.submitProposal);
  const generateUploadUrl = useMutation(api.proposals.generateUploadUrl);
  const generateAttachmentDownloadUrl = useMutation(
    api.proposals.generateAttachmentDownloadUrl
  );

  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [optionalDocName, setOptionalDocName] = useState("");
  const [uploadingRequirement, setUploadingRequirement] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysisScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeFit = useAction(api.ai.proposalFitAnalysis.analyzeProposalFit);

  const teamDetails = useQuery(
    api.users.getUsersByIds,
    state.team.memberIds.length > 0 ? { userIds: state.team.memberIds } : "skip"
  );
  const trimmedSearch = teamSearch.trim();
  const teamSearchResults = useQuery(
    api.users.searchUsers,
    trimmedSearch.length >= 2 ? { query: trimmedSearch, limit: 5 } : "skip"
  );

  // Hydrate from editing proposal (when ?edit=proposalId)
  useEffect(() => {
    if (editProposalId && editingProposal?.proposal) {
      const proposal = editingProposal.proposal;

      // Convert attachments object { required: [], optional: [] } to flat array
      const attachmentsArray: any[] = [];
      if (proposal.attachments?.required) {
        attachmentsArray.push(...proposal.attachments.required);
      }
      if (proposal.attachments?.optional) {
        attachmentsArray.push(...proposal.attachments.optional);
      }

      // Convert proposal fields to draft format
      const draft = {
        title: proposal.title || "",
        keywords: proposal.keywords || [],
        abstract: proposal.abstract || "",
        problemStatement: proposal.problemStatement || "",
        generalObjective: proposal.generalObjective || "",
        specificObjectives: proposal.specificObjectives || [],
        methodology: proposal.methodology || "",
        expectedResults: proposal.expectedResults || "",
        timeline: proposal.timeline || [],
        budget: {
          items: proposal.budget?.items || [],
          total: proposal.budget?.total || 0,
          narrative: proposal.budget?.narrative || "",
        },
        impact: proposal.impact || {},
        references: proposal.references || [],
        attachments: attachmentsArray,
      };
      const hydrated = hydrateStateFromDraft(draft);
      setState(hydrated);
      setLastSavedAt(proposal.updatedAt ?? null);
      setIsDirty(false);
    }
  }, [editProposalId, editingProposal]);

  // Hydrate from draft (when ?callId=callId)
  useEffect(() => {
    if (!callId || editProposalId) {
      return; // Skip if editing by proposal ID
    }
    if (proposalData && proposalData.draft) {
      const hydrated = hydrateStateFromDraft(proposalData.draft);
      setState(hydrated);
      setLastSavedAt(proposalData.updatedAt ?? null);
      setIsDirty(false);
    }
  }, [proposalData, callId, editProposalId]);

  useEffect(() => {
    if (proposalData?.status === "submitted") {
      setSubmitSuccess("Proposal submitted successfully!");
    }
  }, [proposalData?.status]);

  useEffect(() => {
    if (!isDirty || !callId) {
      return;
    }
    const timer = setTimeout(() => {
      void handleSave(true);
    }, 30000); // 30 seconds
    return () => clearTimeout(timer);
  }, [isDirty, callId]);

  useEffect(() => {
    if (currentUser === null) {
      router.replace("/auth/login");
    }
  }, [currentUser, router]);

  // When editing, we need editingProposal to load; when creating, we need callSummary
  const isEditMode = !!editProposalId;
  const callIsLoading = isEditMode
    ? editingProposal === undefined // Wait for editing proposal
    : (callId && callSummary === undefined); // Wait for call summary only if we have callId
  const draftIsLoading = isEditMode
    ? false // Don't wait for draft in edit mode
    : proposalData === undefined;

  const budgetTotal = useMemo(() => {
    return state.budget.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;
      return sum + quantity * unitCost;
    }, 0);
  }, [state.budget.items]);

  const handleFieldChange = useCallback(
    <K extends keyof WizardState>(section: K, value: WizardState[K]) => {
      setState((prev) => ({
        ...prev,
        [section]: value,
      }));
      setIsDirty(true);
    },
    []
  );

  const handleAddTeamMember = useCallback(
    (member: { _id: string; name: string; email: string }) => {
      setState((prev) => {
        if (prev.team.memberIds.includes(member._id)) {
          return prev;
        }
        return {
          ...prev,
          team: {
            memberIds: [...prev.team.memberIds, member._id],
            invites: prev.team.invites.filter(
              (invite) => invite.toLowerCase() !== (member.email ?? "").toLowerCase()
            ),
          },
        };
      });
      setIsDirty(true);
      setTeamSearch("");
    },
    []
  );

  const handleRemoveTeamMember = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      team: {
        ...prev.team,
        memberIds: prev.team.memberIds.filter((id) => id !== userId),
      },
    }));
    setIsDirty(true);
  }, []);

  const handleAddInvite = useCallback(() => {
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setInviteError("Email is required.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    setInviteError("");
    setState((prev) => {
      if (prev.team.invites.includes(trimmed)) {
        return prev;
      }
      return {
        ...prev,
        team: {
          ...prev.team,
          invites: [...prev.team.invites, trimmed],
        },
      };
    });
    setInviteEmail("");
    setIsDirty(true);
  }, [inviteEmail]);

  const handleRemoveInvite = useCallback((email: string) => {
    setState((prev) => ({
      ...prev,
      team: {
        ...prev.team,
        invites: prev.team.invites.filter((invite) => invite !== email),
      },
    }));
    setIsDirty(true);
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setState((prev) => ({
      ...prev,
      documents: {
        attachments: prev.documents.attachments.filter((attachment) => attachment.id !== attachmentId),
      },
    }));
    setIsDirty(true);
  }, []);

  const handleFileUpload = useCallback(
    async (
      file: File,
      category: "required" | "optional",
      requirementId?: string,
      displayName?: string
    ) => {
      setDocumentError("");
      const uploadKey = requirementId ?? createId();
      setUploadingRequirement(uploadKey);
      try {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!response.ok) {
          throw new Error("Upload failed. Please try again.");
        }
        const { storageId } = await response.json();
        const name = displayName?.trim() || file.name;
        setState((prev) => {
          const filtered =
            category === "required" && requirementId
              ? prev.documents.attachments.filter(
                  (attachment) =>
                    !(
                      attachment.category === "required" &&
                      attachment.requirementId === requirementId
                    )
                )
              : prev.documents.attachments;
          return {
            ...prev,
            documents: {
              attachments: [
                ...filtered,
                {
                  id: createId(),
                  name,
                  category,
                  requirementId,
                  storageId,
                  fileName: file.name,
                },
              ],
            },
          };
        });
        setIsDirty(true);
        if (category === "optional") {
          setOptionalDocName("");
        }
      } catch (error) {
        setDocumentError(
          error instanceof Error ? error.message : "Failed to upload document."
        );
      } finally {
        setUploadingRequirement(null);
      }
    },
    [generateUploadUrl]
  );

  const handleDownloadAttachment = useCallback(
    async (storageId: string | undefined) => {
      if (!storageId) {
        return;
      }
      if (!proposalIdForDownloads) {
        setDocumentError("Save your draft before downloading uploaded documents.");
        return;
      }
      try {
        setDocumentError("");
        const url = await generateAttachmentDownloadUrl({
          proposalId: proposalIdForDownloads,
          storageId: storageId as Id<"_storage">,
        });
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        setDocumentError(
          error instanceof Error ? error.message : "Unable to download document."
        );
      }
    },
    [generateAttachmentDownloadUrl, proposalIdForDownloads]
  );

  const handleSave = useCallback(
    async (silent = false) => {
      if (!callId) {
        setSaveError("Missing call context. Return to calls and try again.");
        return;
      }

      setSaveError("");
      if (!silent) {
        setIsSaving(true);
      }
      try {
        const draft = convertStateToDraft(state);
        await saveDraft({ callId: callId, draft });
        setIsDirty(false);
        setLastSavedAt(Date.now());
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Unable to save draft. Please try again."
        );
      } finally {
        if (!silent) {
          setIsSaving(false);
        }
      }
    },
    [callId, saveDraft, state]
  );

  const validateForSubmission = () => {
    const draft = convertStateToDraft(state);
    if (!draft.title.trim()) {
      throw new Error("Title is required.");
    }
    if (!draft.abstract.trim()) {
      throw new Error("Abstract is required.");
    }
    if (!draft.problemStatement.trim()) {
      throw new Error("Problem statement is required.");
    }
    if (!draft.generalObjective.trim()) {
      throw new Error("General objective is required.");
    }
    if (draft.specificObjectives.length < 1) {
      throw new Error("Please add at least one specific objective.");
    }
    if (!draft.methodology.trim()) {
      throw new Error("Methodology is required.");
    }
    if (draft.timeline.length === 0) {
      throw new Error("Please add at least one milestone.");
    }
    if (draft.budget.items.length === 0) {
      throw new Error("Please add at least one budget item.");
    }
    if (draft.impact.expectedOutcomes.trim().length === 0) {
      throw new Error("Expected outcomes are required.");
    }
    const requiredDocs = callSummary?.requiredDocuments ?? [];
    if (requiredDocs.length > 0) {
      const uploadedRequired = new Set(
        state.documents.attachments
          .filter(
            (attachment) =>
              attachment.category === "required" && attachment.requirementId
          )
          .map((attachment) => attachment.requirementId as string)
      );
      const missing = requiredDocs.find((doc: string) => !uploadedRequired.has(doc));
      if (missing) {
        throw new Error(`Required document missing: ${missing}`);
      }
    }
    return draft;
  };

  const handleSubmitProposal = async () => {
    if (!callId) {
      setSubmitError("Missing call context.");
      return;
    }
    setSubmitError("");
    setSubmitSuccess("");

    try {
      validateForSubmission();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Validation failed.");
      return;
    }

    setIsSubmitting(true);
    try {
      await handleSave(true);
      await submitProposal({ callId: callId });
      setSubmitSuccess("Proposal submitted successfully!");
      setIsDirty(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Submission failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzeFit = async () => {
    if (!proposalIdForDownloads) {
      setSubmitError("Please save your proposal first before analyzing fit.");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Save current changes before analyzing
      await handleSave(true);

      // Run AI analysis
      const result = await analyzeFit({ proposalId: proposalIdForDownloads });
      setFitAnalysis(result);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to analyze proposal fit. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFitContinue = () => {
    // Continue to submission (submit button is already visible)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFitGoBack = () => {
    // Go back to first step to edit
    setActiveStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!callIdParam && !editProposalId) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-red-800">
        <h1 className="text-2xl font-semibold">Call or Proposal not specified</h1>
        <p className="mt-2">
          To draft a proposal, navigate to an open call and use the &quot;Start Proposal&quot; button,
          or click &quot;Edit&quot; on a draft proposal from My Proposals.
        </p>
        <Link
          href="/dashboard/calls"
          className="inline-flex mt-6 items-center gap-2 text-red-700 hover:text-red-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calls
        </Link>
      </div>
    );
  }

  if (currentUser === undefined || callIsLoading || draftIsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Only check for callSummary if we're done loading and have a callId
  if (!callSummary && callId && !callIsLoading) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-red-800">
        <h1 className="text-2xl font-semibold">Call not found</h1>
        <p className="mt-2">
          The call you selected is no longer available. Please choose another opportunity.
        </p>
        <Link
          href="/dashboard/calls"
          className="inline-flex mt-6 items-center gap-2 text-red-700 hover:text-red-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calls
        </Link>
      </div>
    );
  }

  const activeStepId: StepId = STEPS[activeStep].id;

  const perProjectMin = callSummary?.budget?.perProject?.min ?? 0;
  const perProjectMax = callSummary?.budget?.perProject?.max ?? 0;

  const memberDetails = Array.isArray(teamDetails) ? teamDetails : [];
  const searchResults = Array.isArray(teamSearchResults) ? teamSearchResults : [];
  const attachments = state.documents.attachments;

  const renderStep = () => {
    switch (activeStepId) {
      case "basic":
        return (
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Proposal Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={state.basic.title}
                onChange={(event) =>
                  handleFieldChange("basic", {
                    ...state.basic,
                    title: event.target.value,
                  })
                }
                placeholder="Maximum 150 characters"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={150}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Keywords <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={state.basic.keywords}
                  onChange={(event) =>
                    handleFieldChange("basic", {
                      ...state.basic,
                      keywords: event.target.value,
                    })
                  }
                  placeholder="e.g., innovation, pedagogy, digital transformation"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate with commas. Aim for 3-8 keywords.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Project Type
                </label>
                <input
                  type="text"
                  value={callSummary?.projectType || editingProposal?.call?.projectType || ""}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Abstract <span className="text-red-600">*</span>
              </label>
              <textarea
                value={state.basic.abstract}
                onChange={(event) =>
                  handleFieldChange("basic", {
                    ...state.basic,
                    abstract: event.target.value,
                  })
                }
                rows={6}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Summarize the proposal in 250-500 words."
              />
              <p className="text-xs text-gray-500 mt-1">
                Word count: {state.basic.abstract.trim().split(/\s+/).filter(Boolean).length}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Problem Statement <span className="text-red-600">*</span>
              </label>
              <textarea
                value={state.basic.problemStatement}
                onChange={(event) =>
                  handleFieldChange("basic", {
                    ...state.basic,
                    problemStatement: event.target.value,
                  })
                }
                rows={5}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the educational challenge or opportunity this proposal addresses."
              />
            </div>
          </section>
        );
      case "objectives":
        return (
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                General Objective <span className="text-red-600">*</span>
              </label>
              <textarea
                value={state.objectives.generalObjective}
                onChange={(event) =>
                  handleFieldChange("objectives", {
                    ...state.objectives,
                    generalObjective: event.target.value,
                  })
                }
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State the overarching goal."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Specific Objectives <span className="text-red-600">*</span>
              </label>
              <div className="space-y-3">
                {state.objectives.specificObjectives.map((objective, index) => (
                  <div key={`objective-${index}`} className="flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(event) => {
                        const newObjectives = [...state.objectives.specificObjectives];
                        newObjectives[index] = event.target.value;
                        handleFieldChange("objectives", {
                          ...state.objectives,
                          specificObjectives: newObjectives,
                        });
                      }}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Objective ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = state.objectives.specificObjectives.filter(
                          (_, i) => i !== index
                        );
                        handleFieldChange("objectives", {
                          ...state.objectives,
                          specificObjectives:
                            updated.length > 0 ? updated : [""],
                        });
                      }}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      disabled={state.objectives.specificObjectives.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleFieldChange("objectives", {
                      ...state.objectives,
                      specificObjectives: [
                        ...state.objectives.specificObjectives,
                        "",
                      ],
                    })
                  }
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span className="text-xl leading-none">+</span> Add objective
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Research Design
                </label>
                <input
                  type="text"
                  value={state.objectives.researchDesign}
                  onChange={(event) =>
                    handleFieldChange("objectives", {
                      ...state.objectives,
                      researchDesign: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mixed methods, experimental"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Data Collection Methods
                </label>
                <input
                  type="text"
                  value={state.objectives.dataCollection}
                  onChange={(event) =>
                    handleFieldChange("objectives", {
                      ...state.objectives,
                      dataCollection: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe surveys, interviews, observations, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Methodology <span className="text-red-600">*</span>
              </label>
              <textarea
                value={state.objectives.methodology}
                onChange={(event) =>
                  handleFieldChange("objectives", {
                    ...state.objectives,
                    methodology: event.target.value,
                  })
                }
                rows={6}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detail the plan for achieving the objectives."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Analysis Plan
              </label>
              <textarea
                value={state.objectives.analysisPlan}
                onChange={(event) =>
                  handleFieldChange("objectives", {
                    ...state.objectives,
                    analysisPlan: event.target.value,
                  })
                }
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Explain how you will analyze collected data."
              />
            </div>
          </section>
        );
      case "timeline":
        return (
          <section className="space-y-6">
            <p className="text-sm text-gray-600">
              Define the key milestones for your project. Include the target date and expected deliverables. Enter one deliverable per line.
            </p>
            <div className="space-y-4">
              {state.timeline.milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="rounded-2xl border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Milestone {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = state.timeline.milestones.filter(
                          (item) => item.id !== milestone.id
                        );
                        handleFieldChange("timeline", {
                          milestones: updated.length > 0 ? updated : [emptyMilestone()],
                        });
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={state.timeline.milestones.length <= 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Milestone <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={milestone.milestone}
                        onChange={(event) => {
                          const updated = state.timeline.milestones.map((item) =>
                            item.id === milestone.id
                              ? { ...item, milestone: event.target.value }
                              : item
                          );
                          handleFieldChange("timeline", { milestones: updated });
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Date <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={milestone.deadline}
                        onChange={(event) => {
                          const updated = state.timeline.milestones.map((item) =>
                            item.id === milestone.id
                              ? { ...item, deadline: event.target.value }
                              : item
                          );
                          handleFieldChange("timeline", { milestones: updated });
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deliverables <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={milestone.deliverables}
                      onChange={(event) => {
                        const updated = state.timeline.milestones.map((item) =>
                          item.id === milestone.id
                            ? { ...item, deliverables: event.target.value }
                            : item
                        );
                        handleFieldChange("timeline", { milestones: updated });
                      }}
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="List deliverables (one per line)."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Success Criteria
                    </label>
                    <textarea
                      value={milestone.successCriteria}
                      onChange={(event) => {
                        const updated = state.timeline.milestones.map((item) =>
                          item.id === milestone.id
                            ? { ...item, successCriteria: event.target.value }
                            : item
                        );
                        handleFieldChange("timeline", { milestones: updated });
                      }}
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="How will you measure success for this milestone?"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                handleFieldChange("timeline", {
                  milestones: [...state.timeline.milestones, emptyMilestone()],
                })
              }
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <span className="text-xl leading-none">+</span> Add milestone
            </button>
          </section>
        );
      case "budget":
        return (
          <section className="space-y-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
              <p className="text-sm">
                Allowed per-project budget range: {formatCurrency(perProjectMin)} – {formatCurrency(perProjectMax)}.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Budget Narrative
              </label>
              <textarea
                value={state.budget.narrative}
                onChange={(event) =>
                  handleFieldChange("budget", {
                    ...state.budget,
                    narrative: event.target.value,
                  })
                }
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Summarize how funding will be used and why it is justified."
              />
            </div>

            <div className="space-y-4">
              {state.budget.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 p-4 space-y-3"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(event) => {
                          const updated = state.budget.items.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, category: event.target.value }
                              : entry
                          );
                          handleFieldChange("budget", { ...state.budget, items: updated });
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Equipment, Training"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) => {
                          const updated = state.budget.items.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, description: event.target.value }
                              : entry
                          );
                          handleFieldChange("budget", { ...state.budget, items: updated });
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe the expense item."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => {
                          const updated = state.budget.items.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, quantity: event.target.value }
                              : entry
                          );
                          handleFieldChange("budget", { ...state.budget, items: updated });
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Cost <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(event) => {
                          const updated = state.budget.items.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, unitCost: event.target.value }
                              : entry
                          );
                          handleFieldChange("budget", { ...state.budget, items: updated });
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(
                          (Number(item.quantity) || 0) * (Number(item.unitCost) || 0)
                        )}
                        disabled
                        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Justification <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={item.justification}
                      onChange={(event) => {
                        const updated = state.budget.items.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, justification: event.target.value }
                            : entry
                        );
                        handleFieldChange("budget", { ...state.budget, items: updated });
                      }}
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Explain why this expense is necessary."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = state.budget.items.filter(
                          (entry) => entry.id !== item.id
                        );
                        handleFieldChange("budget", {
                          ...state.budget,
                          items: updated.length > 0 ? updated : [emptyBudgetItem()],
                        });
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={state.budget.items.length <= 1}
                    >
                      Remove item
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                handleFieldChange("budget", {
                  ...state.budget,
                  items: [...state.budget.items, emptyBudgetItem()],
                })
              }
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <span className="text-xl leading-none">+</span> Add budget item
            </button>

            <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Budget Summary</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(budgetTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Ensure total stays within the allowed range for this call.
              </p>
            </div>
          </section>
        );
      case "team_documents": {
        const requiredDocs = callSummary?.requiredDocuments ?? [];
        const filteredResults = searchResults.filter(
          (result: any) =>
            !state.team.memberIds.includes(result._id) &&
            result._id !== (currentUser?._id ?? "") &&
            !state.team.invites.some(
              (invite) => invite.toLowerCase() === (result.email ?? "").toLowerCase()
            )
        );
        return (
          <section className="space-y-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                <p className="text-sm text-gray-600">
                  Invite colleagues to collaborate. Selected members gain read-only access until collaboration is enabled.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    type="search"
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                    placeholder="Search by name or email"
                    className="w-full md:w-80 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Enter at least 2 characters to search existing users.
                  </p>
                </div>
                {trimmedSearch.length >= 2 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                    {filteredResults.length === 0 ? (
                      <p className="text-sm text-gray-600">No users found.</p>
                    ) : (
                      filteredResults.map((result: any) => (
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
                            onClick={() => handleAddTeamMember(result)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Selected Members</h4>
                {memberDetails.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No additional members yet. You are automatically included as the principal investigator.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {memberDetails.map((member: any) => (
                      <li
                        key={member._id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(member._id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="w-4 h-4" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Invite by Email</h4>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="colleague@institution.edu"
                    className="w-full sm:w-80 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddInvite}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add invite
                  </button>
                </div>
                {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                {state.team.invites.length > 0 && (
                  <ul className="space-y-2">
                    {state.team.invites.map((invite) => (
                      <li
                        key={invite}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                      >
                        {invite}
                        <button
                          type="button"
                          onClick={() => handleRemoveInvite(invite)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="w-4 h-4" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>
              {requiredDocs.length === 0 ? (
                <p className="text-sm text-gray-600">This call has no required attachments.</p>
              ) : (
                <div className="space-y-3">
                  {requiredDocs.map((docName: string) => {
                    const existing = attachments.find(
                      (attachment) =>
                        attachment.category === "required" && attachment.requirementId === docName
                    );
                    const isUploading = uploadingRequirement === docName;
                    return (
                      <div
                        key={docName}
                        className="rounded-xl border border-gray-200 bg-white p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{docName}</p>
                            <p className="text-xs text-gray-600">
                              Accepted formats: PDF, DOCX, XLSX, JPG, PNG (max 10MB)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {existing ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                <Check className="w-4 h-4" />
                                Uploaded
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">Pending</span>
                            )}
                          </div>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void handleFileUpload(file, "required", docName, docName);
                              }
                              event.target.value = "";
                            }}
                          />
                          <FileUp className="w-4 h-4" />
                          {existing ? "Replace file" : "Upload file"}
                        </label>
                        {isUploading && (
                          <p className="text-xs text-gray-500 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </p>
                        )}
                        {existing?.fileName && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              <span>{existing.fileName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDownloadAttachment(existing.storageId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 font-semibold text-indigo-600 transition hover:bg-indigo-50"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Optional Documents</h3>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="text"
                  value={optionalDocName}
                  onChange={(event) => setOptionalDocName(event.target.value)}
                  placeholder="Document name (e.g., Support letter)"
                  className="w-full md:w-72 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const name = optionalDocName.trim() || file.name;
                        void handleFileUpload(file, "optional", undefined, name);
                      }
                      event.target.value = "";
                    }}
                  />
                  <FileUp className="w-4 h-4" />
                  Upload optional file
                </label>
              </div>
              <ul className="space-y-2">
                {attachments
                  .filter((attachment) => attachment.category === "optional")
                  .map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Paperclip className="w-4 h-4 text-indigo-500" />
                        <span>{attachment.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownloadAttachment(attachment.storageId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>

            {documentError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {documentError}
              </div>
            )}
          </section>
        );
      }
      case "impact":
        return (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Expected Outcomes <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={state.impact.expectedOutcomes}
                  onChange={(event) =>
                    handleFieldChange("impact", {
                      ...state.impact,
                      expectedOutcomes: event.target.value,
                    })
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the tangible results of the project."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Target Beneficiaries <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={state.impact.beneficiaries}
                  onChange={(event) =>
                    handleFieldChange("impact", {
                      ...state.impact,
                      beneficiaries: event.target.value,
                    })
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Who benefits and how?"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Measurement Indicators <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={state.impact.indicators}
                  onChange={(event) =>
                    handleFieldChange("impact", {
                      ...state.impact,
                      indicators: event.target.value,
                    })
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Define metrics or KPIs."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Dissemination Plan <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={state.impact.dissemination}
                  onChange={(event) =>
                    handleFieldChange("impact", {
                      ...state.impact,
                      dissemination: event.target.value,
                    })
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How will results be shared?"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6 bg-white space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Review Checklist</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <Check className="inline mr-2 h-4 w-4 text-green-500" />
                  Confirm all required fields are completed in each section.
                </li>
                <li>
                  <Check className="inline mr-2 h-4 w-4 text-green-500" />
                  Verify budget totals fall within call limits.
                </li>
                <li>
                  <Check className="inline mr-2 h-4 w-4 text-green-500" />
                  Ensure milestones include deliverables and dates.
                </li>
              </ul>
            </div>

            {/* AI Fit Analysis Panel */}
            <ProposalFitPanel
              analysis={fitAnalysis}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyzeFit}
              onContinue={handleFitContinue}
              onGoBack={handleFitGoBack}
            />
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      {callSummary?.slug && (
        <Link
          href={`/calls/${callSummary.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Call
        </Link>
      )}

      {/* Enhanced Header with Tessellation - Purple/Pink gradient */}
      <TessellationHeader
        icon={FileText}
        title={`Proposal for ${callSummary?.title || editingProposal?.call?.title || "Call"}`}
        description="Complete each section to draft your proposal. Changes save automatically every 30 seconds."
        gradient="from-purple-500/60 via-pink-500/60 to-rose-400/60"
        action={
          <div className="flex flex-col items-end gap-3">
            {lastSavedAt && (
              <span className="text-xs text-white/90 font-medium">
                Last saved {new Date(lastSavedAt).toLocaleTimeString()}
              </span>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition disabled:opacity-60 border border-white/30"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitProposal()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-white/90 transition disabled:opacity-60 shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Proposal
              </button>
            </div>
          </div>
        }
      />

      <nav className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <ol className="grid grid-cols-1 md:grid-cols-6">
          {STEPS.map((step, index) => {
            const isActive = index === activeStep;
            return (
              <li
                key={step.id}
                className={`border-b md:border-b-0 md:border-r border-gray-200 last:border-none transition-all ${
                  isActive ? "bg-gradient-to-br from-purple-50 to-pink-50" : "hover:bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`w-full flex items-center gap-3 px-4 py-5 text-sm font-semibold transition-colors ${
                    isActive ? "text-purple-700" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <step.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-purple-600" : "text-gray-400"}`} />
                  <span className="text-left">{step.title}</span>
                  {isActive && (
                    <Check className="w-4 h-4 ml-auto text-purple-600" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-8">
        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {saveError}
          </div>
        )}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {submitSuccess}
          </div>
        )}
        {renderStep()}
      </main>

      <footer className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
            disabled={activeStep === 0}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1))}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            disabled={activeStep === STEPS.length - 1}
          >
            Next
          </button>
        </div>
        {callSummary?.slug && (
          <div className="text-sm text-gray-500">
            Need help? Review the call documents under <Link href={`/calls/${callSummary.slug}`} className="text-blue-600 hover:text-blue-700">call details</Link>.
          </div>
        )}
      </footer>
    </div>
  );
}
