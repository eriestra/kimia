"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Rocket,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileText,
} from "lucide-react";
import TessellationHeader from "@/components/TessellationHeader";

export default function MyProjectsPage() {
  const proposals = useQuery(api.proposals.listMyProposals);

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

  // Filter for approved and in_execution projects
  const activeProjects = proposals.filter(
    (p: typeof proposals[0]) => p.status === "approved" || p.status === "in_execution"
  );

  const approvedProjects = activeProjects.filter((p: typeof activeProjects[0]) => p.status === "approved");
  const inExecutionProjects = activeProjects.filter((p: typeof activeProjects[0]) => p.status === "in_execution");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <TessellationHeader
        title="My Projects"
        description="Track your approved projects and manage execution milestones"
        icon={Rocket}
        gradient="from-green-600/50 to-emerald-600/50"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Active Projects</p>
                <p className="text-3xl font-bold text-gray-900">{activeProjects.length}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Rocket className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved (Not Started)</p>
                <p className="text-3xl font-bold text-gray-900">{approvedProjects.length}</p>
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
                <p className="text-3xl font-bold text-gray-900">{inExecutionProjects.length}</p>
              </div>
              <div className="bg-emerald-100 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {activeProjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Rocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Projects</h3>
            <p className="text-gray-600 mb-6">
              You don't have any approved or in-execution projects yet.
            </p>
            <Link
              href="/dashboard/proposals/my-proposals"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FileText className="w-4 h-4" />
              View My Proposals
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeProjects.map((project: typeof activeProjects[0]) => {
              const isInExecution = project.status === "in_execution";
              const statusColor = isInExecution ? "emerald" : "blue";
              const statusIcon = isInExecution ? TrendingUp : CheckCircle2;
              const StatusIcon = statusIcon;

              return (
                <div
                  key={project.proposalId}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <Calendar className="w-4 h-4" />
                          <span>{project.callTitle}</span>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 bg-${statusColor}-100 text-${statusColor}-700 rounded-full text-xs font-medium whitespace-nowrap ml-3`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {isInExecution ? "In Execution" : "Approved"}
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="flex items-center gap-2 text-gray-700 mb-4 pb-4 border-b border-gray-100">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Budget: <span className="font-semibold">${project.budgetTotal?.toLocaleString() ?? 0}</span>
                      </span>
                    </div>

                    {/* Progress Section (only for in_execution) */}
                    {isInExecution && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Overall Progress</span>
                          <span className="text-sm font-medium text-gray-900">0%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: "0%" }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg p-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>No milestones reported yet</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Milestones</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {project.timeline?.length ?? 0}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs">Completed</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">0</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link
                        href={`/dashboard/projects/${project.proposalId}`}
                        className="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        {isInExecution ? "Manage Project" : "Start Project"}
                      </Link>
                      <Link
                        href={`/dashboard/proposals/${project.proposalId}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                      >
                        View Proposal
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
