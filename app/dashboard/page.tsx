"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Home,
  Briefcase,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Target,
  Award,
  BookmarkPlus,
} from "lucide-react";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const calls = useQuery(api.calls.listCalls);

  // Only fetch proposals if user has author role (faculty, admin, sysadmin)
  const proposals = useQuery(
    api.proposals.listMyProposals,
    user && (user.role === "sysadmin" || user.role === "admin" || user.role === "faculty")
      ? {}
      : "skip"
  );

  // Only fetch review proposals if user has reviewer role (evaluator, admin, sysadmin)
  const reviewProposals = useQuery(
    api.proposals.listProposalsForReview,
    user && (user.role === "sysadmin" || user.role === "admin" || user.role === "evaluator")
      ? {}
      : "skip"
  );

  const evaluationAssignments = useQuery(
    api.evaluations.listEvaluationAssignments,
    user && (user.role === "sysadmin" || user.role === "admin" || user.role === "evaluator")
      ? {}
      : "skip"
  );

  if (user === undefined || calls === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  // Calculate stats
  const isAdmin = user.role === "sysadmin" || user.role === "admin";
  const isEvaluator = user.role === "evaluator" || isAdmin;
  const openCalls = calls.filter((c: any) => c.status === "open").length;
  const draftProposals = proposals?.filter((p: any) => p.status === "draft").length || 0;
  const submittedProposals = proposals?.filter((p: any) => p.status === "submitted").length || 0;
  const reviewCount = reviewProposals?.length || 0;
  const showOperationsBoard = isAdmin || isEvaluator;

  const firstName = user.name.split(" ")[0] || user.name;
  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* Welcome Header with Tessellation - Full spectrum gradient from Kimia logo */}
      <TessellationHeader
        icon={Home}
        title={`${greeting}, ${firstName}!`}
        description={`Welcome to your Kimia dashboard. You're logged in as ${getRoleLabel(user.role)}.`}
        gradient="from-blue-500/60 via-purple-500/60 via-pink-500/60 via-orange-500/60 to-yellow-500/60"
      />

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Briefcase className="w-6 h-6" />}
          title="Open Calls"
          value={openCalls}
          description="Available opportunities"
          color="from-blue-500 to-cyan-500"
          link="/dashboard/calls"
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          title="My Proposals"
          value={proposals?.length || 0}
          description={`${draftProposals} draft, ${submittedProposals} submitted`}
          color="from-purple-500 to-pink-500"
          link="/dashboard/proposals"
        />
        {isEvaluator && (
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="To Review"
            value={reviewCount}
            description="Proposals awaiting review"
            color="from-indigo-500 to-purple-500"
            link="/dashboard/review/proposals"
          />
        )}
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Success Rate"
          value="--"
          description="Coming in Phase 2"
          color="from-green-500 to-emerald-500"
        />
      </div>

      {/* Quick Actions */}
      <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Quick Actions
          </h2>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              icon={<Briefcase className="w-6 h-6 text-blue-600" />}
              title="Browse Calls"
              description="Discover funding opportunities"
              link="/dashboard/calls"
              color="bg-blue-50 hover:bg-blue-100"
            />
            <QuickActionCard
              icon={<FileText className="w-6 h-6 text-purple-600" />}
              title="My Proposals"
              description="View and manage submissions"
              link="/dashboard/proposals"
              color="bg-purple-50 hover:bg-purple-100"
            />
            {isEvaluator && (
              <QuickActionCard
                icon={<CheckCircle className="w-6 h-6 text-indigo-600" />}
                title="Review Proposals"
                description="Evaluate submissions"
                link="/dashboard/review/proposals"
                color="bg-indigo-50 hover:bg-indigo-100"
              />
            )}
            <QuickActionCard
              icon={<Users className="w-6 h-6 text-green-600" />}
              title="Profile Settings"
              description="Update your information"
              link="/dashboard/settings"
              color="bg-green-50 hover:bg-green-100"
            />
            <QuickActionCard
              icon={<BookmarkPlus className="w-6 h-6 text-yellow-600" />}
              title="Bookmarks"
              description="View saved calls"
              link="/dashboard/calls"
              color="bg-yellow-50 hover:bg-yellow-100"
            />
            <QuickActionCard
              icon={<Award className="w-6 h-6 text-pink-600" />}
              title="User Guide"
              description="Learn how to use Kimia"
              link="/guide"
              color="bg-pink-50 hover:bg-pink-100"
            />
          </div>
        </div>
      </section>

      {showOperationsBoard && (
        <OperationsOverviewKanban
          calls={calls}
          proposals={reviewProposals || []}
          evaluations={evaluationAssignments || []}
          isAdmin={isAdmin}
        />
      )}

      {/* Recent Activity / Getting Started */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Getting Started Tips */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Getting Started
          </h3>
          <ul className="space-y-3">
            <TipItem
              icon={<Calendar className="w-4 h-4 text-blue-600" />}
              text="Check open calls regularly for new opportunities"
            />
            <TipItem
              icon={<FileText className="w-4 h-4 text-purple-600" />}
              text="Draft proposals are auto-saved every 30 seconds"
            />
            <TipItem
              icon={<Users className="w-4 h-4 text-green-600" />}
              text="Keep your profile updated for better collaboration"
            />
            <TipItem
              icon={<CheckCircle className="w-4 h-4 text-indigo-600" />}
              text="Submit proposals before the deadline to avoid issues"
            />
          </ul>
        </section>

        {/* Platform Status */}
        <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Platform Status
          </h3>
          <div className="space-y-4">
            <StatusItem
              label="Active Calls"
              value={openCalls}
              status="operational"
            />
            <StatusItem
              label="Total Proposals"
              value={proposals?.length || 0}
              status="operational"
            />
            {isEvaluator && (
              <StatusItem
                label="Pending Reviews"
                value={reviewCount}
                status={reviewCount > 0 ? "attention" : "operational"}
              />
            )}
            <StatusItem
              label="System Health"
              value="All systems operational"
              status="operational"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    sysadmin: "System Administrator",
    admin: "Kimia Administrator",
    evaluator: "Evaluator",
    faculty: "Faculty Member",
    finance: "Finance Officer",
    observer: "Observer",
  };
  return labels[role] || role;
}

