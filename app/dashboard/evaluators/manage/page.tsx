"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Users,
  Upload,
  FileText,
  Search,
  Edit,
  Eye,
  Download,
  Trash2,
  Plus,
  Award,
  Building2,
  GraduationCap,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function ManageEvaluatorsPage() {
  const evaluators = useQuery(api.users.getEvaluators);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvaluator, setSelectedEvaluator] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const filteredEvaluators = evaluators?.filter((evaluator: any) =>
    evaluator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evaluator.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evaluator.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (evaluators === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-6 animate-pulse h-32" />
        <div className="rounded-2xl bg-white shadow p-6 space-y-4 animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <TessellationHeader
        icon={Users}
        title="Manage Evaluators"
        description="View and edit evaluator profiles, upload CVs, and manage expertise"
        gradient="from-teal-500/60 via-cyan-500/60 to-blue-500/60"
      />

      {/* Search Bar */}
      <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search evaluators by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border-0 focus:ring-0 text-sm outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Evaluators"
          value={evaluators.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="With CVs"
          value={evaluators.filter((e: any) => e.cvStorageId).length}
          icon={FileText}
          color="emerald"
        />
        <StatCard
          label="Active"
          value={evaluators.filter((e: any) => e.status === "active").length}
          icon={CheckCircle}
          color="teal"
        />
      </div>

      {/* Evaluators Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvaluators?.map((evaluator: any) => (
          <EvaluatorCard
            key={evaluator._id}
            evaluator={evaluator}
            onEdit={() => {
              setSelectedEvaluator(evaluator);
              setShowEditModal(true);
            }}
          />
        ))}
      </div>

      {filteredEvaluators?.length === 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No evaluators found
          </h3>
          <p className="text-sm text-gray-600">
            {searchQuery
              ? "Try adjusting your search criteria"
              : "No evaluators have been added yet"}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEvaluator && (
        <EditEvaluatorModal
          evaluator={selectedEvaluator}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvaluator(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-100 to-blue-200 border-blue-200 text-blue-700",
    emerald: "from-emerald-100 to-emerald-200 border-emerald-200 text-emerald-700",
    teal: "from-teal-100 to-teal-200 border-teal-200 text-teal-700",
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br border p-6 shadow-md ${colorClasses[color]}`}
    >
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

function EvaluatorCard({
  evaluator,
  onEdit,
}: {
  evaluator: any;
  onEdit: () => void;
}) {
  const downloadCV = useMutation(api.users.generateCVDownloadUrl);

  const handleDownloadCV = async () => {
    if (evaluator.cvStorageId) {
      try {
        const url = await downloadCV({ userId: evaluator._id });
        window.open(url, "_blank");
      } catch (error) {
        console.error("Failed to download CV:", error);
        alert("Failed to download CV");
      }
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {evaluator.name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{evaluator.email}</p>
        </div>
        <span
          className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            evaluator.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {evaluator.status || "active"}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        {evaluator.campus && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{evaluator.campus}</span>
          </div>
        )}
        {evaluator.department && (
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{evaluator.department}</span>
          </div>
        )}
        {evaluator.researchAreas && evaluator.researchAreas.length > 0 && (
          <div className="flex items-start gap-2">
            <Award className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1">
                {evaluator.researchAreas.slice(0, 3).map((area: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs"
                  >
                    {area}
                  </span>
                ))}
                {evaluator.researchAreas.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{evaluator.researchAreas.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {evaluator.cvStorageId ? (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">CV Uploaded</span>
            <button
              onClick={handleDownloadCV}
              className="ml-auto text-emerald-600 hover:text-emerald-700"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          {evaluator.cvFileName && (
            <p className="text-xs text-emerald-600 mt-1 truncate">
              {evaluator.cvFileName}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">No CV uploaded</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>
    </div>
  );
}

function EditEvaluatorModal({
  evaluator,
  onClose,
}: {
  evaluator: any;
  onClose: () => void;
}) {
  const [bio, setBio] = useState(evaluator.bio || "");
  const [publications, setPublications] = useState(
    evaluator.publications?.join("\n") || ""
  );
  const [uploading, setUploading] = useState(false);

  const updateProfile = useMutation(api.users.updateEvaluatorProfile);
  const generateUploadUrl = useMutation(api.users.generateCVUploadUrl);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Update profile with CV
      await updateProfile({
        userId: evaluator._id,
        cvStorageId: storageId,
        cvFileName: file.name,
        cvUploadedAt: Date.now(),
      });

      alert("CV uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload CV");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        userId: evaluator._id,
        bio: bio.trim() || undefined,
        publications: publications
          .split("\n")
          .map((p: string) => p.trim())
          .filter(Boolean),
      });
      alert("Profile updated successfully!");
      onClose();
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update profile");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <h2 className="text-xl font-bold text-gray-900">Edit Evaluator Profile</h2>
          <p className="text-sm text-gray-600 mt-1">{evaluator.name}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* CV Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Curriculum Vitae
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">
                        {uploading
                          ? "Uploading..."
                          : evaluator.cvFileName
                          ? evaluator.cvFileName
                          : "Click to upload CV"}
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX (max 10MB)</p>
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Biography */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Biography
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Brief professional biography..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Publications */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Key Publications
              <span className="text-xs text-gray-500 font-normal ml-2">
                (one per line)
              </span>
            </label>
            <textarea
              value={publications}
              onChange={(e) => setPublications(e.target.value)}
              rows={6}
              placeholder="Author, A. (2024). Title of publication..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
