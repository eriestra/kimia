"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Megaphone,
  FileEdit,
  Search,
  CheckCircle,
  Target,
  Rocket,
  Flag,
  Clock,
  Bookmark,
  Star,
  Calendar,
  Users,
  AlertCircle,
  FileText,
  Coins,
  HelpCircle,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "eligibility", label: "Eligibility", icon: Users },
  { id: "timeline_budget", label: "Timeline & Budget", icon: Calendar },
  { id: "documents_evaluation", label: "Documents & Evaluation", icon: FileEdit },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const;

type TabId = (typeof TABS)[number]["id"];

type CallDetailClientProps = {
  slug: string;
};

const dayMs = 1000 * 60 * 60 * 24;
const hourMs = 1000 * 60 * 60;

function formatRemainingTime(closeDate: number) {
  const now = Date.now();
  const diff = closeDate - now;
  if (diff <= 0) {
    return "Submission window closed";
  }
  const days = Math.floor(diff / dayMs);
  const hours = Math.floor((diff % dayMs) / hourMs);
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} remaining`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
}

export default function CallDetailClient({ slug }: CallDetailClientProps) {
  const router = useRouter();
  const detail = useQuery(api.calls.getCallDetail, { slug });
  const currentUser = useQuery(api.users.getCurrentUser);
  const setBookmark = useMutation(api.calls.setBookmark);
  const saveFaq = useMutation(api.calls.saveFaq);
  const deleteFaq = useMutation(api.calls.deleteFaq);

  // Check if user has a draft for this call
  const proposalDraft = useQuery(
    api.proposals.getProposalDraft,
    detail?.call?._id && currentUser ? { callId: detail.call._id } : "skip"
  );

  const [activeTab, setActiveTab] = useState<TabId>(TABS[0].id);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkError, setBookmarkError] = useState("");
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("");
  const [faqOrder, setFaqOrder] = useState("");
  const [faqSubmitting, setFaqSubmitting] = useState(false);
  const [faqError, setFaqError] = useState("");
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);

  // Compute values conditionally to avoid hook ordering issues
  const countdown = useMemo(
    () => (detail?.call ? formatRemainingTime(detail.call.closeDate) : ""),
    [detail?.call?.closeDate]
  );
  const closeDateLabel = useMemo(
    () => (detail?.call ? new Date(detail.call.closeDate).toLocaleDateString() : ""),
    [detail?.call?.closeDate]
  );
  const openDateLabel = useMemo(
    () => (detail?.call ? new Date(detail.call.openDate).toLocaleDateString() : ""),
    [detail?.call?.openDate]
  );

  const handleBookmarkToggle = async () => {
    if (!currentUser || !detail) {
      router.push(`/auth/login?next=${encodeURIComponent(`/calls/${slug}`)}`);
      return;
    }
    setBookmarkLoading(true);
    setBookmarkError("");
    try {
      await setBookmark({ callId: detail.call._id, bookmarked: !detail.isBookmarked });
    } catch (error) {
      setBookmarkError(
        error instanceof Error ? error.message : "Unable to update bookmark. Please try again."
      );
    } finally {
      setBookmarkLoading(false);
    }
  };

  const isLoading = detail === undefined;
  const isNotFound = detail === null;

  // Extract data safely - will be undefined/null during loading/not-found states
  const call = detail?.call;
  const faqs = detail?.faqs ?? [];
  const permissions = detail?.permissions;
  const stats = detail?.stats;
  const isBookmarked = detail?.isBookmarked ?? false;
  const isAdmin = permissions?.isAdmin ?? false;

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (isAdmin && editingFaqId === null && faqOrder === "" && faqs.length > 0) {
      setFaqOrder(String(faqs.length + 1));
    }
  }, [isAdmin, editingFaqId, faqOrder, faqs.length]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (isNotFound || !call) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Call Not Found</h1>
        <p className="mt-4 text-gray-600">
          The funding call you are looking for may have been removed or the link is incorrect.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/calls"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Calls
          </Link>
        </div>
      </div>
    );
  }

  const proposalLink = currentUser
    ? `/dashboard/proposals/new?callId=${call._id}`
    : `/auth/login?next=${encodeURIComponent(`/calls/${slug}`)}`;
  const canApply = call.status === "open" && Date.now() <= call.closeDate;

  const renderEligibility = () => {
    const { eligibility } = call;
    const team = eligibility.teamComposition;
    return (
      <div className="space-y-6">
        <EligibilityList title="Eligible campuses" values={eligibility.campuses} />
        <EligibilityList title="Eligible departments" values={eligibility.departments} />
        <EligibilityList title="Academic ranks" values={eligibility.academicRanks} />
        <EligibilityList title="Required qualifications" values={eligibility.qualifications} />
        {team && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Team composition</h4>
            <EligibilityList title="Required roles" values={team.requiredRoles} nested />
            {(team.minTeamMembers || team.maxTeamMembers) && (
              <p className="text-sm text-gray-600">
                Team size:
                {team.minTeamMembers ? ` min ${team.minTeamMembers}` : ""}
                {team.maxTeamMembers ? ` / max ${team.maxTeamMembers}` : ""}
              </p>
            )}
            {team.notes && <p className="text-sm text-gray-600">Note: {team.notes}</p>}
          </div>
        )}
        <EligibilityList title="Conflict of interest policies" values={eligibility.conflictPolicies} />
      </div>
    );
  };

  const renderTimeline = () => {
    const { timeline } = call;
    const now = Date.now();

    const milestones = [
      { label: "Call Opens", date: timeline.openDate, Icon: Megaphone },
      { label: "Submission Deadline", date: timeline.closeDate, Icon: FileEdit },
      { label: "Evaluation Starts", date: timeline.evaluationStart, Icon: Search },
      { label: "Evaluation Ends", date: timeline.evaluationEnd, Icon: CheckCircle },
      { label: "Decision Announced", date: timeline.decisionDate, Icon: Target },
      { label: "Project Starts", date: timeline.projectStart, Icon: Rocket },
      { label: "Project Ends", date: timeline.projectEnd, Icon: Flag },
    ].filter((m) => m.date); // Only show milestones with dates

    // Find current phase
    const currentPhaseIndex = milestones.findIndex((m, idx) => {
      if (now < m.date) return true;
      if (idx === milestones.length - 1 && now >= m.date) return true;
      return false;
    });

    return (
      <div className="space-y-6">
        {/* Horizontal Timeline Navigator */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full" />
          <div
            className="absolute top-8 left-0 h-1 bg-blue-600 rounded-full transition-all duration-500"
            style={{
              width: currentPhaseIndex >= 0
                ? `${(currentPhaseIndex / Math.max(milestones.length - 1, 1)) * 100}%`
                : '0%'
            }}
          />

          {/* Milestones */}
          <div className="relative flex justify-between">
            {milestones.map((milestone, idx) => {
              const isPast = now >= milestone.date;
              const isCurrent = idx === currentPhaseIndex;
              const IconComponent = milestone.Icon;

              return (
                <div
                  key={milestone.label}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / milestones.length}%` }}
                >
                  {/* Icon/Node */}
                  <div className="relative">
                    <div
                      className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isPast
                          ? 'bg-blue-600 text-white shadow-lg'
                          : isCurrent
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xl animate-[pulse_2s_ease-in-out_infinite]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      style={
                        isCurrent
                          ? {
                              animation: 'pulse-scale 2s ease-in-out infinite',
                            }
                          : undefined
                      }
                    >
                      <IconComponent className="w-7 h-7" />
                    </div>
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-2xl bg-blue-500 opacity-30 animate-[ping_2s_ease-in-out_infinite]" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-3 text-center px-2">
                    <p className={`text-xs font-semibold ${
                      isPast ? 'text-blue-700' : isCurrent ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {milestone.label}
                    </p>
                    <p className={`text-xs mt-1 ${
                      isPast ? 'text-gray-700' : isCurrent ? 'text-gray-900 font-medium' : 'text-gray-500'
                    }`}>
                      {new Date(milestone.date).toLocaleDateString('es-CL', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        {timeline.gracePeriodHours && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <span className="font-semibold">Grace Period:</span> {timeline.gracePeriodHours} hour{timeline.gracePeriodHours === 1 ? '' : 's'} available for approved technical issues after submission deadline.
          </div>
        )}

        {/* Mobile-friendly list fallback */}
        <div className="md:hidden space-y-2 mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline Details</p>
          {milestones.map((milestone) => (
            <div key={milestone.label} className="flex justify-between items-center text-sm py-2">
              <span className="font-medium text-gray-700">{milestone.label}</span>
              <span className="text-gray-600">
                {new Date(milestone.date).toLocaleDateString('es-CL')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBudget = () => {
    const { budget } = call;
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-600">Total allocation:</span>{" "}
            {formatCurrency(budget.total)}
          </p>
          <p>
            <span className="font-medium text-gray-600">Per project range:</span>{" "}
            {formatCurrency(budget.perProject.min)} – {formatCurrency(budget.perProject.max)}
          </p>
          {budget.justificationThreshold ? (
            <p>
              <span className="font-medium text-gray-600">Justification required for expenses above:</span>{" "}
              {formatCurrency(budget.justificationThreshold)}
            </p>
          ) : null}
        </div>
        <EligibilityList title="Allowed categories" values={budget.allowedCategories} />
        {budget.notes && <p className="text-sm text-gray-600">Notes: {budget.notes}</p>}
      </div>
    );
  };

  const renderDocuments = () => (
    <div className="space-y-6">
      <EligibilityList title="Required documents" values={call.documents.required} />
      <EligibilityList title="Optional documents" values={call.documents.optional} />
      <p className="text-xs text-gray-500">
        Templates and guideline files are managed separately by Kimia. Contact the administrator if you
        need access to an uploaded document.
      </p>
    </div>
  );

  const renderEvaluation = () => {
    const { evaluationSettings } = call;
    const assignmentLabels: Record<string, string> = {
      manual: "Manual assignment",
      auto_balanced: "Auto-balanced",
      ai_matched: "AI-assisted matching",
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-600">Evaluators per proposal:</span>{" "}
          {evaluationSettings.evaluatorsRequired}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-600">Assignment method:</span>{" "}
          {assignmentLabels[evaluationSettings.assignmentMethod] ?? evaluationSettings.assignmentMethod}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-600">Blind review:</span>{" "}
          {evaluationSettings.blindReview ? "Enabled" : "Disabled"}
        </p>
        <EligibilityList title="Evaluator conflict policies" values={evaluationSettings.conflictPolicies} />
        <p className="text-xs text-gray-500">
          Detailed rubric descriptors are visible to evaluators during the review process.
        </p>
      </div>
    );
  };

  const renderFaq = () => (
    <FaqSection
      faqs={faqs}
      isAdmin={isAdmin}
      editingFaqId={editingFaqId}
      faqQuestion={faqQuestion}
      faqAnswer={faqAnswer}
      faqCategory={faqCategory}
      faqOrder={faqOrder}
      faqSubmitting={faqSubmitting}
      faqError={faqError}
      deletingFaqId={deletingFaqId}
      onQuestionChange={setFaqQuestion}
      onAnswerChange={setFaqAnswer}
      onCategoryChange={setFaqCategory}
      onOrderChange={setFaqOrder}
      onEdit={(faq) => {
        setEditingFaqId(faq._id);
        setFaqQuestion(faq.question);
        setFaqAnswer(faq.answer);
        setFaqCategory(faq.category ?? "");
        setFaqOrder(String(faq.order ?? ""));
        setFaqError("");
      }}
      onCancelEdit={() => {
        setEditingFaqId(null);
        setFaqQuestion("");
        setFaqAnswer("");
        setFaqCategory("");
        setFaqOrder(String(faqs.length + 1));
        setFaqError("");
      }}
      onDelete={async (faqId) => {
        if (!confirm("Delete this FAQ?")) {
          return;
        }
        setDeletingFaqId(faqId);
        try {
          await deleteFaq({ faqId });
          if (editingFaqId === faqId) {
            setEditingFaqId(null);
            setFaqQuestion("");
            setFaqAnswer("");
            setFaqCategory("");
            setFaqOrder(String(Math.max(faqs.length - 1, 1)));
          }
        } finally {
          setDeletingFaqId(null);
        }
      }}
      onSubmit={async () => {
        if (!faqQuestion.trim() || !faqAnswer.trim()) {
          setFaqError("Question and answer are required");
          return;
        }
        const orderNumber = faqOrder ? Number(faqOrder) : undefined;
        if (faqOrder && Number.isNaN(orderNumber)) {
          setFaqError("FAQ order must be a number");
          return;
        }
        setFaqSubmitting(true);
        setFaqError("");
        try {
          await saveFaq({
            callId: call._id,
            faqId: editingFaqId ?? undefined,
            question: faqQuestion,
            answer: faqAnswer,
            category: faqCategory || undefined,
            order: orderNumber,
          });
          setEditingFaqId(null);
          setFaqQuestion("");
          setFaqAnswer("");
          setFaqCategory("");
          setFaqOrder(String(faqs.length + 1));
        } catch (error) {
          setFaqError(error instanceof Error ? error.message : "Failed to save FAQ");
        } finally {
          setFaqSubmitting(false);
        }
      }}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TessellationHeader for Consistency */}
        <header className="relative rounded-2xl shadow-xl p-6 sm:p-8 text-white overflow-hidden">
          {/* Tessellation Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/60 via-indigo-500/60 to-purple-500/60 opacity-95" />

          {/* Content */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg break-words leading-tight">{call.title}</h1>
                <p className="text-white/90 text-sm sm:text-base lg:text-lg drop-shadow-md">{call.description}</p>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                call.status === 'open'
                  ? 'bg-green-500 text-white'
                  : 'bg-white/90 text-gray-700'
              }`}>
                {call.status.toUpperCase()}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
                {call.projectType}
              </span>
              {call.status === "open" && countdown && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-bold text-yellow-900 shadow-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {countdown}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-8">
        {/* Key Information Card */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 space-y-6">
            {/* Key Dates Bar */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-600">Opens:</span>
                <span className="font-semibold text-gray-900">{openDateLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-600">Deadline:</span>
                <span className="font-semibold text-gray-900">{closeDateLabel}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {call.status === "open" ? (
                <Link
                  href={proposalLink}
                  aria-disabled={!canApply}
                  onClick={(event) => {
                    if (!canApply) {
                      event.preventDefault();
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold shadow-lg transition-all ${
                    canApply
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:from-blue-700 hover:to-indigo-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Rocket className="w-5 h-5" />
                  {canApply
                    ? (proposalDraft?.draft ? "Resume Proposal" : "Start Proposal")
                    : "Submission Closed"}
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-6 py-3 text-base font-medium text-gray-500">
                  Applications Closed
                </span>
              )}
              <button
                type="button"
                onClick={handleBookmarkToggle}
                disabled={bookmarkLoading}
                className={`inline-flex items-center gap-2 rounded-lg border-2 px-6 py-3 text-base font-medium transition-all ${
                  isBookmarked
                    ? 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                } disabled:opacity-50`}
              >
                {bookmarkLoading ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : isBookmarked ? (
                  <>
                    <Star className="w-5 h-5 fill-current" />
                    Bookmarked
                  </>
                ) : (
                  <>
                    <Bookmark className="w-5 h-5" />
                    Bookmark
                  </>
                )}
              </button>
              {(stats.bookmarkCount ?? 0) > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  {stats.bookmarkCount} {stats.bookmarkCount === 1 ? "person has" : "people have"} bookmarked this
                </span>
              )}
            </div>
            {bookmarkError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                ⚠️ {bookmarkError}
              </p>
            )}
          </div>
        </section>
        {/* Target Audience Highlight */}
        {call.targetAudience.length > 0 && (
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-3">Target Audience</h3>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {call.targetAudience.map((audience: string, index: number) => (
                    <li key={`${call._id}-audience-${index}`} className="flex items-center gap-2 text-blue-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      {audience}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Admin Stats Dashboard */}
        {isAdmin && (
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Proposals Submitted</p>
                  <p className="text-4xl font-bold text-green-900 mt-1">{stats.proposalCount ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Star className="w-7 h-7 text-white fill-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Bookmarks</p>
                  <p className="text-4xl font-bold text-purple-900 mt-1">{stats.bookmarkCount}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Enhanced Tab Navigation */}
        <section className="space-y-6">
          <nav className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6" aria-label="Call detail sections">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full hidden lg:block" />
              <div
                className="absolute top-8 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 hidden lg:block"
                style={{
                  width: `${(TABS.findIndex((t) => t.id === activeTab) / (TABS.length - 1)) * 100}%`
                }}
              />

              {/* Tab Items */}
              <ol className="relative grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const IconComponent = tab.icon;

                  return (
                    <li key={tab.id} className="flex flex-col items-center text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className="w-full flex flex-col items-center group"
                      >
                        {/* Icon/Node */}
                        <div
                          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                            isActive
                              ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl scale-110 ring-4 ring-blue-200"
                              : "bg-gray-100 text-gray-400 scale-90 group-hover:bg-gray-200 group-hover:scale-100"
                          }`}
                        >
                          <IconComponent className="w-7 h-7" />
                        </div>

                        {/* Label */}
                        <div className="mt-3">
                          <p className={`text-sm font-semibold ${
                            isActive ? "text-blue-600" : "text-gray-700 group-hover:text-gray-900"
                          }`}>
                            {tab.label}
                          </p>
                          {isActive && (
                            <p className="text-xs text-blue-600 font-medium mt-1">Current Section</p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>

          {/* Content Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
            {activeTab === "overview" && (
              <div className="space-y-4 text-sm text-gray-700">
                <EligibilityList title="Objectives" values={call.objectives} />
                <EligibilityList title="Target audience" values={call.targetAudience} />
              </div>
            )}
            {activeTab === "eligibility" && renderEligibility()}
            {activeTab === "timeline_budget" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Timeline
                  </h3>
                  {renderTimeline()}
                </div>
                <div className="pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-green-600" />
                    Budget
                  </h3>
                  {renderBudget()}
                </div>
              </div>
            )}
            {activeTab === "documents_evaluation" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Documents
                  </h3>
                  {renderDocuments()}
                </div>
                <div className="pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    Evaluation
                  </h3>
                  {renderEvaluation()}
                </div>
              </div>
            )}
            {activeTab === "faq" && renderFaq()}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

type EligibilityListProps = {
  title: string;
  values?: string[] | null;
  nested?: boolean;
};

function EligibilityList({ title, values, nested = false }: EligibilityListProps) {
  if (!values || values.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className={`text-sm font-medium ${nested ? "text-gray-600" : "text-gray-700"}`}>{title}</h4>
      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
        {values.map((value, index) => (
          <li key={`${title}-${index}`}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

type FaqSectionProps = {
  faqs: Array<{
    _id: string;
    question: string;
    answer: string;
    order?: number;
    category?: string | null;
  }>;
  isAdmin: boolean;
  editingFaqId: string | null;
  faqQuestion: string;
  faqAnswer: string;
  faqCategory: string;
  faqOrder: string;
  faqSubmitting: boolean;
  faqError: string;
  deletingFaqId: string | null;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onOrderChange: (value: string) => void;
  onEdit: (faq: FaqSectionProps["faqs"][number]) => void;
  onCancelEdit: () => void;
  onDelete: (faqId: string) => Promise<void> | void;
  onSubmit: () => Promise<void> | void;
};

function FaqSection({
  faqs,
  isAdmin,
  editingFaqId,
  faqQuestion,
  faqAnswer,
  faqCategory,
  faqOrder,
  faqSubmitting,
  faqError,
  deletingFaqId,
  onQuestionChange,
  onAnswerChange,
  onCategoryChange,
  onOrderChange,
  onEdit,
  onCancelEdit,
  onDelete,
  onSubmit,
}: FaqSectionProps) {
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <p className="text-sm text-gray-600">
            No frequently asked questions have been published yet.
          </p>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq._id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">{faq.question}</h4>
                <p className="mt-2 text-sm text-gray-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <p className="text-sm text-gray-600">
            No FAQs yet. Add the first one below to help applicants.
          </p>
        ) : (
          faqs.map((faq) => (
            <div key={faq._id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Order {faq.order ?? "—"}</span>
                    {faq.category ? <span>• {faq.category}</span> : null}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{faq.question}</h4>
                  <p className="mt-2 text-sm text-gray-700">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(faq)}
                    className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(faq._id)}
                    className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    disabled={deletingFaqId === faq._id}
                  >
                    {deletingFaqId === faq._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">
          {editingFaqId ? "Editing FAQ" : "Add a new FAQ"}
        </p>
        <p className="mt-1 text-xs">
          FAQs appear in the applicant view immediately. Use them to clarify eligibility, documents, and deadlines.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Question</span>
            <input
              value={faqQuestion}
              onChange={(event) => onQuestionChange(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Who is eligible to apply?"
              required
            />
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Answer</span>
            <textarea
              value={faqAnswer}
              onChange={(event) => onAnswerChange(event.target.value)}
              rows={4}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Faculty from all campuses with active teaching assignments are eligible."
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Category (optional)</span>
            <input
              value={faqCategory}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Eligibility"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Display order</span>
            <input
              value={faqOrder}
              onChange={(event) => onOrderChange(event.target.value)}
              type="number"
              min={1}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>
        {faqError && <p className="text-sm text-red-600">{faqError}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={faqSubmitting}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {faqSubmitting ? "Saving..." : editingFaqId ? "Update FAQ" : "Add FAQ"}
          </button>
          {editingFaqId && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
