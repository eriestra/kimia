"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Target,
  ClipboardList,
  Wallet,
  Gauge,
  Download,
  Rocket,
  ClipboardCheck,
  Star,
  MessageSquare,
  TrendingUp,
  Edit,
} from "lucide-react";
import TessellationHeader from "@/components/TessellationHeader";

type PageProps = {
  params: Promise<{ proposalId: Id<"proposals"> }>;
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string; bgClass: string; textClass: string }> = {
  draft: { color: "amber", icon: Clock, label: "Draft", bgClass: "bg-amber-100", textClass: "text-amber-800" },
  submitted: { color: "blue", icon: CheckCircle, label: "Submitted", bgClass: "bg-blue-100", textClass: "text-blue-800" },
  under_review: { color: "indigo", icon: AlertCircle, label: "Under Review", bgClass: "bg-indigo-100", textClass: "text-indigo-800" },
  approved: { color: "emerald", icon: CheckCircle, label: "Approved", bgClass: "bg-emerald-100", textClass: "text-emerald-700" },
  rejected: { color: "red", icon: XCircle, label: "Rejected", bgClass: "bg-red-100", textClass: "text-red-700" },
  in_execution: { color: "sky", icon: CheckCircle, label: "In Execution", bgClass: "bg-sky-100", textClass: "text-sky-800" },
  completed: { color: "gray", icon: CheckCircle, label: "Completed", bgClass: "bg-gray-200", textClass: "text-gray-700" },
};