function StatCard({
  icon,
  title,
  value,
  description,
  color,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  description: string;
  color: string;
  link?: string;
}) {
  const content = (
    <div className="group bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg transition-all hover:shadow-2xl hover:scale-105 hover:border-indigo-300">
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
        {title}
      </h3>
      <p className="text-4xl font-black text-gray-900 mb-2">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
      {link && (
        <div className="mt-4 flex items-center text-indigo-600 font-semibold text-sm group-hover:text-indigo-700">
          View details
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

function QuickActionCard({
  icon,
  title,
  description,
  link,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  color: string;
}) {
  return (
    <Link
      href={link}
      className={`group flex items-start gap-4 p-4 rounded-xl ${color} border-2 border-transparent hover:border-indigo-300 transition-all hover:scale-105`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
          {title}
        </h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function TipItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <span className="text-sm text-blue-900">{text}</span>
    </li>
  );
}

function StatusItem({
  label,
  value,
  status,
}: {
  label: string;
  value: number | string;
  status: "operational" | "attention";
}) {
  const statusColor = status === "operational" ? "bg-green-500" : "bg-yellow-500";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-green-900">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-green-900">{value}</span>
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      </div>
    </div>
  );
}

type KanbanCard = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: string;
  href?: string;
};

type KanbanColumn = {
  id: string;
  title: string;
  description: string;
  cards: KanbanCard[];
};

function OperationsOverviewKanban({
  calls,
  proposals,
  evaluations,
  isAdmin,
}: {
  calls: any[] | undefined;
  proposals: any[] | undefined;
  evaluations: any[] | undefined;
  isAdmin: boolean;
}) {
  const isLoading =
    calls === undefined || proposals === undefined || evaluations === undefined;

  const callColumns = useMemo(() => buildCallColumns(calls ?? []), [calls]);
  const proposalColumns = useMemo(
    () => buildProposalColumns(proposals ?? []),
    [proposals]
  );
  const evaluationColumns = useMemo(
    () => buildEvaluationColumns(evaluations ?? [], isAdmin),
    [evaluations, isAdmin]
  );

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
        <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={`kanban-skeleton-${index}`}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3"
            >
              <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-28 bg-white rounded-xl border border-dashed border-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!calls || !proposals) {
    return null;
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Operations overview
        </h2>
        <p className="text-sm text-gray-600">
          Track funding calls, proposal pipeline, and evaluation progress at a glance.
        </p>
      </div>

      <div className="space-y-10">
        <KanbanSection
          title="Calls pipeline"
          description="Monitor each call as it moves from draft to archive."
          columns={callColumns}
        />
        <KanbanSection
          title="Proposal lifecycle"
          description="See how submissions progress from draft to decision."
          columns={proposalColumns}
        />
        <KanbanSection
          title="Evaluation workflow"
          description="Assign evaluators, follow up on pending reviews, and spot completed reports."
          columns={evaluationColumns}
        />
      </div>
    </section>
  );
}

function KanbanSection({
  title,
  description,
  columns,
}: {
  title: string;
  description: string;
  columns: KanbanColumn[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-h-[180px] pb-2">
          {columns.map((column) => (
            <div
              key={column.id}
              className="min-w-[240px] lg:min-w-[280px] flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col"
            >
              <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{column.title}</p>
                  <p className="text-xs text-gray-500">{column.description}</p>
                </div>
                <span className="ml-3 inline-flex items-center justify-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                  {column.cards.length}
                </span>
              </div>
              <div className="flex-1 px-4 py-4 space-y-3">
                {column.cards.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No items in this column.</p>
                ) : (
                  column.cards.map((card) => (
                    <KanbanCardItem key={card.id} card={card} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function KanbanCardItem({ card }: { card: KanbanCard }) {
  const content = (
    <div className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow-lg">
      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
        {card.title}
      </p>
      {card.subtitle && <p className="text-xs text-gray-500 mt-0.5">{card.subtitle}</p>}
      {card.badge && (
        <p className="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
          {card.badge}
        </p>
      )}
      {card.meta && <p className="mt-2 text-xs text-gray-500">{card.meta}</p>}
    </div>
  );

  if (card.href) {
    return <Link href={card.href}>{content}</Link>;
  }

  return content;
}

const CALL_COLUMN_CONFIG: Array<{
  id: string;
  label: string;
  status: "draft" | "open" | "closed" | "archived";
  description: string;
}> = [
  {
    id: "draft",
    label: "Draft",
    status: "draft",
    description: "Being prepared by admins",
  },
  {
    id: "open",
    label: "Open",
    status: "open",
    description: "Accepting proposals now",
  },
  {
    id: "closed",
    label: "Closed",
    status: "closed",
    description: "Awaiting decisions",
  },
  {
    id: "archived",
    label: "Archived",
    status: "archived",
    description: "No longer active",
  },
];

const PROPOSAL_COLUMN_CONFIG: Array<{
  id: string;
  label: string;
  statuses: string[];
  description: string;
}> = [
  {
    id: "draft",
    label: "Draft",
    statuses: ["draft"],
    description: "Authors are still editing",
  },
  {
    id: "submitted",
    label: "Submitted",
    statuses: ["submitted"],
    description: "Ready for evaluator assignment",
  },
  {
    id: "under_review",
    label: "Under Review",
    statuses: ["under_review"],
    description: "Evaluators are scoring",
  },
  {
    id: "decision",
    label: "Decision & Follow-up",
    statuses: ["approved", "rejected", "revise_and_resubmit", "in_execution", "completed"],
    description: "Final decisions and project execution",
  },
];

const EVALUATION_COLUMN_CONFIG: Array<{
  id: string;
  label: string;
  statuses: Array<"unassigned" | "pending" | "in_progress" | "submitted">;
  description: string;
  adminOnly?: boolean;
}> = [
  {
    id: "unassigned",
    label: "Needs Assignment",
    statuses: ["unassigned"],
    description: "Proposals waiting for evaluator assignment",
    adminOnly: true,
  },
  {
    id: "pending",
    label: "Pending",
    statuses: ["pending"],
    description: "Assigned but not started",
  },
  {
    id: "in_progress",
    label: "In Progress",
    statuses: ["in_progress"],
    description: "Draft evaluations in progress",
  },
  {
    id: "submitted",
    label: "Completed",
    statuses: ["submitted"],
    description: "Evaluations ready for decisions",
  },
];

function buildCallColumns(calls: any[]): KanbanColumn[] {
  return CALL_COLUMN_CONFIG.map((column) => {
    const cards = calls
      .filter((call) => call.status === column.status)
      .sort((a: any, b: any) => (a.closeDate ?? 0) - (b.closeDate ?? 0))
      .map((call: any) => ({
        id: String(call._id),
        title: call.title,
        subtitle: call.projectType,
        badge: formatStatusLabel(call.status),
        meta: call.closeDate ? `Closes ${formatDate(call.closeDate)}` : undefined,
        href: call.slug ? `/calls/${call.slug}` : "/dashboard/calls",
      }));

    return {
      id: column.id,
      title: column.label,
      description: column.description,
      cards,
    };
  });
}

function buildProposalColumns(proposals: any[]): KanbanColumn[] {
  return PROPOSAL_COLUMN_CONFIG.map((column) => {
    const cards = proposals
      .filter((proposal: any) => column.statuses.includes(proposal.status))
      .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .map((proposal: any) => ({
        id: String(proposal._id),
        title: proposal.title,
        subtitle: proposal.call?.title ?? "No call linked",
        badge: formatStatusLabel(proposal.status),
        meta: proposal.submittedAt
          ? `Submitted ${formatDate(proposal.submittedAt)}`
          : `Updated ${formatDate(proposal.updatedAt)}`,
        href: `/dashboard/review/proposals/${proposal._id}`,
      }));

    return {
      id: column.id,
      title: column.label,
      description: column.description,
      cards,
    };
  });
}

function buildEvaluationColumns(assignments: any[], isAdmin: boolean): KanbanColumn[] {
  return EVALUATION_COLUMN_CONFIG.filter((column) => (column.adminOnly ? isAdmin : true)).map(
    (column) => {
      const cards = assignments
        .filter((assignment: any) => column.statuses.includes(assignment.status))
        .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .map((assignment: any) => ({
          id: assignment.id,
          title: assignment.proposalTitle,
          subtitle: assignment.callTitle || "No call linked",
          badge: assignment.evaluator?.name ?? "Needs evaluator",
          meta: formatEvaluationMeta(assignment),
          href: `/dashboard/review/proposals/${assignment.proposalId}`,
        }));

      return {
        id: column.id,
        title: column.label,
        description: column.description,
        cards,
      };
    }
  );
}

function formatEvaluationMeta(assignment: any) {
  switch (assignment.status) {
    case "submitted":
      return assignment.submittedAt
        ? `Submitted ${formatDate(assignment.submittedAt)}`
        : "Submitted";
    case "in_progress":
      return "Draft in progress";
    case "pending":
      return "Awaiting reviewer";
    case "unassigned":
      return "Assign an evaluator";
    default:
      return undefined;
  }
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(timestamp?: number | null) {
  if (!timestamp || Number.isNaN(timestamp)) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(timestamp);
  } catch {
    return "";
  }
}
