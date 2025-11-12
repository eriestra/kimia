"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import TessellationHeader from "@/components/TessellationHeader";
import {
  Sparkles,
  Plus,
  Save,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Target,
  Layers,
} from "lucide-react";

const NEW_TEMPLATE = "__new__";

const CRITERION_TYPE_OPTIONS = [
  { value: "innovation", label: "Innovation" },
  { value: "feasibility", label: "Feasibility" },
  { value: "impact", label: "Impact" },
  { value: "methodology", label: "Methodology" },
  { value: "budget", label: "Budget" },
  { value: "team", label: "Team" },
  { value: "sustainability", label: "Sustainability" },
];

const DEFAULT_SCALE = [
  { score: 1, descriptor: "Insufficient" },
  { score: 2, descriptor: "Needs improvement" },
  { score: 3, descriptor: "Meets expectations" },
  { score: 4, descriptor: "Exceeds expectations" },
  { score: 5, descriptor: "Outstanding" },
];

const createLocalId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type ScaleRow = {
  id: string;
  score: number;
  descriptor: string;
};

type CriterionForm = {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  type: string;
  requireComments: boolean;
  scale: ScaleRow[];
};

type EditorState = {
  templateId: string | null;
  name: string;
  description: string;
  version: number;
  criteria: CriterionForm[];
};

function createScaleRow(score = 1, descriptor = ""): ScaleRow {
  return {
    id: createLocalId(),
    score,
    descriptor,
  };
}

function createDefaultCriterion(weight = 20): CriterionForm {
  return {
    id: createLocalId(),
    name: "",
    description: "",
    weight,
    maxScore: 5,
    type: CRITERION_TYPE_OPTIONS[0].value,
    requireComments: false,
    scale: DEFAULT_SCALE.map((entry) => createScaleRow(entry.score, entry.descriptor)),
  };
}

function createEmptyEditor(): EditorState {
  return {
    templateId: null,
    name: "",
    description: "",
    version: 1,
    criteria: [createDefaultCriterion(100)],
  };
}

function mapTemplateToEditor(template: any): EditorState {
  return {
    templateId: String(template._id),
    name: template.name ?? "",
    description: template.description ?? "",
    version: template.version ?? 1,
    criteria: (template.criteria ?? []).map((criterion: any) => ({
      id: createLocalId(),
      name: criterion.name ?? "",
      description: criterion.description ?? "",
      weight: Number(criterion.weight ?? 0),
      maxScore: Number(criterion.maxScore ?? 5),
      type: criterion.type ?? CRITERION_TYPE_OPTIONS[0].value,
      requireComments: Boolean(criterion.requireComments),
      scale: (criterion.scale ?? []).map((entry: any) =>
        createScaleRow(Number(entry.score ?? 0), entry.descriptor ?? "")
      ),
    })),
  };
}

