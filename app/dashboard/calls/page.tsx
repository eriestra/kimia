"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Briefcase,
  Plus,
  Search as SearchIcon,
  X,
  Calendar,
  Clock,
  Target,
  Users,
  DollarSign,
  Eye,
  Inbox,
  Megaphone,
  FileEdit,
  CheckCircle,
  Rocket,
  Flag,
  AlertCircle,
} from "lucide-react";

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-800",
  closed: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "archived", label: "Archived" },
] as const;

// Define the display order for status sections
const STATUS_DISPLAY_ORDER = ["draft", "open", "closed", "archived"];

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

function getLifecyclePhase(
  call: {
    openDate: number;
    closeDate: number;
    timeline: {
      evaluationStart?: number;
      evaluationEnd?: number;
      decisionDate?: number;
      projectStart?: number;
      projectEnd?: number;
    };
  },
  now: number
) {
  const { openDate, closeDate, timeline } = call;

  if (now < openDate) {
    return {
      label: "Upcoming",
      description: "Call not yet open for submissions",
      iconName: "clock" as const,
      colorClass: "text-indigo-600",
    };
  }

  if (now >= openDate && now < closeDate) {
    return {
      label: "Accepting Proposals",
      description: "Call is open for submissions",
      iconName: "megaphone" as const,
      colorClass: "text-green-600",
    };
  }

  if (timeline.evaluationStart && now >= closeDate && now < timeline.evaluationStart) {
    return {
      label: "Submissions Closed",
      description: "Waiting for evaluation to begin",
      iconName: "fileEdit" as const,
      colorClass: "text-yellow-600",
    };
  }

  if (timeline.evaluationEnd && now >= (timeline.evaluationStart || closeDate) && now < timeline.evaluationEnd) {
    return {
      label: "Under Evaluation",
      description: "Proposals are being reviewed",
      iconName: "checkCircle" as const,
      colorClass: "text-blue-600",
    };
  }

  if (timeline.decisionDate && now >= (timeline.evaluationEnd || closeDate) && now < timeline.decisionDate) {
    return {
      label: "Awaiting Decision",
      description: "Evaluation complete, decision pending",
      iconName: "target" as const,
      colorClass: "text-purple-600",
    };
  }

  if (timeline.projectStart && now >= (timeline.decisionDate || timeline.evaluationEnd || closeDate) && now < timeline.projectStart) {
    return {
      label: "Decision Announced",
      description: "Waiting for project execution to begin",
      iconName: "rocket" as const,
      colorClass: "text-indigo-600",
    };
  }

  if (timeline.projectEnd && now >= (timeline.projectStart || closeDate) && now < timeline.projectEnd) {
    return {
      label: "Project Execution",
      description: "Funded projects in progress",
      iconName: "rocket" as const,
      colorClass: "text-orange-600",
    };
  }

  if (timeline.projectEnd && now >= timeline.projectEnd) {
    return {
      label: "Project Completed",
      description: "All funded projects have concluded",
      iconName: "flag" as const,
      colorClass: "text-gray-600",
    };
  }

  return {
    label: "Submissions Closed",
    description: "No longer accepting proposals",
    iconName: "alertCircle" as const,
    colorClass: "text-red-600",
  };
}

