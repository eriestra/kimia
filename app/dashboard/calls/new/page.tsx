"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  FileText,
  Users,
  Calendar,
  FileCheck,
  Eye,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  ChevronRight,
  Type,
  Link2,
  AlignLeft,
  Target,
  MapPin,
  Building2,
  GraduationCap,
  Award,
  UserCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Coins,
  Tag,
  FilePlus,
  Shield,
  Settings,
} from "lucide-react";
import TessellationHeader from "@/components/TessellationHeader";
import Link from "next/link";

const STEPS = [
  { id: "overview", title: "Overview", icon: FileText },
  { id: "eligibility", title: "Eligibility", icon: Users },
  { id: "timeline", title: "Timeline & Budget", icon: Calendar },
  { id: "documents", title: "Documents & Evaluation", icon: FileCheck },
  { id: "review", title: "Review", icon: Eye },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const ASSIGNMENT_METHOD_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "auto_balanced", label: "Auto-balanced" },
  { value: "ai_matched", label: "AI-matched" },
] as const;

const dayMs = 1000 * 60 * 60 * 24;

const defaultState = {
  overview: {
    title: "",
    slug: "",
    description: "",
    projectType: "",
    objectives: "",
    targetAudience: "",
  },
  eligibility: {
    campuses: "",
    departments: "",
    academicRanks: "",
    qualifications: "",
    teamRoles: "",
    teamNotes: "",
    teamMin: "",
    teamMax: "",
    conflicts: "",
  },
  timeline: {
    openDate: new Date(Date.now()).toISOString().slice(0, 10),
    closeDate: new Date(Date.now() + dayMs * 30).toISOString().slice(0, 10),
    evaluationStart: "",
    evaluationEnd: "",
    decisionDate: "",
    projectStart: "",
    projectEnd: "",
    gracePeriod: "24",
    budgetTotal: "",
    budgetMin: "",
    budgetMax: "",
    budgetCategories: "",
    budgetThreshold: "",
    budgetNotes: "",
  },
  documents: {
    required: "",
    optional: "",
    evaluatorsRequired: "3",
    blindReview: true,
    assignmentMethod: ASSIGNMENT_METHOD_OPTIONS[0].value,
    evaluationConflicts: "",
    rubricTemplateId: "",
  },
};

type WizardState = typeof defaultState;

