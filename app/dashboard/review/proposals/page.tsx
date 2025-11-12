"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  FileCheck,
  Calendar,
  Clock,
  User,
  Eye,
  Inbox,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under Review" },
  { id: "revise_and_resubmit", label: "Revise & Resubmit" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-indigo-100 text-indigo-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  revise_and_resubmit: "bg-orange-100 text-orange-800",
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ReviewProposalsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const proposals = useQuery(
    api.proposals.listProposalsForReview,
    user && (user.role === "sysadmin" || user.role === "admin" || user.role === "evaluator")
      ? {}
      : "skip"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // All hooks must be called before any conditional returns
  const filtered = useMemo(() => {
    if (!proposals) return [];
    if (statusFilter === "all") {
      return proposals;
    }
    return proposals.filter((proposal: any) => proposal.status === statusFilter);
  }, [statusFilter, proposals]);

  // Now handle loading state after all hooks
  if (proposals === undefined) {
    return (
      <div className="space-y-6">
        <header className="rounded-2xl bg-white shadow p-6 animate-pulse" />
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Tessellation - Orange/Amber colors from Kimia logo */}
      <TessellationHeader
        icon={FileCheck}
        title="Proposal Reviews"
        description="Monitor submissions, assign reviewers, and manage evaluation status across active calls."
        gradient="from-orange-500/60 via-amber-500/60 to-yellow-500/60"
        action={
          <Link
            href="/dashboard/calls"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
          >
            <Eye className="w-5 h-5" />
            View Calls
          </Link>
        }
      />

      {/* Enhanced Filter Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-indigo-50 px-8 py-20 text-center shadow-lg">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No proposals match this status</h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Adjust the filters above or check again once more submissions come in.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((proposal: any) => (
            <ProposalReviewCard key={proposal._id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalReviewCard({
  proposal,
}: {
  proposal: {
    _id: string;
    title: string;
    status: string;
    submittedAt?: number;
    updatedAt: number;
    call?: {
      title: string;
      slug?: string | null;
    } | null;
    principalInvestigator?: {
      name: string;
      email: string;
    } | null;
    assignedCount?: number;
  };
}) {
  const statusLabel = proposal.status.replace(/_/g, " ");
  const badgeClass = STATUS_STYLES[proposal.status] ?? "bg-gray-100 text-gray-700";

  const isApproved = proposal.status === "approved";
  const isRejected = proposal.status === "rejected";
  const isUnderReview = proposal.status === "under_review";
  const needsRevision = proposal.status === "revise_and_resubmit";

  const getStatusIcon = () => {
    if (isApproved) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (isRejected) return <XCircle className="w-4 h-4 text-red-600" />;
    if (needsRevision) return <RotateCcw className="w-4 h-4 text-orange-600" />;
    if (isUnderReview) return <AlertCircle className="w-4 h-4 text-indigo-600" />;
    return <Clock className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="group flex h-full flex-col justify-between rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg transition-all hover:shadow-2xl hover:scale-105 hover:border-indigo-300">
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize ${badgeClass} ring-2 ring-offset-2 ${
              isApproved ? "ring-emerald-300" : isRejected ? "ring-red-300" : "ring-gray-300"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              {isApproved
                ? "Approved"
                : isRejected
                ? "Rejected"
                : needsRevision
                ? "Needs Revision"
                : isUnderReview
                ? "Under Review"
                : "Submitted"}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
            {proposal.title}
          </h3>
          {proposal.call && (
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Call:</span>{" "}
              {proposal.call.slug ? (
                <Link
                  href={`/calls/${proposal.call.slug}`}
                  className="text-indigo-600 hover:text-indigo-700 underline decoration-indigo-200"
                >
                  {proposal.call.title}
                </Link>
              ) : (
                proposal.call.title
              )}
            </p>
          )}
          {typeof proposal.assignedCount === "number" && (
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Evaluators assigned:</span> {proposal.assignedCount}
            </p>
          )}
        </div>

        {/* PI Info */}
        {proposal.principalInvestigator && (
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{proposal.principalInvestigator.name}</p>
              <p className="text-xs text-gray-500">{proposal.principalInvestigator.email}</p>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-green-600" />
                Submitted
              </dt>
              <dd className="text-gray-900 font-medium text-xs">
                {proposal.submittedAt ? DATE_FORMAT.format(proposal.submittedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Updated
              </dt>
              <dd className="text-gray-900 font-medium text-xs">
                {DATE_FORMAT.format(proposal.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6">
        <Link
          href={`/dashboard/review/proposals/${proposal._id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
        >
          <Eye className="w-5 h-5" />
          Review Proposal
        </Link>
      </div>
    </div>
  );
}
