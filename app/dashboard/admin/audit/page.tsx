"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import { ShieldCheck } from "lucide-react";

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const FILTERS = [
  { id: "all", label: "All events" },
  { id: "proposal", label: "Proposal lifecycle" },
  { id: "evaluation", label: "Evaluations" },
  { id: "assignment", label: "Assignments" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function formatDetails(details: any): string {
  if (details === null || details === undefined) {
    return "—";
  }
  if (typeof details === "string" || typeof details === "number" || typeof details === "boolean") {
    return String(details);
  }
  if (Array.isArray(details)) {
    return details.length > 0 ? JSON.stringify(details) : "—";
  }
  try {
    return Object.entries(details)
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${key}: —`;
        }
        if (typeof value === "object") {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${String(value)}`;
      })
      .join(" • ");
  } catch {
    return "Unable to render details";
  }
}

function matchesFilter(activity: any, filter: FilterId) {
  if (filter === "all") {
    return true;
  }
  if (filter === "evaluation") {
    return typeof activity.action === "string" && activity.action.startsWith("evaluation.");
  }
  if (filter === "assignment") {
    return (
      typeof activity.action === "string" &&
      (activity.action.includes("assignment") || activity.action.includes("evaluators"))
    );
  }
  // Default: proposal lifecycle events
  return typeof activity.action === "string" && activity.action.startsWith("proposal.");
}

export default function AuditTrailPage() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const activities = useQuery(api.activities.listRecentActivities, { limit: 100 });

  // Call all hooks before any conditional returns
  const filteredActivities = useMemo(
    () => {
      if (!Array.isArray(activities)) {
        return [];
      }
      return activities.filter((activity: any) => matchesFilter(activity, activeFilter));
    },
    [activities, activeFilter]
  );

  if (activities === undefined) {
    return (
      <div className="space-y-6">
        <TessellationHeader
          icon={ShieldCheck}
          title="Audit Trail"
          description="Tracking platform-wide actions for compliance."
        />
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200 animate-pulse">
          <p className="text-gray-500 text-sm">Loading recent activity…</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(activities)) {
    return (
      <div className="space-y-6">
        <TessellationHeader
          icon={ShieldCheck}
          title="Audit Trail"
          description="Tracking platform-wide actions for compliance."
        />
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-red-700">
          <p className="font-semibold text-lg">Unable to load audit entries.</p>
          <p className="mt-2 text-sm">
            The audit log is unavailable at the moment. Please refresh or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TessellationHeader
        icon={ShieldCheck}
        title="Audit Trail"
        description="Review every significant action across proposals and evaluations."
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Timestamp
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actor
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Action
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Entity
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  No activity recorded for the selected filter.
                </td>
              </tr>
            ) : (
              filteredActivities.map((activity: any) => (
                <tr key={activity._id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {TIMESTAMP_FORMATTER.format(new Date(activity.timestamp))}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">
                        {activity.user?.name ?? "Unknown user"}
                      </span>
                      <span className="text-xs text-gray-500">{activity.user?.email ?? "—"}</span>
                      <span className="text-xs text-gray-400 capitalize">
                        {activity.user?.role?.replace(/_/g, " ") ?? "role unavailable"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      {activity.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{activity.entityType}</span>
                      <span className="text-xs text-gray-500 break-all">{activity.entityId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDetails(activity.details)}
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