export default function CallsDashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const calls = useQuery(api.calls.listCalls);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Extract values safely before any conditional returns
  const isAdmin = user ? user.role === "sysadmin" || user.role === "admin" : false;

  // All hooks must be called before conditional returns
  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    return calls
      .filter((call: typeof calls[number]) => {
        if (!isAdmin && call.status !== "open") {
          return false;
        }
        if (statusFilter !== "all" && call.status !== statusFilter) {
          return false;
        }
        if (!search.trim()) {
          return true;
        }
        const query = search.trim().toLowerCase();
        return (
          call.title.toLowerCase().includes(query) ||
          call.description.toLowerCase().includes(query) ||
          call.projectType.toLowerCase().includes(query)
        );
      })
      .sort((a: typeof calls[number], b: typeof calls[number]) => b.openDate - a.openDate);
  }, [calls, isAdmin, search, statusFilter]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, typeof filteredCalls> = {};
    filteredCalls.forEach((call: typeof filteredCalls[number]) => {
      groups[call.status] = groups[call.status] ? [...groups[call.status], call] : [call];
    });
    return groups;
  }, [filteredCalls]);

  // Now handle conditional returns after all hooks
  if (user === undefined || calls === undefined) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <ContentSkeleton />
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Tessellation - Blue/Cyan colors from Kimia logo */}
      <TessellationHeader
        icon={Briefcase}
        title="Funding Calls"
        description="Browse active opportunities and monitor their lifecycle across the Kimia platform."
        gradient="from-blue-500/60 via-cyan-500/60 to-teal-400/60"
        action={
          isAdmin ? (
            <Link
              href="/dashboard/calls/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Create New Call
            </Link>
          ) : undefined
        }
      />

      {/* Enhanced Filter Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <SearchIcon className="w-5 h-5" />
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search calls..."
              className="w-full rounded-xl border-2 border-gray-300 pl-11 pr-10 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        {filteredCalls.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50 px-8 py-20 text-center shadow-lg">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No calls found</h2>
            <p className="mt-2 text-gray-600 text-lg max-w-md mx-auto">
              {search
                ? "Adjust your search or filter criteria to see other calls."
                : isAdmin
                ? "Create a new call to start accepting proposals."
                : "Check back later for new opportunities."}
            </p>
            {isAdmin && (
              <Link
                href="/dashboard/calls/new"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create New Call
              </Link>
            )}
          </div>
        ) : (
          Object.entries(groupedByStatus)
            .sort(([a], [b]) => {
              const indexA = STATUS_DISPLAY_ORDER.indexOf(a);
              const indexB = STATUS_DISPLAY_ORDER.indexOf(b);
              return indexA - indexB;
            })
            .map(([status, callsForStatus]) => (
              <CallStatusSection
                key={status}
                status={status}
                calls={callsForStatus}
                isAdmin={isAdmin}
              />
            ))
        )}
      </section>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-6 w-40 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function renderPhaseIcon(iconName: string, colorClass: string) {
  const iconProps = { className: `w-4 h-4 ${colorClass}` };
  switch (iconName) {
    case "clock":
      return <Clock {...iconProps} />;
    case "megaphone":
      return <Megaphone {...iconProps} />;
    case "fileEdit":
      return <FileEdit {...iconProps} />;
    case "checkCircle":
      return <CheckCircle {...iconProps} />;
    case "target":
      return <Target {...iconProps} />;
    case "rocket":
      return <Rocket {...iconProps} />;
    case "flag":
      return <Flag {...iconProps} />;
    case "alertCircle":
      return <AlertCircle {...iconProps} />;
    default:
      return <Clock {...iconProps} />;
  }
}

type CallCardProps = {
  call: {
    _id: Id<"calls">;
    title: string;
    slug?: string | null;
    description: string;
    status: string;
    projectType: string;
    openDate: number;
    closeDate: number;
    timeline: {
      decisionDate?: number;
    };
    budget: {
      total: number;
      perProject: { min: number; max: number };
    };
    evaluationSettings: {
      evaluatorsRequired: number;
    };
    objectives: string[];
    targetAudience: string[];
  };
  isAdmin: boolean;
};

function CallCard({ call, isAdmin }: CallCardProps) {
  const statusStyle = STATUS_BADGES[call.status] ?? STATUS_BADGES.draft;
  const detailHref = call.slug ? `/calls/${call.slug}` : `/calls/${call._id}`;
  const updateCallStatus = useMutation(api.calls.updateCallStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Determine current lifecycle phase
  const now = Date.now();
  const phase = getLifecyclePhase(call, now);

  const handleStatusChange = async (newStatus: "draft" | "open" | "closed" | "archived") => {
    if (newStatus === call.status) return;

    setIsUpdatingStatus(true);
    try {
      await updateCallStatus({ callId: call._id, status: newStatus });
    } catch (error) {
      console.error("Failed to update call status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="group flex h-full flex-col justify-between rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg transition-all hover:shadow-2xl hover:scale-105 hover:border-blue-300">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <select
              value={call.status}
              onChange={(e) => handleStatusChange(e.target.value as "draft" | "open" | "closed" | "archived")}
              disabled={isUpdatingStatus}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${statusStyle} ring-2 ring-offset-2 ${
                call.status === 'open' ? 'ring-green-300' : 'ring-gray-300'
              } cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option value="draft">DRAFT</option>
              <option value="open">OPEN</option>
              <option value="closed">CLOSED</option>
              <option value="archived">ARCHIVED</option>
            </select>
          ) : (
            <span className={`rounded-full px-4 py-1.5 text-xs font-bold ${statusStyle} ring-2 ring-offset-2 ${
              call.status === 'open' ? 'ring-green-300' : 'ring-gray-300'
            }`}>
              {call.status.toUpperCase()}
            </span>
          )}
          <span className="rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-1.5 text-xs font-bold text-blue-700 ring-2 ring-blue-200 ring-offset-2">
            {call.projectType}
          </span>
        </div>

        {/* Lifecycle Phase Indicator */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            {renderPhaseIcon(phase.iconName, phase.colorClass)}
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Current Phase</span>
          </div>
          <p className="text-sm font-bold text-indigo-900">{phase.label}</p>
          <p className="text-xs text-indigo-700 mt-1">{phase.description}</p>

          {/* Evaluator Assignment Button (only for closed calls in Under Evaluation phase) */}
          {isAdmin && call.status === "closed" && phase.label === "Under Evaluation" && (
            <Link
              href={`/dashboard/calls/${call._id}/assignments`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-xs font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
            >
              <Users className="w-4 h-4" />
              Evaluator Assignment
            </Link>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{call.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{call.description}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-green-600" />
                Opens
              </dt>
              <dd className="text-gray-900 font-medium">{new Date(call.openDate).toLocaleDateString('es-CL')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-600" />
                Closes
              </dt>
              <dd className="text-gray-900 font-medium">{new Date(call.closeDate).toLocaleDateString('es-CL')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                Decision
              </dt>
              <dd className="text-gray-900 font-medium">
                {call.timeline.decisionDate
                  ? new Date(call.timeline.decisionDate).toLocaleDateString('es-CL')
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                Evaluators
              </dt>
              <dd className="text-gray-900 font-medium">{call.evaluationSettings.evaluatorsRequired}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="font-semibold">Budget:</span>
            <span>{formatCurrency(call.budget.perProject.min)} – {formatCurrency(call.budget.perProject.max)}</span>
          </div>
          <div className="flex items-start gap-2 text-gray-700">
            <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span className="font-semibold">For:</span>
            <span className="flex-1">{call.targetAudience.slice(0, 2).join(", ")}{call.targetAudience.length > 2 ? "…" : ""}</span>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <Link
          href={detailHref}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
        >
          <Eye className="w-5 h-5" />
          View Details
        </Link>
      </div>
    </div>
  );
}

type CallStatusSectionProps = {
  status: string;
  calls: CallCardProps["call"][];
  isAdmin: boolean;
};

function CallStatusSection({ status, calls, isAdmin }: CallStatusSectionProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{label} Calls</h2>
        <span className="text-sm text-gray-500">{calls.length} {calls.length === 1 ? "call" : "calls"}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {calls.map((call) => (
          <CallCard key={call._id} call={call} isAdmin={isAdmin} />
        ))}
      </div>
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