const TABS = [
  { id: "basic", title: "Basic Info", icon: Target },
  { id: "objectives", title: "Objectives", icon: ClipboardList },
  { id: "timeline", title: "Timeline", icon: Calendar },
  { id: "budget", title: "Budget", icon: Wallet },
  { id: "team", title: "Team", icon: Users },
  { id: "impact", title: "Impact", icon: Gauge },
  { id: "evaluations", title: "Evaluations", icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProposalDetailPage({ params }: PageProps) {
  const { proposalId } = use(params);
  const data = useQuery(api.proposals.getProposalDetail, { proposalId });
  const evaluationsData = useQuery(api.proposals.getProposalEvaluationsForOwner, { proposalId });
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h2>
          <p className="text-gray-600 mb-6">The proposal you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link
            href="/dashboard/proposals/my-proposals"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Proposals
          </Link>
        </div>
      </div>
    );
  }

  // Destructure the nested response
  const { proposal, call, principalInvestigator, teamMembers } = data;

  const statusConfig = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <TessellationHeader
        title={proposal.title}
        description={`Proposal for ${call?.title || "funding call"}`}
        icon={FileText}
        gradient="from-purple-600/50 to-pink-600/50"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Button */}
        <div>
          <Link
            href="/dashboard/proposals/my-proposals"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Proposals
          </Link>
        </div>

        {/* Proposal Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{proposal.title}</h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bgClass} ${statusConfig.textClass} rounded-full text-xs font-medium`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </div>
                {/* Show project link if approved or in execution */}
                {(proposal.status === "approved" || proposal.status === "in_execution" || proposal.status === "completed") && (
                  <Link
                    href={`/dashboard/projects/${proposalId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    View Project Execution
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Principal Investigator</p>
                    <p className="text-sm font-medium text-gray-900">
                      {principalInvestigator?.name || "You"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Funding Call</p>
                    <p className="text-sm font-medium text-gray-900">{call?.title || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Total Budget</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${proposal.budget?.total?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Submitted On</p>
                <p className="font-medium text-gray-900">
                  {proposal.submittedAt
                    ? new Date(proposal.submittedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not yet submitted"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {proposal.updatedAt
                    ? new Date(proposal.updatedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                      isActive
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.title}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Basic Information Tab */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h3>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Abstract</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.abstract}</p>
                  </div>

                  {proposal.problemStatement && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Problem Statement</label>
                      <p className="text-gray-700 whitespace-pre-wrap">{proposal.problemStatement}</p>
                    </div>
                  )}

                  {proposal.keywords && proposal.keywords.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                      <div className="flex flex-wrap gap-2">
                        {proposal.keywords.map((keyword: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Objectives & Methodology Tab */}
            {activeTab === "objectives" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Objectives</h3>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">General Objective</label>
                    <p className="text-gray-700">{proposal.generalObjective}</p>
                  </div>

                  {proposal.specificObjectives && proposal.specificObjectives.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specific Objectives</label>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {proposal.specificObjectives.map((obj: string, idx: number) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Methodology</h3>

                  {proposal.methodology && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Methodology Overview</label>
                      <p className="text-gray-700 whitespace-pre-wrap">{proposal.methodology}</p>
                    </div>
                  )}

                  {proposal.researchDesign && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Research Design</label>
                      <p className="text-gray-700 whitespace-pre-wrap">{proposal.researchDesign}</p>
                    </div>
                  )}

                  {proposal.dataCollection && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Collection</label>
                      <p className="text-gray-700 whitespace-pre-wrap">{proposal.dataCollection}</p>
                    </div>
                  )}

                  {proposal.analysisPlan && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Plan</label>
                      <p className="text-gray-700 whitespace-pre-wrap">{proposal.analysisPlan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === "timeline" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline & Milestones</h3>

                {proposal.timeline && proposal.timeline.length > 0 ? (
                  <div className="space-y-4">
                    {proposal.timeline.map((milestone: any, idx: number) => {
                      const isPast = new Date(milestone.deadline) < new Date();

                      return (
                        <div
                          key={idx}
                          className={`border rounded-lg p-4 ${
                            isPast ? "border-gray-300 bg-gray-50" : "border-purple-200 bg-purple-50/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-8 h-8 rounded-full border-2 border-purple-500 bg-white flex items-center justify-center">
                                <span className="text-sm font-semibold text-purple-600">{idx + 1}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold text-gray-900">{milestone.milestone}</h4>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className={isPast ? "text-gray-500" : "text-purple-700 font-medium"}>
                                    {new Date(milestone.deadline).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric"
                                    })}
                                  </span>
                                </div>
                              </div>

                              {milestone.deliverables && milestone.deliverables.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                    Deliverables
                                  </p>
                                  <ul className="space-y-1">
                                    {milestone.deliverables.map((deliverable: string, dIdx: number) => (
                                      <li key={dIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>{deliverable}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {milestone.successCriteria && (
                                <div className="bg-white rounded-lg p-3 border border-purple-200">
                                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                                    Success Criteria
                                  </p>
                                  <p className="text-sm text-gray-700">{milestone.successCriteria}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600">No timeline information provided.</p>
                )}
              </div>
            )}

            {/* Budget Tab */}
            {activeTab === "budget" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Breakdown</h3>

                {proposal.budget?.items && proposal.budget.items.length > 0 ? (
                  <div>
                    <div className="space-y-3 mb-6">
                      {proposal.budget.items.map((item: any, idx: number) => {
                        const amount = item.amount || (item.quantity * item.unitCost);
                        return (
                          <div key={idx} className="pb-4 border-b border-gray-100 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{item.category}</p>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                                {item.quantity && item.unitCost && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Quantity: {item.quantity} × ${item.unitCost.toLocaleString()} per unit
                                  </p>
                                )}
                                {item.justification && (
                                  <p className="text-xs text-gray-600 mt-2 italic">{item.justification}</p>
                                )}
                              </div>
                              <span className="text-lg font-bold text-gray-900 ml-4">${amount.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-900">Total Budget</span>
                        <span className="text-3xl font-bold text-purple-600">
                          ${proposal.budget.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {proposal.budget?.narrative && (
                      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-semibold text-purple-900 mb-2">Budget Justification</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.budget.narrative}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No budget information provided.</p>
                )}
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Team</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-600 rounded-full p-2">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-purple-900">Principal Investigator</p>
                        <p className="text-gray-900 font-medium">{principalInvestigator?.name || "You"}</p>
                      </div>
                    </div>
                  </div>

                  {teamMembers && teamMembers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Team Members ({teamMembers.length})</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {teamMembers.map((member: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-600">{member.role || "Team Member"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!teamMembers || teamMembers.length === 0) && (
                    <p className="text-gray-600 text-sm">No additional team members listed.</p>
                  )}
                </div>

                {/* Attachments */}
                {proposal.attachments && proposal.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Supporting Documents</h4>
                    <div className="space-y-2">
                      {proposal.attachments.map((attachment: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{attachment.name || `Document ${idx + 1}`}</span>
                          </div>
                          <button className="text-purple-600 hover:text-purple-700 transition">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Impact Tab */}
            {activeTab === "impact" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected Impact & Outcomes</h3>

                {proposal.expectedImpact && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Impact</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.expectedImpact}</p>
                  </div>
                )}

                {proposal.beneficiaries && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiaries</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.beneficiaries}</p>
                  </div>
                )}

                {proposal.disseminationPlan && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dissemination Plan</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.disseminationPlan}</p>
                  </div>
                )}

                {proposal.sustainabilityPlan && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sustainability Plan</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.sustainabilityPlan}</p>
                  </div>
                )}

                {!proposal.expectedImpact && !proposal.beneficiaries && !proposal.disseminationPlan && !proposal.sustainabilityPlan && (
                  <p className="text-gray-600">No impact information provided.</p>
                )}
              </div>
            )}

            {/* Evaluations Tab */}
            {activeTab === "evaluations" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Results</h3>

                {evaluationsData === undefined ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading evaluations...</p>
                  </div>
                ) : evaluationsData === null || !evaluationsData.canView ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                    <Clock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                    <p className="text-amber-800 font-medium">
                      {evaluationsData?.reason || "Evaluations will be visible after submission"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <p className="text-xs font-medium text-blue-900">Progress</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          {evaluationsData.summary.completedCount} / {evaluationsData.summary.requiredEvaluations}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">Evaluations Completed</p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-medium text-purple-900">Average Score</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">
                          {evaluationsData.summary.averageScore !== null
                            ? `${evaluationsData.summary.averageScore.toFixed(1)}%`
                            : "--"}
                        </p>
                        <p className="text-xs text-purple-700 mt-1">Overall Rating</p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-medium text-green-900">Recommendations</p>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                          {evaluationsData.summary.recommendationCounts?.approve || 0}
                        </p>
                        <p className="text-xs text-green-700 mt-1">Approve</p>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-amber-600" />
                          <p className="text-xs font-medium text-amber-900">Clarifications</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-900">
                          {evaluationsData.clarifications.filter((c: any) => c.status === "pending").length}
                        </p>
                        <p className="text-xs text-amber-700 mt-1">Pending Responses</p>
                      </div>
                    </div>

                    {/* Clarification Requests */}
                    {evaluationsData.clarifications.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Clarification Requests</h4>
                        <div className="space-y-3">
                          {evaluationsData.clarifications.map((clarification: any) => (
                            <div
                              key={clarification._id}
                              className={`border rounded-lg p-4 ${
                                clarification.status === "pending"
                                  ? "border-amber-300 bg-amber-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    From: {clarification.evaluatorName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(clarification.requestedAt).toLocaleDateString()}
                                    {clarification.requestCategory && (
                                      <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                        {clarification.requestCategory}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    clarification.status === "pending"
                                      ? "bg-amber-100 text-amber-800"
                                      : clarification.status === "responded"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {clarification.status === "pending"
                                    ? "Needs Response"
                                    : clarification.status === "responded"
                                    ? "Responded"
                                    : "Resolved"}
                                </span>
                              </div>

                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Request:</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{clarification.requestText}</p>
                              </div>

                              {clarification.responseText && (
                                <div className="bg-white border border-gray-200 rounded p-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Your Response:</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{clarification.responseText}</p>
                                  {clarification.responseAttachments && clarification.responseAttachments.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-600 mb-1">Attachments:</p>
                                      {clarification.responseAttachments.map((att: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                          <FileText className="w-3 h-3" />
                                          <span>{att.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {clarification.status === "pending" && (
                                <div className="mt-3">
                                  <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                                    Respond to Request
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Individual Evaluations */}
                    {evaluationsData.evaluations.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">
                          Completed Evaluations ({evaluationsData.evaluations.length})
                        </h4>
                        <div className="space-y-4">
                          {evaluationsData.evaluations.map((evaluation: any) => (
                            <div key={evaluation._id} className="border border-gray-200 rounded-lg p-5 bg-white">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <p className="font-semibold text-gray-900">{evaluation.evaluatorName}</p>
                                  <p className="text-xs text-gray-500">
                                    Submitted {new Date(evaluation.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-purple-600">{evaluation.overallScore.toFixed(1)}%</p>
                                  <p className="text-xs text-gray-600 capitalize">
                                    {evaluation.recommendation.replace(/_/g, " ")}
                                  </p>
                                </div>
                              </div>

                              {evaluation.publicComments && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">Public Feedback:</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{evaluation.publicComments}</p>
                                </div>
                              )}

                              {/* Rubric Scores */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Criterion Scores:</p>
                                {evaluation.rubric.map((r: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">Criterion {idx + 1}</span>
                                    <span className="font-medium text-gray-900">
                                      {r.score} / {r.maxScore}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evaluationsData.evaluations.length === 0 && evaluationsData.clarifications.length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No evaluations have been submitted yet.</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {evaluationsData.summary.inProgressCount > 0
                            ? `${evaluationsData.summary.inProgressCount} evaluation(s) in progress`
                            : "Evaluators will review your proposal soon."}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
