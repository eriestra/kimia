"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCw, ChevronUp, ChevronDown } from "lucide-react";

const ROLES = [
  { value: "sysadmin", label: "SysAdmin", short: "SA" },
  { value: "admin", label: "Admin", short: "AD" },
  { value: "evaluator", label: "Evaluator", short: "EV" },
  { value: "faculty", label: "Faculty", short: "FA" },
  { value: "finance", label: "Finance", short: "FI" },
  { value: "observer", label: "Observer", short: "OB" },
] as const;

// Role colors matching the users admin page
const ROLE_COLORS: Record<string, { bg: string; text: string; activeBg: string; activeText: string; border: string }> = {
  sysadmin: { bg: "bg-purple-100", text: "text-purple-800", activeBg: "bg-purple-600", activeText: "text-white", border: "border-purple-500" },
  admin: { bg: "bg-blue-100", text: "text-blue-800", activeBg: "bg-blue-600", activeText: "text-white", border: "border-blue-500" },
  evaluator: { bg: "bg-emerald-100", text: "text-emerald-800", activeBg: "bg-emerald-600", activeText: "text-white", border: "border-emerald-500" },
  faculty: { bg: "bg-amber-100", text: "text-amber-800", activeBg: "bg-amber-600", activeText: "text-white", border: "border-amber-500" },
  finance: { bg: "bg-rose-100", text: "text-rose-800", activeBg: "bg-rose-600", activeText: "text-white", border: "border-rose-500" },
  observer: { bg: "bg-gray-100", text: "text-gray-800", activeBg: "bg-gray-600", activeText: "text-white", border: "border-gray-500" },
};

export default function RoleSwitcher() {
  const user = useQuery(api.users.getCurrentUser);
  const switchRole = useMutation(api.users.switchRole);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if running on localhost
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocalhost(
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      );
    }
  }, []);

  // Only show on localhost
  if (!user || !isLocalhost) {
    return null;
  }

  const handleRoleSwitch = async (newRole: string) => {
    setError("");
    setSwitching(true);
    try {
      await switchRole({ newRole: newRole as any });
      // Force page reload to refresh all queries with new role
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch role");
      setSwitching(false);
    }
  };

  const currentRoleShort = ROLES.find(r => r.value === user.role)?.short || user.role.substring(0, 2).toUpperCase();
  const currentRoleColors = ROLE_COLORS[user.role] || ROLE_COLORS.observer;

  if (!isExpanded) {
    // Compact collapsed state
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 ${currentRoleColors.activeBg} hover:opacity-90 ${currentRoleColors.activeText} rounded-full px-3 py-2 shadow-lg transition-all hover:shadow-xl`}
        title={`Role: ${user.role}`}
      >
        <RefreshCw className="w-3 h-3" />
        <span className="text-xs font-bold">{currentRoleShort}</span>
        <ChevronUp className="w-3 h-3" />
      </button>
    );
  }

  // Expanded state
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-lg border-2 ${currentRoleColors.border} p-3 w-56`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-3 h-3 ${currentRoleColors.text}`} />
            <h3 className="font-semibold text-xs text-gray-900">
              Role Switcher
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600"
            title="Collapse"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="text-xs text-gray-600 mb-2">
          Current: <span className={`font-semibold ${currentRoleColors.text}`}>{user.role}</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {ROLES.map((role) => {
            const roleColors = ROLE_COLORS[role.value] || ROLE_COLORS.observer;
            return (
              <button
                key={role.value}
                onClick={() => handleRoleSwitch(role.value)}
                disabled={switching || role.value === user.role}
                className={`
                  px-2 py-1.5 text-xs rounded font-medium transition-colors
                  ${
                    role.value === user.role
                      ? `${roleColors.activeBg} ${roleColors.activeText} cursor-default`
                      : `${roleColors.bg} ${roleColors.text} hover:opacity-80`
                  }
                  ${switching ? "opacity-50 cursor-not-allowed" : ""}
                `}
                title={role.label}
              >
                {role.short}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {switching && (
          <div className="mt-2 text-xs text-purple-600 text-center">
            Switching...
          </div>
        )}
      </div>
    </div>
  );
}
