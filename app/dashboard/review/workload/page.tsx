"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(timestamp);
};

export default function EvaluatorWorkloadPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEvaluator, setExpandedEvaluator] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"workload" | "name" | "completion">("workload");

  const overview = useQuery(api.proposals.getEvaluatorWorkloadOverview);

  const filteredAndSortedEvaluators = useMemo(() => {
    if (!overview?.evaluators) return [];

    let filtered = overview.evaluators;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e: any) =>
          e.name.toLowerCase().includes(query) ||
          e.email.toLowerCase().includes(query) ||
          e.department?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    if (sortBy === "workload") {
      sorted.sort((a, b) => b.workload.total - a.workload.total);
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "completion") {
      sorted.sort((a, b) => b.workload.utilizationRate - a.workload.utilizationRate);
    }

    return sorted;
  }, [overview?.evaluators, searchQuery, sortBy]);

  if (overview === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow p-6 animate-pulse h-24" />
          ))}
        </div>
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-96" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-sm">You don't have permission to view evaluator workload.</p>
      </div>
    );
  }

  const { summary } = overview;
  const workloadDistribution = {
    overloaded: filteredAndSortedEvaluators.filter((e) => e.workload.total > summary.averageWorkload * 1.5).length,
    balanced: filteredAndSortedEvaluators.filter(
      (e) => e.workload.total >= summary.averageWorkload * 0.75 && e.workload.total <= summary.averageWorkload * 1.5
    ).length,
    underutilized: filteredAndSortedEvaluators.filter((e) => e.workload.total < summary.averageWorkload * 0.75)
      .length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <TessellationHeader
        icon={Users}
        title="Evaluator Workload Management"
        description="Monitor evaluator capacity across all calls to balance assignments and optimize resource allocation"
        gradient="from-emerald-500/60 via-teal-500/60 to-cyan-500/60"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Evaluators */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700">Total Evaluators</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{summary.totalEvaluators}</p>
              <p className="mt-1 text-xs text-blue-600">{summary.activeEvaluators} active</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 opacity-60" />
          </div>
        </div>

        {/* Average Workload */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-700">Avg Workload</p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{summary.averageWorkload.toFixed(1)}</p>
              <p className="mt-1 text-xs text-indigo-600">proposals/evaluator</p>
            </div>
            <TrendingUp className="w-8 h-8 text-indigo-600 opacity-60" />
          </div>
        </div>

        {/* Workload Range */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700">Workload Range</p>
              <p className="mt-1 text-2xl font-bold text-purple-900">
                {summary.minWorkload === Infinity ? 0 : summary.minWorkload} - {summary.maxWorkload}
              </p>
              <p className="mt-1 text-xs text-purple-600">min - max</p>
            </div>
            <Minus className="w-8 h-8 text-purple-600 opacity-60" />
          </div>
        </div>

        {/* Total Assignments */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-200 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700">Total Assignments</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{summary.totalAssignments}</p>
              <p className="mt-1 text-xs text-emerald-600">across all calls</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-60" />
          </div>
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workload Distribution</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <TrendingUp className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">Overloaded</p>
              <p className="text-2xl font-bold text-red-900">{workloadDistribution.overloaded}</p>
              <p className="text-xs text-red-600">&gt;{(summary.averageWorkload * 1.5).toFixed(1)} proposals</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <Minus className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">Balanced</p>
              <p className="text-2xl font-bold text-emerald-900">{workloadDistribution.balanced}</p>
              <p className="text-xs text-emerald-600">within 75-150% of avg</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <TrendingDown className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700">Underutilized</p>
              <p className="text-2xl font-bold text-amber-900">{workloadDistribution.underutilized}</p>
              <p className="text-xs text-amber-600">&lt;{(summary.averageWorkload * 0.75).toFixed(1)} proposals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluator List */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-lg">
        {/* Toolbar */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search evaluators..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "workload" | "name" | "completion")}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="workload">Workload (high to low)</option>
                <option value="name">Name (A-Z)</option>
                <option value="completion">Completion rate</option>
              </select>
            </div>
          </div>
        </div>

        {/* Evaluator Cards */}
        <div className="divide-y divide-gray-200">
          {filteredAndSortedEvaluators.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No evaluators found</p>
            </div>
          ) : (
            filteredAndSortedEvaluators.map((evaluator) => {
              const isExpanded = expandedEvaluator === evaluator._id;
              const workloadLevel =
                evaluator.workload.total > summary.averageWorkload * 1.5
                  ? "overloaded"
                  : evaluator.workload.total < summary.averageWorkload * 0.75
                  ? "underutilized"
                  : "balanced";

              return (
                <div key={evaluator._id} className="hover:bg-gray-50 transition">
                  <div
                    onClick={() => setExpandedEvaluator(isExpanded ? null : evaluator._id)}
                    className="px-6 py-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900">{evaluator.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{evaluator.email}</p>
                          {evaluator.department && (
                            <p className="mt-1 text-xs text-gray-600">{evaluator.department}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {/* Workload Badge */}
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              workloadLevel === "overloaded"
                                ? "bg-red-100 text-red-700"
                                : workloadLevel === "underutilized"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {workloadLevel === "overloaded" ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : workloadLevel === "underutilized" ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            {evaluator.workload.total} assigned
                          </span>
                          <p className="mt-1 text-xs text-gray-500">
                            {evaluator.workload.utilizationRate.toFixed(0)}% completion
                          </p>
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-2">
                          {evaluator.workload.pending > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              {evaluator.workload.pending}
                            </span>
                          )}
                          {evaluator.workload.inProgress > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              {evaluator.workload.inProgress}
                            </span>
                          )}
                          {evaluator.workload.completed > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              {evaluator.workload.completed}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && evaluator.assignments.length > 0 && (
                    <div className="px-6 pb-4 pl-14">
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                        <h5 className="text-xs font-semibold text-gray-700 mb-3">Active Assignments</h5>
                        <div className="space-y-2">
                          {evaluator.assignments.map((assignment: any) => (
                            <div
                              key={assignment.assignmentId}
                              className="flex items-center justify-between p-3 rounded-md bg-white border border-gray-200"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {assignment.proposalTitle}
                                </p>
                                <p className="text-xs text-gray-500">{assignment.callTitle}</p>
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <span
                                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                                    assignment.status === "submitted"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : assignment.status === "draft"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {assignment.status}
                                </span>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatDate(assignment.assignedAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
