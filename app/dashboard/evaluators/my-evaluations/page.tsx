"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import Link from "next/link";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

export default function MyEvaluationsPage() {
  const assignments = useQuery(api.evaluations.getMyAssignments);

  if (assignments === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow p-6 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const pending = assignments.filter((a: typeof assignments[0]) => a.status === "pending");
  const inProgress = assignments.filter((a: typeof assignments[0]) => a.status === "accepted" && !a.evaluation);
  const completed = assignments.filter((a: typeof assignments[0]) => a.evaluation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <TessellationHeader
        icon={ClipboardCheck}
        title="My Evaluations"
        description="Your assigned proposals and evaluation progress"
        gradient="from-blue-500/60 via-indigo-500/60 to-purple-500/60"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Clock}
          label="Pending Acceptance"
          value={pending.length}
          color="amber"
        />
        <SummaryCard
          icon={AlertCircle}
          label="In Progress"
          value={inProgress.length}
          color="blue"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Completed"
          value={completed.length}
          color="emerald"
        />
      </div>

      {/* Pending Acceptance */}
      {pending.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Pending Acceptance ({pending.length})
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {pending.map((assignment: typeof pending[0]) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                status="pending"
              />
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                In Progress ({inProgress.length})
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {inProgress.map((assignment: typeof inProgress[0]) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                status="in_progress"
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Completed ({completed.length})
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {completed.map((assignment: typeof completed[0]) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                status="completed"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignments.length === 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Evaluations Assigned
          </h3>
          <p className="text-sm text-gray-600">
            You don't have any proposals assigned for evaluation yet.
          </p>
        </div>
      )}
    </div>
  );
}

type SummaryCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "blue" | "amber" | "emerald";
};

function SummaryCard({ icon: Icon, label, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: "from-blue-100 to-blue-200 border-blue-200 text-blue-700",
    amber: "from-amber-100 to-amber-200 border-amber-200 text-amber-700",
    emerald: "from-emerald-100 to-emerald-200 border-emerald-200 text-emerald-700",
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br border p-6 shadow-md ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className="w-8 h-8 opacity-60" />
      </div>
    </div>
  );
}

type AssignmentCardProps = {
  assignment: {
    _id: string;
    proposalId: string;
    proposalTitle: string;
    callTitle: string;
    principalInvestigator: string;
    requestedBudget: number;
    assignedAt: number;
    deadline?: number;
    evaluation?: {
      status: string;
      submittedAt?: number;
      overallScore?: number;
    };
  };
  status: "pending" | "in_progress" | "completed";
};

function AssignmentCard({ assignment, status }: AssignmentCardProps) {
  const daysUntilDeadline = assignment.deadline
    ? Math.ceil((assignment.deadline - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 truncate">
              {assignment.proposalTitle}
            </h4>
            <StatusBadge status={status} />
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{assignment.callTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span>PI: {assignment.principalInvestigator}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
              </span>
            </div>
            {daysUntilDeadline !== null && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span
                  className={
                    daysUntilDeadline < 7
                      ? "text-red-600 font-medium"
                      : daysUntilDeadline < 14
                      ? "text-amber-600 font-medium"
                      : ""
                  }
                >
                  Due in {daysUntilDeadline} days
                </span>
              </div>
            )}
          </div>

          {assignment.evaluation && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-gray-700">
                  Submitted:{" "}
                  {assignment.evaluation.submittedAt
                    ? new Date(assignment.evaluation.submittedAt).toLocaleDateString()
                    : "Draft"}
                </span>
                {assignment.evaluation.overallScore !== undefined && (
                  <span className="ml-auto font-semibold text-gray-900">
                    Score: {assignment.evaluation.overallScore}/100
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <Link
            href={`/dashboard/review/proposals/${assignment.proposalId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            {status === "pending" ? "Review" : status === "completed" ? "View" : "Evaluate"}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "in_progress" | "completed" }) {
  const variants = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status]}`}
    >
      {labels[status]}
    </span>
  );
}
