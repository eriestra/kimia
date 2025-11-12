"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserCheck, UserX, Mail, AlertCircle, CheckCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface PendingUsersQueueProps {
  users: any[];
}

export default function PendingUsersQueue({ users }: PendingUsersQueueProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("faculty");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  const handleApprove = async (user: any, role: string) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await approveUser({
        userProfileId: user._id as Id<"userProfiles">,
        role: role as any,
      });

      setSuccess(`${user.email} approved as ${role}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to approve user");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await rejectUser({
        userProfileId: selectedUser._id as Id<"userProfiles">,
        reason: rejectReason,
      });

      setSuccess(`${selectedUser.email} rejected`);
      setShowRejectModal(false);
      setSelectedUser(null);
      setRejectReason("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reject user");
    } finally {
      setLoading(false);
    }
  };

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
        <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No Pending Approvals
        </h3>
        <p className="text-slate-600">
          All user registrations have been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Pending Users Cards */}
      {users.map((user) => (
        <div
          key={user._id}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {user.name || "No name provided"}
                  </h3>
                  <p className="text-sm text-slate-600">{user.email}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Campus:</span>{" "}
                  <span className="text-slate-900">
                    {user.campus || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Department:</span>{" "}
                  <span className="text-slate-900">
                    {user.department || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Registered:</span>{" "}
                  <span className="text-slate-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Role Assignment & Actions */}
          <div className="mt-6 flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="faculty">Faculty</option>
                <option value="evaluator">Evaluator</option>
                <option value="observer">Observer</option>
                <option value="finance">Finance Officer</option>
                <option value="admin">Kimia Admin</option>
                <option value="sysadmin">System Admin</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(user, selectedRole)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => {
                  setSelectedUser(user);
                  setShowRejectModal(true);
                }}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <UserX className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Reject Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Reject User Registration
                  </h3>
                  <p className="text-sm text-slate-600">{selectedUser.email}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this registration is being rejected..."
                  rows={4}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This reason will be logged in the audit trail
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedUser(null);
                    setRejectReason("");
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