function normalizeNumber(value: number | string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export default function RubricBuilderPage() {
  const currentUser = useQuery(api.users.getCurrentUser);

  const canAdmin =
    currentUser !== undefined &&
    currentUser !== null &&
    (currentUser.role === "sysadmin" || currentUser.role === "admin");

  const templates = useQuery(api.rubrics.listTemplates, canAdmin ? undefined : "skip");

  const createTemplate = useMutation(api.rubrics.createTemplate);
  const updateTemplate = useMutation(api.rubrics.updateTemplate);
  const duplicateTemplate = useMutation(api.rubrics.duplicateTemplate);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(createEmptyEditor());
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canAdmin) {
      return;
    }
    if (!Array.isArray(templates)) {
      return;
    }

    if (templates.length === 0) {
      setSelectedTemplateId(NEW_TEMPLATE);
      setEditorState(createEmptyEditor());
      return;
    }

    if (selectedTemplateId === null) {
      const first = templates[0];
      setSelectedTemplateId(String(first._id));
      setEditorState(mapTemplateToEditor(first));
      return;
    }

    if (selectedTemplateId === NEW_TEMPLATE) {
      setEditorState(createEmptyEditor());
      return;
    }

    const template = templates.find((entry: any) => String(entry._id) === selectedTemplateId);
    if (template) {
      setEditorState(mapTemplateToEditor(template));
    } else {
      const first = templates[0];
      setSelectedTemplateId(String(first._id));
      setEditorState(mapTemplateToEditor(first));
    }
  }, [templates, canAdmin, selectedTemplateId]);

  const totalWeight = useMemo(
    () => editorState.criteria.reduce((sum, criterion) => sum + normalizeNumber(criterion.weight), 0),
    [editorState.criteria]
  );

  const weightBalanced = Math.abs(totalWeight - 100) <= 0.5;

  const templatesList = Array.isArray(templates) ? templates : [];

  const handleSelectTemplate = (templateId: string) => {
    setStatus(null);
    setSelectedTemplateId(templateId);
  };

  const handleNewTemplate = () => {
    setStatus(null);
    setSelectedTemplateId(NEW_TEMPLATE);
    setEditorState(createEmptyEditor());
  };

  const handleCriterionChange = (criterionId: string, updates: Partial<CriterionForm>) => {
    setEditorState((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, ...updates } : criterion
      ),
    }));
  };

  const handleScaleChange = (criterionId: string, scaleId: string, updates: Partial<ScaleRow>) => {
    setEditorState((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion) => {
        if (criterion.id !== criterionId) {
          return criterion;
        }
        return {
          ...criterion,
          scale: criterion.scale.map((row) =>
            row.id === scaleId ? { ...row, ...updates } : row
          ),
        };
      }),
    }));
  };

  const handleAddCriterion = () => {
    setEditorState((prev) => ({
      ...prev,
      criteria: [...prev.criteria, createDefaultCriterion(0)],
    }));
  };

  const handleRemoveCriterion = (criterionId: string) => {
    setEditorState((prev) => {
      if (prev.criteria.length === 1) {
        return prev;
      }
      return {
        ...prev,
        criteria: prev.criteria.filter((criterion) => criterion.id !== criterionId),
      };
    });
  };

  const handleAddScaleRow = (criterionId: string) => {
    setEditorState((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion) =>
        criterion.id === criterionId
          ? {
              ...criterion,
              scale: [...criterion.scale, createScaleRow(criterion.scale.length + 1, "")],
            }
          : criterion
      ),
    }));
  };

  const handleRemoveScaleRow = (criterionId: string, scaleId: string) => {
    setEditorState((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion) => {
        if (criterion.id !== criterionId) {
          return criterion;
        }
        if (criterion.scale.length <= 1) {
          return criterion;
        }
        return {
          ...criterion,
          scale: criterion.scale.filter((row) => row.id !== scaleId),
        };
      }),
    }));
  };

  const validateEditor = () => {
    const errors: string[] = [];
    if (!editorState.name.trim()) {
      errors.push("Rubric name is required.");
    }
    if (editorState.criteria.length === 0) {
      errors.push("Add at least one evaluation criterion.");
    }
    for (const criterion of editorState.criteria) {
      if (!criterion.name.trim()) {
        errors.push("Every criterion must have a name.");
        break;
      }
      if (criterion.scale.length === 0) {
        errors.push(`Add at least one scale descriptor for "${criterion.name || "criterion"}".`);
        break;
      }
      const missingDescriptor = criterion.scale.some((row) => !row.descriptor.trim());
      if (missingDescriptor) {
        errors.push(`Each scale descriptor must include text for "${criterion.name || "criterion"}".`);
        break;
      }
    }
    if (!weightBalanced) {
      errors.push(`Criterion weights must total 100%. Current total is ${totalWeight.toFixed(1)}%.`);
    }
    return errors;
  };

  const mapEditorToPayload = () => ({
    name: editorState.name.trim(),
    description: editorState.description.trim(),
    criteria: editorState.criteria.map((criterion) => ({
      name: criterion.name.trim(),
      description: criterion.description.trim(),
      weight: normalizeNumber(criterion.weight),
      maxScore: normalizeNumber(criterion.maxScore),
      type: criterion.type,
      requireComments: Boolean(criterion.requireComments),
      scale: criterion.scale.map((row) => ({
        score: normalizeNumber(row.score),
        descriptor: row.descriptor.trim(),
      })),
    })),
  });

  const handleSave = async () => {
    setStatus(null);
    const errors = validateEditor();
    if (errors.length > 0) {
      setStatus({ type: "error", message: errors[0] });
      return;
    }

    const payload = mapEditorToPayload();
    setSaving(true);
    try {
      if (selectedTemplateId === NEW_TEMPLATE || editorState.templateId === null) {
        const newId = await createTemplate(payload);
        setStatus({ type: "success", message: "Rubric created successfully." });
        setSelectedTemplateId(String(newId));
      } else {
        await updateTemplate({
          templateId: editorState.templateId as Id<"rubricTemplates">,
          ...payload,
        });
        setStatus({ type: "success", message: "Rubric updated successfully." });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save rubric.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setStatus(null);
    if (!editorState.templateId) {
      setStatus({ type: "error", message: "Select a rubric template before duplicating." });
      return;
    }
    const duplicateName = editorState.name
      ? `${editorState.name} Copy`
      : "New Rubric Copy";
    try {
      const newId = await duplicateTemplate({
        templateId: editorState.templateId as Id<"rubricTemplates">,
        name: duplicateName,
      });
      setStatus({ type: "success", message: "Rubric duplicated. You are now editing the copy." });
      setSelectedTemplateId(String(newId));
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to duplicate rubric.",
      });
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="space-y-6">
        <TessellationHeader
          icon={Sparkles}
          title="Rubric Builder"
          description="Design evaluation templates for your calls."
        />
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6 animate-pulse">
          <p className="text-sm text-gray-500">Loading access…</p>
        </div>
      </div>
    );
  }

  if (!canAdmin) {
    return (
      <div className="space-y-6">
        <TessellationHeader
          icon={Sparkles}
          title="Rubric Builder"
          description="Design evaluation templates for your calls."
        />
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-red-700">
          <h2 className="text-lg font-semibold">Admin access required</h2>
          <p className="text-sm mt-2">
            Only system or DOCENTIA administrators can manage rubric templates. Please contact an administrator if you
            need assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TessellationHeader
        icon={Sparkles}
        gradient="from-purple-500/60 via-violet-500/60 to-indigo-500/60"
        title="Rubric Builder"
        description="Craft reusable evaluation templates and ensure consistent reviewer guidance."
      />

      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
            status.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Templates
              </h2>
              <button
                type="button"
                onClick={handleNewTemplate}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {templatesList.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">
                  No rubric templates yet. Create a new template to get started.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {templatesList.map((template: any) => {
                    const isActive = selectedTemplateId === String(template._id);
                    return (
                      <li key={template._id}
                        className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                          isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
                        }`}
                        onClick={() => handleSelectTemplate(String(template._id))}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{template.name}</span>
                          <span className="text-xs text-gray-500">v{template.version ?? 1}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.criteria?.length ?? 0} criteria • Updated {new Date(template.updatedAt ?? template.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-900 mb-1">Tips</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Weights must total 100% for balanced scoring.</li>
              <li>Max score defines the available points for each criterion.</li>
              <li>Use scale descriptors to guide evaluators’ qualitative feedback.</li>
            </ul>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedTemplateId === NEW_TEMPLATE ? "New rubric template" : editorState.name || "Untitled rubric"}
              </h2>
              <p className="text-sm text-gray-500">Define evaluation criteria, weight distribution, and scoring guidance.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedTemplateId !== NEW_TEMPLATE && (
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save rubric"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  Rubric name
                </span>
                <input
                  type="text"
                  value={editorState.name}
                  onChange={(event) => setEditorState((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Innovation Rubric 2025"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700">Description</span>
                <input
                  type="text"
                  value={editorState.description}
                  onChange={(event) => setEditorState((prev) => ({ ...prev, description: event.target.value }))}
                  className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Used for research grant proposals"
                />
              </label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-700">Total weight:</span>
              <span className={`font-semibold ${weightBalanced ? "text-green-600" : "text-red-600"}`}>
                {totalWeight.toFixed(1)}%
              </span>
              {!weightBalanced && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Weights must add to 100%
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {editorState.criteria.map((criterion, index) => (
              <div key={criterion.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Criterion {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(criterion.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-gray-700">Name</span>
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(event) => handleCriterionChange(criterion.id, { name: event.target.value })}
                      className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      placeholder="Innovation & Originality"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-gray-700">Type</span>
                    <select
                      value={criterion.type}
                      onChange={(event) => handleCriterionChange(criterion.id, { type: event.target.value })}
                      className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    >
                      {CRITERION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-gray-700">Weight (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={criterion.weight}
                      onChange={(event) => handleCriterionChange(criterion.id, { weight: Number(event.target.value) })}
                      className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-gray-700">Max score</span>
                    <input
                      type="number"
                      min={1}
                      value={criterion.maxScore}
                      onChange={(event) => handleCriterionChange(criterion.id, { maxScore: Number(event.target.value) })}
                      className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={criterion.requireComments}
                    onChange={(event) => handleCriterionChange(criterion.id, { requireComments: event.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Require evaluator comments
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-700">Descriptor</span>
                  <textarea
                    value={criterion.description}
                    onChange={(event) => handleCriterionChange(criterion.id, { description: event.target.value })}
                    rows={3}
                    className="rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    placeholder="Detail how evaluators should assess this criterion."
                  />
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Scale descriptors</span>
                    <button
                      type="button"
                      onClick={() => handleAddScaleRow(criterion.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" />
                      Add row
                    </button>
                  </div>
                  <div className="space-y-2">
                    {criterion.scale.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[80px_1fr_auto]">
                        <input
                          type="number"
                          min={0}
                          className="rounded-xl border-2 border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                          value={row.score}
                          onChange={(event) =>
                            handleScaleChange(criterion.id, row.id, { score: Number(event.target.value) })
                          }
                        />
                        <input
                          type="text"
                          className="rounded-xl border-2 border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                          value={row.descriptor}
                          onChange={(event) =>
                            handleScaleChange(criterion.id, row.id, { descriptor: event.target.value })
                          }
                          placeholder="Descriptor"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveScaleRow(criterion.id, row.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddCriterion}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Add criterion
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
