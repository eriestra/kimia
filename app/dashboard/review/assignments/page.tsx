"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Users,
  ClipboardCheck,
  Clock,
} from "lucide-react";

type LaneId = "unassigned" | "pending" | "in_progress" | "submitted";

const LANE_CONFIG: Array<{
  id: LaneId;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    id: "unassigned",
    title: "Needs Assignment",
    description: "Proposals waiting for reviewers",
    accent: "from-amber-100 to-amber-200 border-amber-200",
  },
  {
    id: "pending",
    title: "Pending Acceptance",
    description: "Reviewers invited, awaiting response",
    accent: "from-blue-100 to-blue-200 border-blue-200",
  },
  {
    id: "in_progress",
    title: "Active Reviews",
    description: "Evaluations in progress",
    accent: "from-indigo-100 to-indigo-200 border-indigo-200",
  },
  {
    id: "submitted",
    title: "Completed",
    description: "Evaluations submitted",
    accent: "from-emerald-100 to-emerald-200 border-emerald-200",
  },
];

function formatDate(timestamp?: number | null) {
  if (!timestamp) return "--";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(timestamp);
}

export default function AssignmentBoardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const board = useQuery(
    api.proposals.listAssignmentBoard,
    user && (user.role === "sysadmin" || user.role === "admin") ? {} : "skip"
  );

  const lanes = useMemo(() => board?.lanes ?? null, [board?.lanes]);
  const isLoading = board === undefined || user === undefined;
  const isUnauthorized =
    user && !(user.role === "sysadmin" || user.role === "admin");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-20" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-2xl bg-white shadow p-6 animate-pulse h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (isUnauthorized || !lanes) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
        <h2 className="text-xl font-semibold">Access restricted</h2>
        <p className="mt-2 text-sm">Only Kimia administrators can manage evaluator assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TessellationHeader
        icon={Users}
        title="Evaluator Assignment Board"
        description="Track reviewer workload, reassign proposals, and monitor evaluation progress across every call."
        gradient="from-indigo-500/60 via-blue-500/60 to-emerald-500/60"
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow transition hover:bg-indigo-50">
            <ClipboardCheck className="w-4 h-4" />
            {String(Object.values(lanes).reduce((sum, column: any) => sum + column.length, 0))} assignments
          </div>
        }
      />

      <section className="overflow-x-auto">
        <div className="flex gap-4 min-h-[320px] pb-2">
          {LANE_CONFIG.map((lane) => {
            const items = lanes[lane.id] ?? [];
            return (
              <div
                key={lane.id}
                className={`min-w-[280px] flex-1 rounded-2xl border ${lane.accent} bg-gradient-to-br shadow-md`}
              >
                <header className="px-4 py-3 border-b border-white/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{lane.title}</h3>
                      <p className="text-xs text-gray-600">{lane.description}</p>
                    </div>
                    <span className="inline-flex items-center justify-center rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-gray-900">
                      {items.length}
                    </span>
                  </div>
                </header>
                <div className="px-4 py-4 space-y-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No assignments</p>
                  ) : (
                    items.map((assignment: any) => (
                      <AssignmentCard
                        key={`${assignment.proposalId}-${assignment.evaluator?.email ?? assignment.assignmentId}`}
                        assignment={assignment}
                        laneId={lane.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type AssignmentCardProps = {
  assignment: any;
  laneId: LaneId;
};

function AssignmentCard({ assignment, laneId }: AssignmentCardProps) {
  const evaluatorName = assignment.evaluator?.name ?? "Unassigned";
  const proposalId = assignment.proposalId as string;

  return (
    <article className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 space-y-3">
      <header className="space-y-1">
        <h4 className="text-sm font-semibold text-gray-900">{assignment.proposalTitle}</h4>
        <p className="text-xs text-gray-500">{assignment.callTitle}</p>
      </header>
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 space-y-1">
        <p className="font-medium">{evaluatorName}</p>
        <p className="text-gray-500">
          Assigned {formatDate(assignment.assignedAt)} · Status {assignment.assignmentStatus}
        </p>
        {assignment.declineReason && (
          <p className="text-red-600">Reason: {assignment.declineReason}</p>
        )}
        {assignment.coiDeclared && <p className="text-orange-600">COI declared</p>}
      </div>

      <footer className="flex flex-wrap gap-2 text-xs">
        {laneId === "unassigned" ? (
          <Link
            href={`/dashboard/calls/${assignment.callId}/assignments`}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-1 text-indigo-700 hover:bg-indigo-200"
          >
            <ClipboardCheck className="w-3 h-3" />
            Assign reviewers
          </Link>
        ) : (
          <Link
            href={`/dashboard/review/proposals/${proposalId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
          >
            View proposal
          </Link>
        )}
      </footer>
    </article>
  );
}