type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export default function CreateCallPage() {
  const router = useRouter();
  const createCall = useMutation(api.calls.createCall);
  const currentUser = useQuery(api.users.getCurrentUser);
  const canManageRubrics =
    currentUser !== undefined &&
    currentUser !== null &&
    (currentUser.role === "sysadmin" || currentUser.role === "admin");
  const rubricTemplates = useQuery(
    api.rubrics.listTemplates,
    canManageRubrics ? undefined : "skip"
  );
  const rubricTemplatesList = Array.isArray(rubricTemplates) ? rubricTemplates : [];
  const rubricTemplatesLoading = rubricTemplates === undefined && canManageRubrics;

  const [state, setState] = useState<WizardState>(defaultState);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!canManageRubrics) {
      return;
    }
    if (!Array.isArray(rubricTemplatesList) || rubricTemplatesList.length === 0) {
      return;
    }
    setState((prev) => {
      if (prev.documents.rubricTemplateId) {
        return prev;
      }
      return {
        ...prev,
        documents: {
          ...prev.documents,
          rubricTemplateId: rubricTemplatesList[0]._id as string,
        },
      };
    });
  }, [rubricTemplatesList, canManageRubrics]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    if (currentUser.role !== "sysadmin" && currentUser.role !== "admin") {
      router.replace("/dashboard/calls");
    }
  }, [currentUser, router]);

  if (currentUser === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded bg-gray-200 animate-pulse" />
        <div className="h-64 rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse" />
      </div>
    );
  }

  if (
    currentUser === null ||
    (currentUser.role !== "sysadmin" && currentUser.role !== "admin")
  ) {
    return null;
  }

  const currentStepId: StepId = STEPS[stepIndex].id;

  const goNext = () => {
    const validation = validateStep(currentStepId, state);
    if (!validation.valid) {
      alert(Object.values(validation.errors)[0]);
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const validation = validateAll(state);
    if (!validation.valid) {
      alert(Object.values(validation.errors)[0]);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await createCall(convertStateToPayload(state));
      router.push("/dashboard/calls");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create call");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      <Link
        href="/dashboard/calls"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Calls
      </Link>

      {/* Enhanced Header with Tessellation - Blue/Cyan from Kimia logo */}
      <TessellationHeader
        icon={Sparkles}
        title="New Funding Call"
        description="Follow the step-by-step wizard to configure your funding call. Review all details before publishing."
        gradient="from-blue-500/60 via-cyan-500/60 to-teal-400/60"
      />

      {/* Enhanced Progress Indicator */}
      <ProgressIndicator currentStep={currentStepId} />

      {/* Form Content Card */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
        {currentStepId === "overview" && (
          <OverviewStep
            state={state.overview}
            onChange={(draft) => setState((prev) => ({ ...prev, overview: { ...prev.overview, ...draft } }))}
          />
        )}
        {currentStepId === "eligibility" && (
          <EligibilityStep
            state={state.eligibility}
            onChange={(draft) => setState((prev) => ({ ...prev, eligibility: { ...prev.eligibility, ...draft } }))}
          />
        )}
        {currentStepId === "timeline" && (
          <TimelineStep
            state={state.timeline}
            onChange={(draft) => setState((prev) => ({ ...prev, timeline: { ...prev.timeline, ...draft } }))}
          />
        )}
        {currentStepId === "documents" && (
          <DocumentsStep
            state={state.documents}
            onChange={(draft) => setState((prev) => ({ ...prev, documents: { ...prev.documents, ...draft } }))}
            templates={rubricTemplatesList}
            templatesLoading={rubricTemplatesLoading}
          />
        )}
        {currentStepId === "review" && <ReviewStep state={state} templates={rubricTemplatesList} />}
      </section>

      {/* Enhanced Footer Navigation */}
      <footer className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">{stepIndex + 1}/{STEPS.length}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{STEPS[stepIndex].title}</p>
              <p className="text-xs text-gray-500">Step {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {currentStepId !== "review" ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Publish Call
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
    </div>
  );
}

function ProgressIndicator({ currentStep }: { currentStep: StepId }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full hidden lg:block" />
        <div
          className="absolute top-8 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 hidden lg:block"
          style={{
            width: `${(STEPS.findIndex((s) => s.id === currentStep) / (STEPS.length - 1)) * 100}%`
          }}
        />

        <ol className="relative grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((step, index) => {
            const status = step.id === currentStep ? "current" : index < STEPS.findIndex((s) => s.id === currentStep) ? "complete" : "upcoming";
            const IconComponent = step.icon;

            return (
              <li key={step.id} className="flex flex-col items-center text-center">
                <div
                  className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                    status === "complete"
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg scale-100"
                      : status === "current"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xl scale-110 ring-4 ring-blue-200"
                      : "bg-gray-100 text-gray-400 scale-90"
                  }`}
                >
                  {status === "complete" ? (
                    <Check className="w-7 h-7" />
                  ) : (
                    <IconComponent className="w-7 h-7" />
                  )}
                </div>
                <div className="mt-3">
                  <p className={`text-sm font-semibold ${
                    status === "current" ? "text-blue-600" : status === "complete" ? "text-gray-900" : "text-gray-500"
                  }`}>
                    {step.title}
                  </p>
                  {status === "current" && (
                    <p className="text-xs text-blue-600 font-medium mt-1">In Progress</p>
                  )}
                  {status === "complete" && (
                    <p className="text-xs text-gray-500 mt-1">Completed</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function OverviewStep({
  state,
  onChange,
}: {
  state: WizardState["overview"];
  onChange: (draft: Partial<WizardState["overview"]>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Basic Information</h3>
            <p className="text-sm text-gray-600">
              Provide the core details that will help applicants understand this funding opportunity.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Type className="w-4 h-4 text-blue-600" />
            Call Title *
          </span>
          <input
            value={state.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="Innovación Docente 2025"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500" />
            Custom Slug (optional)
          </span>
          <input
            value={state.slug}
            onChange={(event) => onChange({ slug: event.target.value })}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="innovacion-docente-2025"
          />
          <p className="text-xs text-gray-500">URL-friendly identifier for this call</p>
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            Project Type *
          </span>
          <input
            value={state.projectType}
            onChange={(event) => onChange({ projectType: event.target.value })}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="Educational Innovation"
            required
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-blue-600" />
            Description *
          </span>
          <textarea
            value={state.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="Describe the purpose of this funding call and highlight what makes proposals successful."
            required
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-green-600" />
            Objectives (one per line)
          </span>
          <textarea
            value={state.objectives}
            onChange={(event) => onChange({ objectives: event.target.value })}
            rows={3}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder={`Foster active learning methodologies\nEncourage inter-campus collaboration`}
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Target Audience (one per line)
          </span>
          <textarea
            value={state.targetAudience}
            onChange={(event) => onChange({ targetAudience: event.target.value })}
            rows={2}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder={`Faculty\nAcademic departments`}
          />
        </label>
      </div>
    </div>
  );
}

function EligibilityStep({
  state,
  onChange,
}: {
  state: WizardState["eligibility"];
  onChange: (draft: Partial<WizardState["eligibility"]>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-l-4 border-purple-500">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Eligibility Requirements</h3>
            <p className="text-sm text-gray-600">
              Define who can apply and what team composition is required. Applicants will see this information on the call detail page.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TextAreaField
          label="Eligible Campuses"
          icon={MapPin}
          iconColor="text-red-600"
          value={state.campuses}
          onChange={(value) => onChange({ campuses: value })}
          placeholder={`Santiago\nTalca\nTemuco`}
        />
        <TextAreaField
          label="Eligible Departments"
          icon={Building2}
          iconColor="text-blue-600"
          value={state.departments}
          onChange={(value) => onChange({ departments: value })}
          placeholder={`Education\nHealth Sciences`}
        />
        <TextAreaField
          label="Academic Ranks"
          icon={GraduationCap}
          iconColor="text-indigo-600"
          value={state.academicRanks}
          onChange={(value) => onChange({ academicRanks: value })}
          placeholder={`Assistant Professor\nAssociate Professor`}
        />
        <TextAreaField
          label="Required Qualifications"
          icon={Award}
          iconColor="text-yellow-600"
          value={state.qualifications}
          onChange={(value) => onChange({ qualifications: value })}
          placeholder={`Active teaching assignment\nInstitutional support letter`}
        />
        <TextAreaField
          label="Required Team Roles"
          icon={UserCheck}
          iconColor="text-green-600"
          value={state.teamRoles}
          onChange={(value) => onChange({ teamRoles: value })}
          placeholder={`Principal Investigator\nPedagogical designer`}
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Min Team Members"
            icon={Users}
            iconColor="text-gray-600"
            value={state.teamMin}
            onChange={(value) => onChange({ teamMin: value })}
            min={1}
          />
          <NumberField
            label="Max Team Members"
            icon={Users}
            iconColor="text-gray-600"
            value={state.teamMax}
            onChange={(value) => onChange({ teamMax: value })}
            min={1}
          />
        </div>
        <TextAreaField
          label="Team Notes"
          icon={FileText}
          iconColor="text-blue-600"
          value={state.teamNotes}
          onChange={(value) => onChange({ teamNotes: value })}
          placeholder="Teams must include at least one emerging faculty member."
        />
        <TextAreaField
          label="Conflict of Interest Policies"
          icon={AlertTriangle}
          iconColor="text-orange-600"
          value={state.conflicts}
          onChange={(value) => onChange({ conflicts: value })}
          placeholder={`Evaluators must recuse themselves if...`}
        />
      </div>
    </div>
  );
}

function TimelineStep({
  state,
  onChange,
}: {
  state: WizardState["timeline"];
  onChange: (draft: Partial<WizardState["timeline"]>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-l-4 border-green-500">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Schedule & Budget</h3>
            <p className="text-sm text-gray-600">
              Configure the timeline and funding envelope for this call. Applicants will see these details on the call detail page.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Important Dates
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <DateField label="Call Opens *" value={state.openDate} onChange={(value) => onChange({ openDate: value })} required />
          <DateField label="Submission Deadline *" value={state.closeDate} onChange={(value) => onChange({ closeDate: value })} required />
          <DateField label="Evaluation Starts" value={state.evaluationStart} onChange={(value) => onChange({ evaluationStart: value })} />
          <DateField label="Evaluation Ends" value={state.evaluationEnd} onChange={(value) => onChange({ evaluationEnd: value })} />
          <DateField label="Decision Date" value={state.decisionDate} onChange={(value) => onChange({ decisionDate: value })} />
          <DateField label="Project Start" value={state.projectStart} onChange={(value) => onChange({ projectStart: value })} />
          <DateField label="Project End" value={state.projectEnd} onChange={(value) => onChange({ projectEnd: value })} />
          <NumberField
            label="Grace Period (hours)"
            icon={Clock}
            iconColor="text-orange-600"
            value={state.gracePeriod}
            onChange={(value) => onChange({ gracePeriod: value })}
            min={0}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          Funding Details
        </h4>
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <NumberField
            label="Total Budget (CLP) *"
            icon={DollarSign}
            iconColor="text-green-600"
            value={state.budgetTotal}
            onChange={(value) => onChange({ budgetTotal: value })}
            min={0}
            required
          />
          <NumberField
            label="Per Project Min (CLP) *"
            icon={Coins}
            iconColor="text-yellow-600"
            value={state.budgetMin}
            onChange={(value) => onChange({ budgetMin: value })}
            min={0}
            required
          />
          <NumberField
            label="Per Project Max (CLP) *"
            icon={Coins}
            iconColor="text-yellow-600"
            value={state.budgetMax}
            onChange={(value) => onChange({ budgetMax: value })}
            min={0}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextAreaField
            label="Allowed Expense Categories"
            icon={Tag}
            iconColor="text-purple-600"
            value={state.budgetCategories}
            onChange={(value) => onChange({ budgetCategories: value })}
            placeholder={`Equipment\nProfessional development\nLearning materials`}
          />
          <div className="space-y-4">
            <NumberField
              label="Justification Required Above (CLP)"
              icon={AlertTriangle}
              iconColor="text-orange-600"
              value={state.budgetThreshold}
              onChange={(value) => onChange({ budgetThreshold: value })}
              min={0}
            />
            <TextAreaField
              label="Budget Notes"
              icon={FileText}
              iconColor="text-gray-600"
              value={state.budgetNotes}
              onChange={(value) => onChange({ budgetNotes: value })}
              placeholder="Provide context or restrictions for budget planning."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsStep({
  state,
  onChange,
  templates,
  templatesLoading,
}: {
  state: WizardState["documents"];
  onChange: (draft: Partial<WizardState["documents"]>) => void;
  templates?: Array<any>;
  templatesLoading: boolean;
}) {
  const availableTemplates = templates ?? [];
  const selectedTemplate = state.rubricTemplateId
    ? availableTemplates.find((t: any) => t._id === state.rubricTemplateId)
    : null;
  const totalWeight = selectedTemplate
    ? selectedTemplate.criteria.reduce((sum: number, c: any) => sum + c.weight, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border-l-4 border-orange-500">
        <div className="flex items-start gap-3">
          <FileCheck className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Documents & Evaluation</h3>
            <p className="text-sm text-gray-600">
              Specify required submission documents and configure the evaluation process for this call.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FilePlus className="w-4 h-4 text-blue-600" />
          Submission Requirements
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <TextAreaField
            label="Required Documents"
            icon={FileCheck}
            iconColor="text-red-600"
            value={state.required}
            onChange={(value) => onChange({ required: value })}
            placeholder={`Project proposal PDF\nBudget spreadsheet\nDean approval letter`}
          />
          <TextAreaField
            label="Optional Documents"
            icon={FilePlus}
            iconColor="text-gray-600"
            value={state.optional}
            onChange={(value) => onChange({ optional: value })}
            placeholder={`Letters of support`}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-600" />
          Evaluation Configuration
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Rubric Template
              </span>
              <Link
                href="/dashboard/admin/rubrics"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Manage templates
              </Link>
            </div>
            {templatesLoading ? (
              <p className="text-sm text-gray-500">Loading available templates…</p>
            ) : availableTemplates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No rubrics available yet. {" "}
                <Link href="/dashboard/admin/rubrics" className="font-semibold text-indigo-600">
                  Create a rubric template
                </Link>{" "}
                before publishing this call.
              </p>
            ) : (
              <>
                <select
                  value={state.rubricTemplateId || availableTemplates[0]._id}
                  onChange={(event) => onChange({ rubricTemplateId: event.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                >
                  {availableTemplates.map((template: any) => (
                    <option key={template._id} value={template._id as string}>
                      {template.name} (v{template.version ?? 1})
                    </option>
                  ))}
                </select>
                {selectedTemplate ? (
                  <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedTemplate.name}
                      </p>
                      <span className="text-xs font-semibold text-indigo-600">
                        Total weight: {totalWeight}%
                      </span>
                    </div>
                    {Math.abs(totalWeight - 100) > 0.5 && (
                      <p className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Weights do not sum to 100%.
                      </p>
                    )}
                    <div className="space-y-2">
                      {selectedTemplate.criteria.map((criterion: any) => (
                        <div
                          key={criterion._id}
                          className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{criterion.name}</p>
                            <p className="text-xs text-gray-500">
                              {criterion.description || "No description provided."}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-indigo-600">{criterion.weight}%</p>
                            <p className="text-xs text-gray-500">Max {criterion.maxScore} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
          <NumberField
            label="Evaluators Required *"
            icon={Users}
            iconColor="text-blue-600"
            value={state.evaluatorsRequired}
            onChange={(value) => onChange({ evaluatorsRequired: value })}
            min={1}
            required
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              Review Settings
            </span>
            <label className="flex items-center gap-3 bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                id="blindReview"
                type="checkbox"
                checked={state.blindReview}
                onChange={(event) => onChange({ blindReview: event.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-2"
              />
              <span className="text-sm font-medium text-gray-900">Enable Blind Review</span>
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              Assignment Method
            </span>
            <select
              value={state.assignmentMethod}
              onChange={(event) => onChange({ assignmentMethod: event.target.value as WizardState["documents"]["assignmentMethod"] })}
              className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            >
              {ASSIGNMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TextAreaField
            label="Evaluator Conflict Policies"
            icon={AlertTriangle}
            iconColor="text-orange-600"
            value={state.evaluationConflicts}
            onChange={(value) => onChange({ evaluationConflicts: value })}
            placeholder={`Evaluators must declare conflicts before viewing proposals.`}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ state, templates }: { state: WizardState; templates?: Array<any> }) {
  const payload = convertStateToPayload(state);
  const countdown = formatCountdown(payload.timeline.closeDate);
  const availableTemplates = templates ?? [];
  const templateName = payload.evaluation.rubricTemplateId
    ? availableTemplates.find(
        (template: any) => String(template._id) === payload.evaluation.rubricTemplateId
      )?.name ?? "Not configured"
    : "Not configured";

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Final Review</h3>
            <p className="text-sm text-gray-600">
              Review all call details below. You can navigate back to any step to make edits before publishing.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryCard title="Overview" icon={FileText} iconColor="text-blue-600">
          <SummaryItem label="Title" value={payload.overview.title} />
          <SummaryItem label="Project type" value={payload.overview.projectType} />
          <SummaryItem label="Target audience" value={payload.overview.targetAudience.join(", ") || "—"} />
          <SummaryItem label="Objectives" value={payload.overview.objectives.join("; ") || "—"} />
        </SummaryCard>
        <SummaryCard title="Timeline" icon={Calendar} iconColor="text-green-600">
          <SummaryItem label="Opens" value={formatDate(payload.timeline.openDate)} />
          <SummaryItem label="Closes" value={formatDate(payload.timeline.closeDate)} />
          <SummaryItem label="Decision" value={formatDate(payload.timeline.decisionDate)} />
          <SummaryItem label="Countdown" value={countdown} />
        </SummaryCard>
        <SummaryCard title="Budget" icon={DollarSign} iconColor="text-green-600">
          <SummaryItem label="Total" value={formatCurrency(payload.budget.total)} />
          <SummaryItem
            label="Per project"
            value={`${formatCurrency(payload.budget.perProject.min)} – ${formatCurrency(payload.budget.perProject.max)}`}
          />
          <SummaryItem label="Allowed categories" value={payload.budget.allowedCategories.join(", ") || "—"} />
        </SummaryCard>
        <SummaryCard title="Evaluation" icon={Settings} iconColor="text-purple-600">
          <SummaryItem label="Rubric template" value={templateName} />
          <SummaryItem label="Evaluators required" value={String(payload.evaluation.evaluatorsRequired)} />
          <SummaryItem label="Blind review" value={payload.evaluation.blindReview ? "Enabled" : "Disabled"} />
          <SummaryItem label="Assignment method" value={payload.evaluation.assignmentMethod} />
        </SummaryCard>
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconColor || "text-gray-600"}`} />}
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
        placeholder={placeholder}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  required,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconColor || "text-gray-600"}`} />}
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
        required={required}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-600" />
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
        required={required}
      />
    </label>
  );
}

function SummaryCard({
  title,
  children,
  icon: Icon,
  iconColor,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <div className="space-y-4 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-3">
        {Icon && <Icon className={`w-5 h-5 ${iconColor || "text-gray-600"}`} />}
        {title}
      </h3>
      <div className="space-y-3 text-sm text-gray-700">{children}</div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function validateStep(step: StepId, state: WizardState): ValidationResult {
  const errors: Record<string, string> = {};
  if (step === "overview") {
    if (!state.overview.title.trim()) errors.title = "Title is required";
    if (!state.overview.projectType.trim()) errors.projectType = "Project type is required";
    if (!state.overview.description.trim()) errors.description = "Description is required";
  }
  if (step === "timeline") {
    const open = state.timeline.openDate ? new Date(state.timeline.openDate).getTime() : NaN;
    const close = state.timeline.closeDate ? new Date(state.timeline.closeDate).getTime() : NaN;
    if (Number.isNaN(open) || Number.isNaN(close)) {
      errors.date = "Valid open and close dates are required";
    } else if (open >= close) {
      errors.date = "Close date must be after open date";
    }
    if (!state.timeline.budgetTotal) errors.budgetTotal = "Total budget is required";
    if (!state.timeline.budgetMin) errors.budgetMin = "Minimum per project is required";
    if (!state.timeline.budgetMax) errors.budgetMax = "Maximum per project is required";
    const min = Number(state.timeline.budgetMin || "0");
    const max = Number(state.timeline.budgetMax || "0");
    if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      errors.budgetRange = "Minimum per project cannot exceed maximum";
    }
  }
  if (step === "documents") {
    if (!state.documents.evaluatorsRequired.trim()) {
      errors.evaluatorsRequired = "Specify the number of evaluators";
    }
    if (!state.documents.rubricTemplateId) {
      errors.rubricTemplateId = "Select a rubric template before continuing";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function validateAll(state: WizardState): ValidationResult {
  const combinedErrors: Record<string, string> = {};
  const steps: StepId[] = ["overview", "timeline", "documents"];
  steps.forEach((step) => {
    const { valid, errors } = validateStep(step, state);
    if (!valid) {
      Object.assign(combinedErrors, errors);
    }
  });
  return { valid: Object.keys(combinedErrors).length === 0, errors: combinedErrors };
}

function convertStateToPayload(state: WizardState) {
  const parseList = (input: string) =>
    input
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseNumber = (value: string | undefined, fallback = 0) => {
    const parsed = Number(value ?? "");
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseDate = (value: string | undefined) => (value ? new Date(value).getTime() : undefined);

  return {
    overview: {
      title: state.overview.title.trim(),
      slug: state.overview.slug.trim() || undefined,
      description: state.overview.description.trim(),
      objectives: parseList(state.overview.objectives),
      projectType: state.overview.projectType.trim(),
      targetAudience: parseList(state.overview.targetAudience),
    },
    eligibility: {
      campuses: parseList(state.eligibility.campuses),
      departments: parseList(state.eligibility.departments),
      academicRanks: parseList(state.eligibility.academicRanks),
      qualifications: parseList(state.eligibility.qualifications),
      teamComposition:
        parseList(state.eligibility.teamRoles).length > 0 || state.eligibility.teamNotes.trim()
          ? {
              requiredRoles: parseList(state.eligibility.teamRoles),
              notes: state.eligibility.teamNotes.trim() || undefined,
              minTeamMembers: state.eligibility.teamMin ? Number(state.eligibility.teamMin) : undefined,
              maxTeamMembers: state.eligibility.teamMax ? Number(state.eligibility.teamMax) : undefined,
            }
          : undefined,
      conflictPolicies: parseList(state.eligibility.conflicts),
    },
    timeline: {
      openDate: parseDate(state.timeline.openDate) ?? Date.now(),
      closeDate: parseDate(state.timeline.closeDate) ?? Date.now() + dayMs * 30,
      evaluationStart: parseDate(state.timeline.evaluationStart),
      evaluationEnd: parseDate(state.timeline.evaluationEnd),
      decisionDate: parseDate(state.timeline.decisionDate),
      projectStart: parseDate(state.timeline.projectStart),
      projectEnd: parseDate(state.timeline.projectEnd),
      gracePeriodHours: state.timeline.gracePeriod ? Number(state.timeline.gracePeriod) : undefined,
    },
    budget: {
      total: parseNumber(state.timeline.budgetTotal),
      perProject: {
        min: parseNumber(state.timeline.budgetMin),
        max: parseNumber(state.timeline.budgetMax),
      },
      allowedCategories: parseList(state.timeline.budgetCategories),
      justificationThreshold: state.timeline.budgetThreshold
        ? Number(state.timeline.budgetThreshold)
        : undefined,
      notes: state.timeline.budgetNotes.trim() || undefined,
    },
    documents: {
      required: parseList(state.documents.required),
      optional: parseList(state.documents.optional),
      templateId: undefined,
      guidelinesId: undefined,
    },
    evaluation: {
      rubricTemplateId: state.documents.rubricTemplateId || undefined,
      evaluatorsRequired: Number(state.documents.evaluatorsRequired || "1"),
      blindReview: state.documents.blindReview,
      assignmentMethod: state.documents.assignmentMethod,
      conflictPolicies: parseList(state.documents.evaluationConflicts),
    },
    status: "draft" as const,
  };
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString();
}

function formatCountdown(closeDate: number) {
  const diff = closeDate - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.round(diff / dayMs);
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
