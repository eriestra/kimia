"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  FileText,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
  Filter,
  User,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-indigo-100 text-indigo-800",
  approved: "bg-emerald-100 text-emerald-700",
  approved_with_modifications: "bg-purple-100 text-purple-800",
  rejected: "bg-red-100 text-red-700",
  revise_and_resubmit: "bg-orange-100 text-orange-800",
  in_execution: "bg-sky-100 text-sky-800",
  completed: "bg-gray-200 text-gray-700",
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function AllProposalsPage() {
  const proposals = useQuery(api.proposals.listAllProposals);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    if (statusFilter === "all") return proposals;
    return proposals.filter((p: any) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const rows = useMemo(
    () =>
      filteredProposals.map((proposal: any) => ({
        ...proposal,
        updatedLabel: DATE_FORMAT.format(proposal.updatedAt),
        submittedLabel: proposal.submittedAt ? DATE_FORMAT.format(proposal.submittedAt) : "—",
        statusLabel: proposal.status.replace(/_/g, " "),
        badgeClass:
          STATUS_STYLES[proposal.status] ?? "bg-gray-100 text-gray-700",
      })),
    [filteredProposals]
  );

  const stats = useMemo(() => {
    if (!proposals) return { total: 0, submitted: 0, underReview: 0, approved: 0 };
    return {
      total: proposals.length,
      submitted: proposals.filter((p: any) => p.status === "submitted").length,
      underReview: proposals.filter((p: any) => p.status === "under_review").length,
      approved: proposals.filter((p: any) => p.status === "approved" || p.status === "approved_with_modifications").length,
    };
  }, [proposals]);

  if (proposals === undefined) {
    return (
      <div className="space-y-6">
        <header className="rounded-2xl bg-white shadow p-6 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow p-6 animate-pulse h-24" />
          ))}
        </div>
        <section className="rounded-2xl bg-white shadow p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded" />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <TessellationHeader
        icon={FileText}
        title="All Proposals"
        description="Manage all proposals across the platform"
        gradient="from-indigo-500/60 via-purple-500/60 to-pink-500/60"
      />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} color="indigo" />
        <StatCard label="Submitted" value={stats.submitted} color="blue" />
        <StatCard label="Under Review" value={stats.underReview} color="amber" />
        <StatCard label="Approved" value={stats.approved} color="emerald" />
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="approved_with_modifications">Approved with Modifications</option>
            <option value="rejected">Rejected</option>
            <option value="revise_and_resubmit">Revise and Resubmit</option>
            <option value="in_execution">In Execution</option>
            <option value="completed">Completed</option>
          </select>
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  PI
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Call
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Budget
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    No proposals match the selected filters.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr key={row._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {row.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {row.principalInvestigatorName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {row.callTitle}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${row.budget?.total?.toLocaleString() ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${row.badgeClass}`}
                    >
                      {row.status === "approved" && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {row.status === "rejected" && (
                        <XCircle className="h-3 w-3" />
                      )}
                      {row.status === "under_review" && (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {row.updatedLabel}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/proposals/${row._id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    indigo: "from-indigo-100 to-indigo-200 border-indigo-200 text-indigo-700",
    blue: "from-blue-100 to-blue-200 border-blue-200 text-blue-700",
    amber: "from-amber-100 to-amber-200 border-amber-200 text-amber-700",
    emerald: "from-emerald-100 to-emerald-200 border-emerald-200 text-emerald-700",
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br border p-6 shadow-md ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
