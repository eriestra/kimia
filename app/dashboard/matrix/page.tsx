"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Network,
  Filter,
  Sparkles,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Phone,
} from "lucide-react";

type ViewMode = "matrix" | "evaluator-first" | "proposal-first";

export default function AssignmentMatrixPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState<"all" | "needs_assignment" | "partial" | "complete">("all");
  const [showFilters, setShowFilters] = useState(false);

  const matrix = useQuery(api.matrix.getGlobalMatrix, {
    callIds: selectedCallIds.length > 0 ? selectedCallIds.map(id => id as Id<"calls">) : undefined,
    evaluatorCampus: selectedCampuses.length > 0 ? selectedCampuses : undefined,
    evaluatorDepartment: selectedDepartments.length > 0 ? selectedDepartments : undefined,
    evaluatorExpertise: selectedExpertise.length > 0 ? selectedExpertise : undefined,
    showOnlyAvailable,
    assignmentStatus
  });

  const quickAssign = useMutation(api.matrix.quickAssign);

  const handleQuickAssign = async (proposalId: Id<"proposals">, evaluatorId: string) => {
    try {
      await quickAssign({ proposalId, evaluatorId });
    } catch (error) {
      console.error("Failed to assign:", error);
      alert(error instanceof Error ? error.message : "Failed to assign evaluator");
    }
  };

  if (matrix === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow p-6 animate-pulse h-24" />
          ))}
        </div>
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-[600px]" />
      </div>
    );
  }

  const { proposals, evaluators, filterOptions, summary } = matrix;

  return (
    <div className="space-y-6">
      {/* Header */}
      <TessellationHeader
        icon={Network}
        title="Assignment Matrix"
        description="Switchboard view: Connect proposals to evaluators with AI-powered matching"
        gradient="from-purple-500/60 via-pink-500/60 to-rose-500/60"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow transition ${
                showFilters
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-purple-600 shadow transition hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4" />
              AI Auto-Assign
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={FileText}
          label="Total Proposals"
          value={summary.totalProposals}
          color="blue"
        />
        <SummaryCard
          icon={AlertCircle}
          label="Needs Assignment"
          value={summary.needsAssignment}
          color="amber"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Fully Assigned"
          value={summary.fullyAssigned}
          color="emerald"
        />
        <SummaryCard
          icon={Users}
          label="Available Evaluators"
          value={`${summary.availableEvaluators}/${summary.totalEvaluators}`}
          color="indigo"
        />
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Call Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calls
              </label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                value={selectedCallIds}
                onChange={(e) =>
                  setSelectedCallIds(
                    Array.from(e.target.selectedOptions, (option) => option.value)
                  )
                }
              >
                {filterOptions.calls.map((call: typeof filterOptions.calls[0]) => (
                  <option key={call._id} value={call._id}>
                    {call.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Campus Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campus
              </label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                value={selectedCampuses}
                onChange={(e) =>
                  setSelectedCampuses(
                    Array.from(e.target.selectedOptions, (option) => option.value)
                  )
                }
              >
                {filterOptions.campuses.map((campus: string) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                value={selectedDepartments}
                onChange={(e) =>
                  setSelectedDepartments(
                    Array.from(e.target.selectedOptions, (option) => option.value)
                  )
                }
              >
                {filterOptions.departments.map((dept: string) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                value={assignmentStatus}
                onChange={(e) => setAssignmentStatus(e.target.value as typeof assignmentStatus)}
              >
                <option value="all">All Proposals</option>
                <option value="needs_assignment">Needs Assignment</option>
                <option value="partial">Partial Assignment</option>
                <option value="complete">Fully Assigned</option>
              </select>
            </div>

            {/* Availability Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluator Availability
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Show only available evaluators</span>
              </label>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCallIds([]);
                  setSelectedCampuses([]);
                  setSelectedDepartments([]);
                  setSelectedExpertise([]);
                  setShowOnlyAvailable(false);
                  setAssignmentStatus("all");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Grid */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Switchboard Matrix
              </h3>
            </div>
            <div className="text-sm text-gray-600">
              {proposals.length} proposals × {evaluators.length} evaluators
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">
                  Proposal
                </th>
                {evaluators.map((evaluator: typeof evaluators[0]) => (
                  <th
                    key={evaluator._id}
                    className="px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-semibold">{evaluator.name}</div>
                      <div className="text-xs text-gray-500">
                        {evaluator.currentLoad}/{evaluator.maxCapacity}
                      </div>
                      <div
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          evaluator.isAvailable
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {evaluator.isAvailable ? "Available" : "At capacity"}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {proposals.length === 0 ? (
                <tr>
                  <td
                    colSpan={evaluators.length + 1}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No proposals match the selected filters</p>
                  </td>
                </tr>
              ) : (
                proposals.map((proposal: typeof proposals[0]) => (
                  <tr key={proposal.proposalId} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200">
                      <div className="flex flex-col gap-1 min-w-[250px]">
                        <div className="font-semibold text-sm text-gray-900">
                          {proposal.proposalTitle}
                        </div>
                        <div className="text-xs text-gray-600">
                          PI: {proposal.principalInvestigator}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                              proposal.assignmentStatus === "complete"
                                ? "bg-emerald-100 text-emerald-700"
                                : proposal.assignmentStatus === "partial"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {proposal.assignedCount}/{proposal.requiredEvaluators}
                          </span>
                          <span className="text-xs text-gray-500">
                            {proposal.callTitle}
                          </span>
                        </div>
                      </div>
                    </td>
                    {proposal.cells.map((cell: typeof proposal.cells[0]) => (
                      <MatrixCell
                        key={`${proposal.proposalId}-${cell.evaluatorId}`}
                        cell={cell}
                        proposalId={proposal.proposalId}
                        onAssign={handleQuickAssign}
                      />
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type SummaryCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: "blue" | "amber" | "emerald" | "indigo";
};

function SummaryCard({ icon: Icon, label, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: "from-blue-100 to-blue-200 border-blue-200 text-blue-700",
    amber: "from-amber-100 to-amber-200 border-amber-200 text-amber-700",
    emerald: "from-emerald-100 to-emerald-200 border-emerald-200 text-emerald-700",
    indigo: "from-indigo-100 to-indigo-200 border-indigo-200 text-indigo-700",
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br border p-6 shadow-md ${colorClasses[color]}`}>
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

type MatrixCellProps = {
  cell: {
    evaluatorId: string;
    evaluatorName: string;
    assignment: {
      _id: Id<"evaluatorAssignments">;
      status: string;
      assignedAt: number;
      coiDeclared: boolean;
      declineReason?: string;
    } | null;
    match: {
      matchScore: number;
      expertiseScore: number;
      conflictFlags: string[];
      conflictSeverity: string;
      reasoning: string;
      stale: boolean;
    } | null;
  };
  proposalId: Id<"proposals">;
  onAssign: (proposalId: Id<"proposals">, evaluatorId: string) => void;
};

function MatrixCell({ cell, proposalId, onAssign }: MatrixCellProps) {
  const { assignment, match } = cell;

  // Assigned and accepted
  if (assignment && assignment.status === "accepted") {
    return (
      <td className="px-3 py-3 text-center border-r border-gray-200">
        <div
          className="mx-auto w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center cursor-pointer hover:scale-110 transition"
          title={`Assigned - Accepted\nAssigned: ${new Date(assignment.assignedAt).toLocaleDateString()}`}
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-700" />
        </div>
      </td>
    );
  }

  // Assigned but pending acceptance
  if (assignment && assignment.status === "pending") {
    return (
      <td className="px-3 py-3 text-center border-r border-gray-200">
        <div
          className="mx-auto w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center cursor-pointer hover:scale-110 transition"
          title={`Assigned - Pending\nAwaiting evaluator acceptance`}
        >
          <Clock className="w-6 h-6 text-blue-700" />
        </div>
      </td>
    );
  }

  // Declined
  if (assignment && assignment.status === "declined") {
    return (
      <td className="px-3 py-3 text-center border-r border-gray-200">
        <div
          className="mx-auto w-12 h-12 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center cursor-pointer hover:scale-110 transition"
          title={`Declined\nReason: ${assignment.declineReason || "No reason provided"}`}
        >
          <XCircle className="w-6 h-6 text-red-700" />
        </div>
      </td>
    );
  }

  // Available to assign - show match score
  const matchScore = match?.matchScore ?? 0;
  const hasConflict = match && match.conflictFlags.length > 0;

  let bgColor = "bg-gray-100";
  let borderColor = "border-gray-300";
  let textColor = "text-gray-700";

  if (hasConflict && match.conflictSeverity === "blocking") {
    bgColor = "bg-red-100";
    borderColor = "border-red-400";
    textColor = "text-red-700";
  } else if (hasConflict) {
    bgColor = "bg-orange-100";
    borderColor = "border-orange-400";
    textColor = "text-orange-700";
  } else if (matchScore >= 85) {
    bgColor = "bg-emerald-100";
    borderColor = "border-emerald-400";
    textColor = "text-emerald-700";
  } else if (matchScore >= 70) {
    bgColor = "bg-blue-100";
    borderColor = "border-blue-400";
    textColor = "text-blue-700";
  } else if (matchScore >= 50) {
    bgColor = "bg-yellow-100";
    borderColor = "border-yellow-400";
    textColor = "text-yellow-700";
  }

  return (
    <td className="px-3 py-3 text-center border-r border-gray-200">
      <button
        onClick={() => onAssign(proposalId, cell.evaluatorId)}
        className={`mx-auto w-12 h-12 rounded-full ${bgColor} border-2 ${borderColor} flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition group relative`}
        title={match ? `Match: ${matchScore}%\n${match.reasoning}` : "No match data"}
        disabled={hasConflict && match?.conflictSeverity === "blocking" ? true : undefined}
      >
        {hasConflict ? (
          <AlertTriangle className={`w-5 h-5 ${textColor}`} />
        ) : (
          <span className={`text-xs font-bold ${textColor}`}>
            {matchScore > 0 ? `${matchScore}%` : "—"}
          </span>
        )}

        {/* Tooltip on hover */}
        {match && (
          <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
            <div className="font-semibold mb-1">Match Analysis</div>
            <div className="space-y-1">
              <div>Overall: {match.matchScore}%</div>
              <div>Expertise: {match.expertiseScore}%</div>
              {match.conflictFlags.length > 0 && (
                <div className="text-red-300">
                  Conflicts: {match.conflictFlags.join(", ")}
                </div>
              )}
              <div className="mt-2 text-gray-300 italic">{match.reasoning}</div>
            </div>
          </div>
        )}
      </button>
    </td>
  );
}
