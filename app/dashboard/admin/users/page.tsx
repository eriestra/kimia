"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import { Users } from "lucide-react";
import InviteUserModal from "./InviteUserModal";
import PendingUsersQueue from "./PendingUsersQueue";

const TABS = [
  { id: "all", label: "All Users" },
  { id: "pending", label: "Pending Approval" },
  { id: "invitations", label: "Invitations" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    sysadmin: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    evaluator: "bg-emerald-100 text-emerald-800",
    faculty: "bg-amber-100 text-amber-800",
    finance: "bg-rose-100 text-rose-800",
    observer: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        colors[role] || "bg-gray-100 text-gray-800"
      }`}
    >
      {role.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    invited: "bg-blue-100 text-blue-800",
    suspended: "bg-red-100 text-red-800",
    deactivated: "bg-gray-100 text-gray-800",
  };

  const displayStatus = status || "active";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        colors[displayStatus] || "bg-gray-100 text-gray-800"
      }`}
    >
      {displayStatus}
    </span>
  );
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const allUsers = useQuery(api.users.getAllUsers);
  const pendingUsers = useQuery(api.users.getPendingUsers);
  const invitations = useQuery(api.invitations.listInvitations);

  const pendingCount = pendingUsers?.length || 0;
  const pendingInvitationsCount =
    invitations?.filter((inv: any) => inv.status === "pending").length || 0;

  if (allUsers === undefined || pendingUsers === undefined || invitations === undefined) {
    return (
      <div className="space-y-6">
        <TessellationHeader
          icon={Users}
          title="User Management"
          description="Manage user accounts, invitations, and permissions."
        />
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200 animate-pulse">
          <p className="text-gray-500 text-sm">Loading users…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TessellationHeader
        icon={Users}
        title="User Management"
        description="Invite users, approve registrations, and manage platform access."
        action={
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow transition hover:bg-indigo-50"
          >
            + Invite User
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeCount =
            tab.id === "pending"
              ? pendingCount
              : tab.id === "invitations"
              ? pendingInvitationsCount
              : 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {badgeCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "all" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Campus
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Department
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                allUsers.map((user: any) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">
                          {user.name || "No name"}
                        </span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.campus || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.department || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "pending" && <PendingUsersQueue users={pendingUsers} />}

      {activeTab === "invitations" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Invited By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                    No invitations sent yet.
                  </td>
                </tr>
              ) : (
                invitations.map((invitation: any) => (
                  <tr key={invitation._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={invitation.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={invitation.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium">{invitation.inviterName}</span>
                        <span className="text-xs text-gray-500">
                          {invitation.inviterEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invitation.expiresAt
                        ? new Date(invitation.expiresAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
