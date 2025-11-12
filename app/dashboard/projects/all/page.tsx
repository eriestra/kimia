"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  CheckCircle2,
  TrendingUp,
  Calendar,
  DollarSign,
  Search,
  Filter,
  User,
  Clock,
  XCircle,
  CheckCircle,
} from "lucide-react";
import TessellationHeader from "@/components/TessellationHeader";

type ProjectStatus = "approved" | "in_execution" | "completed" | "all";

export default function AllProjectsPage() {
  const proposals = useQuery(api.proposals.listAllProposals);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (proposals === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Filter projects (approved, in_execution, completed)
  const allProjects = proposals.filter(
    (p: typeof proposals[0]) => p.status === "approved" || p.status === "in_execution" || p.status === "completed"
  );

  // Apply filters
  let filteredProjects = allProjects;

  if (statusFilter !== "all") {
    filteredProjects = filteredProjects.filter((p: typeof filteredProjects[0]) => p.status === statusFilter);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredProjects = filteredProjects.filter(
      (p: typeof filteredProjects[0]) =>
        p.title.toLowerCase().includes(query) ||
        p.principalInvestigatorName?.toLowerCase().includes(query) ||
        p.callTitle?.toLowerCase().includes(query)
    );
  }

  // Calculate stats
  const approvedCount = allProjects.filter((p: typeof allProjects[0]) => p.status === "approved").length;
  const inExecutionCount = allProjects.filter((p: typeof allProjects[0]) => p.status === "in_execution").length;
  const completedCount = allProjects.filter((p: typeof allProjects[0]) => p.status === "completed").length;
  const totalBudget = allProjects.reduce((sum: number, p: typeof allProjects[0]) => sum + (p.budgetTotal ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <TessellationHeader
        title="All Projects"
        description="Monitor all approved, in-execution, and completed projects across the institution"
        icon={Rocket}
        gradient="from-green-600/50 to-emerald-600/50"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900">{allProjects.length}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Rocket className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-gray-900">{approvedCount}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">In Execution</p>
                <p className="text-3xl font-bold text-gray-900">{inExecutionCount}</p>
              </div>
              <div className="bg-emerald-100 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <CheckCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, PI, or call..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white min-w-[180px]"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="in_execution">In Execution</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Filter summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredProjects.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{allProjects.length}</span> projects
            {statusFilter !== "all" && (
              <span>
                {" "}
                • Status: <span className="font-semibold text-gray-900">{statusFilter.replace("_", " ")}</span>
              </span>
            )}
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <Rocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-600">
                {searchQuery
                  ? "Try adjusting your search filters"
                  : "No projects match the selected status"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal Investigator
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project: typeof filteredProjects[0]) => {
                    const statusConfig = {
                      approved: {
                        bgClass: "bg-blue-100",
                        textClass: "text-blue-700",
                        icon: CheckCircle2,
                        label: "Approved"
                      },
                      in_execution: {
                        bgClass: "bg-emerald-100",
                        textClass: "text-emerald-700",
                        icon: TrendingUp,
                        label: "In Execution"
                      },
                      completed: {
                        bgClass: "bg-gray-100",
                        textClass: "text-gray-700",
                        icon: CheckCircle,
                        label: "Completed"
                      },
                    }[project.status as "approved" | "in_execution" | "completed"];

                    const StatusIcon = statusConfig?.icon || CheckCircle2;

                    return (
                      <tr key={project._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="max-w-[200px]">
                            <p className="font-medium text-gray-900 truncate">{project.title}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm truncate max-w-[120px]">
                              {project.principalInvestigatorName ?? "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm truncate max-w-[120px]">{project.callTitle ?? "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-gray-700">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {project.budgetTotal?.toLocaleString() ?? "0"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig?.bgClass} ${statusConfig?.textClass} rounded-full text-xs font-medium whitespace-nowrap`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig?.label}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(project.updatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/projects/${project._id}`}
                            className="text-green-600 hover:text-green-700 font-medium text-sm inline-flex items-center gap-1"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Budget Summary */}
        {allProjects.length > 0 && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 mb-1">Total Portfolio Budget</p>
                <p className="text-4xl font-bold">${totalBudget.toLocaleString()}</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
