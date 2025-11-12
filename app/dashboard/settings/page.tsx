"use client";

import { useQuery, useMutation } from "convex/react";
import { useStableQuery } from "@/lib/hooks/useStableQuery";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const user = useStableQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateUserProfile);

  const [formData, setFormData] = useState({
    campus: "",
    department: "",
    academicDegree: "",
    researchAreas: [] as string[],
    orcid: "",
    phone: "",
    notificationPreferences: {
      email: true,
      platform: true,
      digest: "none" as "none" | "daily" | "weekly",
    },
  });

  const [researchAreaInput, setResearchAreaInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<{ orcid?: string; phone?: string }>({});

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        campus: user.campus || "",
        department: user.department || "",
        academicDegree: user.academicDegree || "",
        researchAreas: user.researchAreas || [],
        orcid: user.orcid || "",
        phone: user.phone || "",
        notificationPreferences: user.notificationPreferences || {
          email: true,
          platform: true,
          digest: "none",
        },
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: { orcid?: string; phone?: string } = {};
    const orcidPattern = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;
    const phonePattern = /^\+?[0-9\s-]{7,}$/;

    if (formData.orcid && !orcidPattern.test(formData.orcid.trim())) {
      validationErrors.orcid = "Enter a valid ORCID (0000-0000-0000-0000).";
    }

    if (formData.phone && !phonePattern.test(formData.phone.trim())) {
      validationErrors.phone = "Phone number should include at least 7 digits and may start with +.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveMessage({ type: "error", text: "Please correct the highlighted fields." });
      return;
    }

    setErrors({});
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateProfile({
        campus: formData.campus || undefined,
        department: formData.department || undefined,
        academicDegree: formData.academicDegree || undefined,
        researchAreas: formData.researchAreas.length > 0 ? formData.researchAreas : undefined,
        orcid: formData.orcid || undefined,
        phone: formData.phone || undefined,
        notificationPreferences: formData.notificationPreferences,
      });
      setSaveMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      setSaveMessage({ type: "error", text: "Failed to update profile. Please try again." });
      console.error("Profile update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addResearchArea = () => {
    if (researchAreaInput.trim() && !formData.researchAreas.includes(researchAreaInput.trim())) {
      setFormData({
        ...formData,
        researchAreas: [...formData.researchAreas, researchAreaInput.trim()],
      });
      setResearchAreaInput("");
    }
  };

  const removeResearchArea = (area: string) => {
    setFormData({
      ...formData,
      researchAreas: formData.researchAreas.filter((a) => a !== area),
    });
  };

  if (user === undefined) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your contact information and notification preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Read-only fields */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Account Information (Read-only)
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Role</label>
                <p className="text-gray-900 capitalize">{user.role.replace("_", " ")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Member Since</label>
                <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Contact & Academic Information
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="campus" className="block text-sm font-medium text-gray-700 mb-1">
                  Campus
                </label>
                <input
                  type="text"
                  id="campus"
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                  placeholder="e.g., Santiago, Temuco"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department / Faculty
                </label>
                <input
                  type="text"
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Engineering, Education"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="academicDegree" className="block text-sm font-medium text-gray-700 mb-1">
                Academic Degree
              </label>
              <input
                type="text"
                id="academicDegree"
                value={formData.academicDegree}
                onChange={(e) => setFormData({ ...formData, academicDegree: e.target.value })}
                placeholder="e.g., PhD in Computer Science"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="researchAreas" className="block text-sm font-medium text-gray-700 mb-1">
                Research Areas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  id="researchAreas"
                  value={researchAreaInput}
                  onChange={(e) => setResearchAreaInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addResearchArea();
                    }
                  }}
                  placeholder="Add research area and press Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addResearchArea}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.researchAreas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.researchAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeResearchArea(area)}
                        className="text-blue-600 hover:text-blue-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="orcid" className="block text-sm font-medium text-gray-700 mb-1">
                  ORCID iD
                </label>
                <input
                  type="text"
                  id="orcid"
                  value={formData.orcid}
                  onChange={(e) => {
                    setFormData({ ...formData, orcid: e.target.value });
                    if (errors.orcid) {
                      setErrors((prev) => ({ ...prev, orcid: undefined }));
                    }
                  }}
                  placeholder="0000-0000-0000-0000"
                  className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none ${
                    errors.orcid
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                />
                {errors.orcid && (
                  <p className="mt-1 text-xs text-red-600">{errors.orcid}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) {
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="+56 9 1234 5678"
                  className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none ${
                    errors.phone
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notification preferences */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Notification Preferences
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.notificationPreferences.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notificationPreferences: {
                        ...formData.notificationPreferences,
                        email: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Receive email notifications</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.notificationPreferences.platform}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notificationPreferences: {
                        ...formData.notificationPreferences,
                        platform: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Receive in-app notifications</span>
              </label>

              <div>
                <label htmlFor="digest" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Digest
                </label>
                <select
                  id="digest"
                  value={formData.notificationPreferences.digest}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notificationPreferences: {
                        ...formData.notificationPreferences,
                        digest: e.target.value as "none" | "daily" | "weekly",
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">None - Send notifications immediately</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save message */}
          {saveMessage && (
            <div
              role={saveMessage.type === "success" ? "status" : "alert"}
              className={`p-4 rounded-lg ${
                saveMessage.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
