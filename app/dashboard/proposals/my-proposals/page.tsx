"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
  Megaphone,
  ArrowRight,
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

export default function MyProposalsPage() {
  const proposals = useQuery(api.proposals.listMyProposals);
  const openCalls = useQuery(api.calls.listCalls, {
    status: "open"
  });

  const hasProposals = useMemo(() => (proposals ? proposals.length > 0 : false), [proposals]);
  const rows = useMemo(
    () =>
      proposals
        ? proposals.map((proposal: any) => ({
            ...proposal,
            updatedLabel: DATE_FORMAT.format(proposal.updatedAt),
            submittedLabel: proposal.submittedAt ? DATE_FORMAT.format(proposal.submittedAt) : "—",
            statusLabel: proposal.status.replace(/_/g, " "),
            badgeClass:
              STATUS_STYLES[proposal.status] ?? "bg-gray-100 text-gray-700",
          }))
        : [],
    [proposals]
  );

  const hasOpenCalls = useMemo(() => (openCalls ? openCalls.length > 0 : false), [openCalls]);

  if (proposals === undefined || openCalls === undefined) {
    return (
      <div className="space-y-6">
        <header className="rounded-2xl bg-white shadow p-6 animate-pulse" />
        <section className="rounded-2xl bg-white shadow p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded" />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <TessellationHeader
        icon={FileText}
        title="My Proposals"
        description="Submit proposals for open calls and track your submissions"
        gradient="from-purple-500/60 via-fuchsia-500/60 to-pink-500/60"
      />

      {/* Available Open Calls */}
      {hasOpenCalls && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Available Open Calls</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Select a call below to submit a new proposal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openCalls?.map((call: any) => (
              <Link
                key={call._id}
                href={`/dashboard/proposals/new?callId=${call._id}`}
                className="group border border-gray-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition">
                      {call.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Due: {new Date(call.closeDate || call.timeline?.closeDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      {(call.budget?.total || call.totalBudget) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${(call.budget?.total || call.totalBudget).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My Proposals Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Title
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
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {hasOpenCalls
                      ? "No proposals yet. Select an open call above to submit your first proposal!"
                      : "No proposals yet. Check back when new calls are opened."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr key={row._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {row.title}
                    </div>
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
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/proposals/${row._id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Link>
                      {row.status === "draft" && (
                        <Link
                          href={`/dashboard/proposals/new?edit=${row._id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Link>
                      )}
                    </div>
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
