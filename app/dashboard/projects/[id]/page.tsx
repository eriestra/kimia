"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  Rocket,
  ArrowLeft,
  Calendar,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  DollarSign,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import TessellationHeader from "@/components/TessellationHeader";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as Id<"proposals">;

  const project = useQuery(api.proposals.getProjectDetail, { proposalId: projectId });

  if (project === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <TessellationHeader
          title="Project Not Found"
          description="The requested project could not be found"
          icon={Rocket}
          gradient="from-green-600/50 to-emerald-600/50"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Rocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Not Found</h3>
            <p className="text-gray-600 mb-6">
              This project may have been deleted or you may not have permission to view it.
            </p>
            <Link
              href="/dashboard/projects/all"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Helper to get status config
  const getStatusConfig = (status: string) => {
    const configs = {
      approved: {
        color: "blue",
        icon: CheckCircle2,
        label: "Approved",
        bgClass: "bg-blue-100",
        textClass: "text-blue-700"
      },
      in_execution: {
        color: "emerald",
        icon: TrendingUp,
        label: "In Execution",
        bgClass: "bg-emerald-100",
        textClass: "text-emerald-700"
      },
      completed: {
        color: "gray",
        icon: CheckCircle,
        label: "Completed",
        bgClass: "bg-gray-100",
        textClass: "text-gray-700"
      },
    };
    return configs[status as keyof typeof configs] || configs.in_execution;
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  // Calculate overall progress
  const totalMilestones = project.milestoneExecution.length || 1;
  const completedMilestones = project.milestoneExecution.filter(
    (m: any) => m.status === "completed"
  ).length;
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <TessellationHeader
        title={project.title}
        description={`Monitoring and execution tracking for ${project.call?.title || "this call"}`}
        icon={Rocket}
        gradient="from-green-600/50 to-emerald-600/50"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Button */}
        <div>
          <Link
            href="/dashboard/projects/all"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Projects
          </Link>
        </div>

        {/* Project Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bgClass} ${statusConfig.textClass} rounded-full text-xs font-medium`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </div>
                <Link
                  href={`/dashboard/proposals/${projectId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-medium transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Original Proposal
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Principal Investigator</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.principalInvestigator?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Funding Call</p>
                    <p className="text-sm font-medium text-gray-900">{project.call?.title || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Total Budget</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${project.budget?.total?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-green-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {completedMilestones} of {totalMilestones} milestones completed
            </p>
          </div>
        </div>

        {/* Active Alerts */}
        {project.activeAlerts && project.activeAlerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Active Alerts
            </h2>
            <div className="space-y-3">
              {project.activeAlerts.map((alert: any, index: number) => {
                const alertConfig = {
                  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: XCircle },
                  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: AlertTriangle },
                  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: AlertCircle },
                };
                const config = alertConfig[alert.severity as keyof typeof alertConfig] || alertConfig.info;
                const AlertIcon = config.icon;

                return (
                  <div
                    key={index}
                    className={`${config.bg} ${config.border} border rounded-lg p-4 flex items-start gap-3`}
                  >
                    <AlertIcon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${config.text}`}>{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestone Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Milestone Progress
          </h2>

          {project.milestoneExecution.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No milestones defined for this project.</p>
          ) : (
            <div className="space-y-4">
              {project.milestoneExecution.map((milestone: any, index: number) => {
                const originalMilestone = project.timeline[milestone.milestoneIndex];
                const statusIcons = {
                  not_started: { icon: Clock, color: "gray", bgClass: "bg-gray-100", textClass: "text-gray-700" },
                  in_progress: { icon: TrendingUp, color: "blue", bgClass: "bg-blue-100", textClass: "text-blue-700" },
                  completed: { icon: CheckCircle, color: "green", bgClass: "bg-green-100", textClass: "text-green-700" },
                  delayed: { icon: AlertTriangle, color: "amber", bgClass: "bg-amber-100", textClass: "text-amber-700" },
                  blocked: { icon: XCircle, color: "red", bgClass: "bg-red-100", textClass: "text-red-700" },
                };
                const status = statusIcons[milestone.status as keyof typeof statusIcons] || statusIcons.not_started;
                const MilestoneIcon = status.icon;

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">Milestone {index + 1}</span>
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 ${status.bgClass} ${status.textClass} rounded-full text-xs font-medium`}
                          >
                            <MilestoneIcon className="w-3 h-3" />
                            {milestone.status.replace("_", " ")}
                          </div>
                          {milestone.daysDelayed && milestone.daysDelayed > 0 && (
                            <span className="text-xs text-red-600 font-medium">
                              +{milestone.daysDelayed} days late
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">{originalMilestone?.milestone || "Unnamed Milestone"}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Planned Deadline</p>
                        <p className="font-medium text-gray-900">
                          {new Date(milestone.plannedDeadline).toLocaleDateString()}
                        </p>
                      </div>
                      {milestone.completedAt && (
                        <div>
                          <p className="text-gray-500 mb-1">Completed On</p>
                          <p className="font-medium text-gray-900">
                            {new Date(milestone.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {milestone.delayReason && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-medium text-amber-800 mb-1">Delay Reason</p>
                        <p className="text-sm text-amber-700">{milestone.delayReason}</p>
                      </div>
                    )}

                    {/* Deliverables */}
                    {milestone.deliverableSubmissions && milestone.deliverableSubmissions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Deliverables</p>
                        <div className="space-y-2">
                          {milestone.deliverableSubmissions.map((deliverable: any, dIndex: number) => {
                            const delivStatus = {
                              pending: { color: "gray", icon: Clock, bgClass: "bg-gray-100", textClass: "text-gray-700", iconClass: "text-gray-600" },
                              submitted: { color: "blue", icon: Upload, bgClass: "bg-blue-100", textClass: "text-blue-700", iconClass: "text-blue-600" },
                              under_review: { color: "amber", icon: FileText, bgClass: "bg-amber-100", textClass: "text-amber-700", iconClass: "text-amber-600" },
                              approved: { color: "green", icon: CheckCircle, bgClass: "bg-green-100", textClass: "text-green-700", iconClass: "text-green-600" },
                              needs_revision: { color: "red", icon: XCircle, bgClass: "bg-red-100", textClass: "text-red-700", iconClass: "text-red-600" },
                            };
                            const dConfig = delivStatus[deliverable.status as keyof typeof delivStatus] || delivStatus.pending;
                            const DelivIcon = dConfig.icon;

                            return (
                              <div key={dIndex} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <DelivIcon className={`w-4 h-4 ${dConfig.iconClass}`} />
                                  <span className="text-gray-700">{deliverable.deliverableName}</span>
                                  {deliverable.required && (
                                    <span className="text-xs text-red-600 font-medium">*Required</span>
                                  )}
                                </div>
                                <div
                                  className={`px-2 py-0.5 ${dConfig.bgClass} ${dConfig.textClass} rounded-full text-xs font-medium`}
                                >
                                  {deliverable.status.replace("_", " ")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Budget Snapshot */}
                    {milestone.budgetSnapshot && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Budget Snapshot</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Allocated</p>
                            <p className="font-medium text-gray-900">
                              ${milestone.budgetSnapshot.allocated.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Spent</p>
                            <p className="font-medium text-gray-900">
                              ${milestone.budgetSnapshot.spent?.toLocaleString() || "0"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget Execution */}
        {project.budgetExecution && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Budget Execution
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Committed</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${project.budgetExecution.committed.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 mb-1">Disbursed</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${project.budgetExecution.disbursed.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 mb-1">Spent</p>
                <p className="text-2xl font-bold text-green-700">
                  ${project.budgetExecution.spent.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Available</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${project.budgetExecution.available.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Variance */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Budget Variance</span>
                <span
                  className={`text-lg font-bold ${
                    project.budgetExecution.variance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  ${Math.abs(project.budgetExecution.variance).toLocaleString()}
                  {project.budgetExecution.variance < 0 ? " over" : " under"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.abs(project.budgetExecution.variancePercent).toFixed(1)}% variance from committed budget
              </p>
            </div>

            {/* By Category */}
            {project.budgetExecution.byCategory && project.budgetExecution.byCategory.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Budget by Category</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Committed</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Spent</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {project.budgetExecution.byCategory.map((cat: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{cat.category}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            ${cat.committed.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            ${cat.spent.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={`font-medium ${
                                cat.percentUtilized > 100
                                  ? "text-red-600"
                                  : cat.percentUtilized > 90
                                  ? "text-amber-600"
                                  : "text-green-600"
                              }`}
                            >
                              {cat.percentUtilized.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Members */}
        {project.teamMembers && project.teamMembers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Team Members
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.teamMembers.map((member: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 rounded-full p-2">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
