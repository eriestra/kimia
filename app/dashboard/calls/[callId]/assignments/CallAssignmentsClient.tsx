"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import TessellationHeader from "@/components/TessellationHeader";
import {
  ArrowLeft,
  ClipboardCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  ChevronRight,
} from "lucide-react";

type CallAssignmentsClientProps = {
  callId: Id<"calls">;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(timestamp);
};

export default function CallAssignmentsClient({ callId }: CallAssignmentsClientProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "needs_assignment" | "partial" | "complete">("all");

  const overview = useQuery(
    api.proposals.getCallAssignmentOverview,
    callId ? { callId } : "skip"
  );

  // Filter proposals by assignment status
  const filteredProposals = useMemo(() => {
    if (!overview?.proposals) return [];
    if (filterStatus === "all") return overview.proposals;

    return overview.proposals.filter((proposal: any) => {
      const { assigned, required } = proposal.evaluationProgress;
      if (filterStatus === "needs_assignment") return assigned === 0;
      if (filterStatus === "partial") return assigned > 0 && assigned < required;
      if (filterStatus === "complete") return assigned >= required;
      return true;
    });
  }, [overview?.proposals, filterStatus]);

  if (overview === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
          ))}
        </div>
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-96" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
        <h2 className="text-xl font-semibold">Call Not Found</h2>
        <p className="mt-2 text-sm">The call you're looking for doesn't exist or you don't have access.</p>
      </div>
    );
  }

  const { call, budget, proposals, summary } = overview;

  const budgetUtilization = budget.total > 0 ? (budget.approved / budget.total) * 100 : 0;
  const isOverBudget = budget.approved > budget.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <TessellationHeader
        icon={ClipboardCheck}
        title={call.title}
        description="Manage proposal evaluation assignments and track budget allocation for this call"
        gradient="from-indigo-500/60 via-purple-500/60 to-pink-500/60"
        action={
          <Link
            href="/dashboard/calls"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow transition hover:bg-indigo-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calls
          </Link>
        }
      />

      {/* Budget Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700">Total Budget</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{formatCurrency(budget.total)}</p>
              <p className="mt-1 text-xs text-blue-600">Call ceiling</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-60" />
          </div>
        </div>

        {/* Approved Budget */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700">Approved Budget</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{formatCurrency(budget.approved)}</p>
              <p className="mt-1 text-xs text-emerald-600">Allocated to proposals</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-60" />
          </div>
        </div>

        {/* Available Budget */}
        <div className={`rounded-2xl bg-gradient-to-br border p-6 shadow-md ${
          isOverBudget
            ? "from-red-100 to-red-200 border-red-200"
            : "from-amber-100 to-amber-200 border-amber-200"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${isOverBudget ? "text-red-700" : "text-amber-700"}`}>
                {isOverBudget ? "Over Budget" : "Available"}
              </p>
              <p className={`mt-1 text-2xl font-bold ${isOverBudget ? "text-red-900" : "text-amber-900"}`}>
                {formatCurrency(Math.abs(budget.available))}
              </p>
              <p className={`mt-1 text-xs ${isOverBudget ? "text-red-600" : "text-amber-600"}`}>
                {isOverBudget ? "exceeds ceiling" : "remaining"}
              </p>
            </div>
            {isOverBudget ? (
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-60" />
            ) : (
              <TrendingUp className="w-8 h-8 text-amber-600 opacity-60" />
            )}
          </div>
        </div>

        {/* Budget Utilization */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-700">Utilization</p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{budgetUtilization.toFixed(0)}%</p>
              <p className="mt-1 text-xs text-indigo-600">of total budget</p>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-indigo-300" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - budgetUtilization / 100)}`}
                  className="text-indigo-600"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Proposal Overview</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Proposals ({proposals.length})</option>
              <option value="needs_assignment">Needs Assignment ({proposals.filter((p: any) => p.evaluationProgress.assigned === 0).length})</option>
              <option value="partial">Partial Assignment ({proposals.filter((p: any) => p.evaluationProgress.assigned > 0 && p.evaluationProgress.assigned < p.evaluationProgress.required).length})</option>
              <option value="complete">Fully Assigned ({proposals.filter((p: any) => p.evaluationProgress.assigned >= p.evaluationProgress.required).length})</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <FileText className="w-6 h-6 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Total Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalProposals}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700">Needs Assignment</p>
              <p className="text-2xl font-bold text-amber-900">{summary.needsAssignment}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">Fully Assigned</p>
              <p className="text-2xl font-bold text-emerald-900">{summary.fullyAssigned}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal List */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-lg">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Proposals in this Call
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredProposals.length} {filteredProposals.length === 1 ? "proposal" : "proposals"}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredProposals.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No proposals match the selected filter</p>
            </div>
          ) : (
            filteredProposals.map((proposal: any) => (
              <ProposalCard key={proposal._id} proposal={proposal} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type ProposalCardProps = {
  proposal: any;
};

function ProposalCard({ proposal }: ProposalCardProps) {
  const { assigned, required } = proposal.evaluationProgress;
  const isFullyAssigned = assigned >= required;
  const needsAssignment = assigned === 0;
  const isPartial = assigned > 0 && assigned < required;

  const statusConfig = proposal.status === "approved"
    ? { label: "Approved", color: "emerald", Icon: CheckCircle2 }
    : proposal.status === "under_review"
    ? { label: "Under Review", color: "blue", Icon: Clock }
    : proposal.status === "submitted"
    ? { label: "Submitted", color: "indigo", Icon: FileText }
    : { label: "Draft", color: "gray", Icon: FileText };

  const assignmentConfig = isFullyAssigned
    ? { label: "Fully Assigned", color: "emerald", Icon: CheckCircle2 }
    : needsAssignment
    ? { label: "Needs Assignment", color: "red", Icon: AlertTriangle }
    : { label: "Partial", color: "amber", Icon: AlertCircle };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-sm font-semibold text-gray-900">{proposal.title}</h4>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
              <statusConfig.Icon className="w-3 h-3" />
              {statusConfig.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-gray-400" />
              <span className="font-medium">PI:</span>
              <span>{proposal.principalInvestigator}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-gray-400" />
              <span className="font-medium">Budget:</span>
              <span>{formatCurrency(proposal.requestedBudget)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="font-medium">Submitted:</span>
              <span>{formatDate(proposal.submittedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-3 h-3 text-gray-400" />
              <span className="font-medium">Evaluators:</span>
              <span className={`font-semibold ${
                isFullyAssigned ? "text-emerald-600" : needsAssignment ? "text-red-600" : "text-amber-600"
              }`}>
                {assigned} / {required}
              </span>
            </div>
          </div>

          {/* Evaluator Assignment Status */}
          {proposal.assignedEvaluators.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Assigned Evaluators:</p>
              <div className="flex flex-wrap gap-2">
                {proposal.assignedEvaluators.map((evaluator: any) => (
                  <div
                    key={evaluator.evaluatorId}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      evaluator.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : evaluator.status === "declined"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    <span>{evaluator.name}</span>
                    <span className="text-xs opacity-60">({evaluator.status})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignment Badge & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-${assignmentConfig.color}-100 text-${assignmentConfig.color}-700`}>
            <assignmentConfig.Icon className="w-3 h-3" />
            {assignmentConfig.label}
          </span>

          <Link
            href={`/dashboard/review/proposals/${proposal._id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition"
          >
            Assign Evaluators
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
