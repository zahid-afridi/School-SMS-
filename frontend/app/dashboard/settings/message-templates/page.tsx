"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaSave, FaTrash } from "react-icons/fa";
import PageLoader from "@/app/components/PageLoader";
import {
  useDeleteMessageTemplateMutation,
  useGetMessageTemplatesQuery,
  useSaveMessageTemplatesMutation,
} from "@/redux/features/messages/messageApi";
import type { MessageTemplate } from "@/redux/features/messages/messageTypes";

const VARS = [
  "studentName",
  "parentName",
  "employeeName",
  "amount",
  "dueDate",
  "announcement",
  "message",
];

export default function MessageTemplatesPage() {
  const { data, isLoading, isError } = useGetMessageTemplatesQuery();
  const [saveTemplates, { isLoading: saving }] = useSaveMessageTemplatesMutation();
  const [deleteTemplate, { isLoading: deleting }] =
    useDeleteMessageTemplateMutation();
  const [drafts, setDrafts] = useState<MessageTemplate[]>([]);
  const [newName, setNewName] = useState("");
  const [newBody, setNewBody] = useState("");

  useEffect(() => {
    if (data) setDrafts(data);
  }, [data]);

  const updateDraft = (id: string, patch: Partial<MessageTemplate>) => {
    setDrafts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleSaveAll = async () => {
    try {
      await saveTemplates({
        templates: drafts.map((t) => ({
          key: t.key,
          name: t.name,
          body: t.body,
          isActive: t.isActive,
        })),
      }).unwrap();
      toast.success("Templates saved");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message || "Save failed"
      );
    }
  };

  const handleAddCustom = async () => {
    if (!newName.trim() || !newBody.trim()) {
      toast.error("Name and body are required");
      return;
    }
    const key = `custom-${newName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    try {
      await saveTemplates({
        templates: [
          {
            key,
            name: newName.trim(),
            body: newBody.trim(),
            isActive: true,
          },
        ],
      }).unwrap();
      setNewName("");
      setNewBody("");
      toast.success("Custom template added");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message || "Add failed"
      );
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteTemplate(key).unwrap();
      toast.success("Template deleted");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message || "Delete failed"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading templates" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-rose-600">Failed to load templates</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-blue-700 bg-blue-50 mb-2">
              General Settings
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Message Templates
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Edit attendance, fees, results, and custom WhatsApp texts for your school.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            <FaSave size={13} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-2">Available variables</p>
          <div className="flex flex-wrap gap-2">
            {VARS.map((v) => (
              <code
                key={v}
                className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
              >
                {`{{${v}}}`}
              </code>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {drafts.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t.isSystem ? "System" : "Custom"} · {t.key}
                  </p>
                  <input
                    value={t.name}
                    onChange={(e) => updateDraft(t.id, { name: e.target.value })}
                    className="mt-1 text-lg font-semibold text-slate-900 bg-transparent outline-none border-b border-transparent focus:border-blue-400 w-full max-w-md"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={t.isActive}
                      onChange={(e) =>
                        updateDraft(t.id, { isActive: e.target.checked })
                      }
                    />
                    Active
                  </label>
                  {!t.isSystem && (
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void handleDelete(t.key)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      <FaTrash size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={t.body}
                onChange={(e) => updateDraft(t.id, { body: e.target.value })}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-5 md:p-6 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FaPlus className="text-blue-600" size={13} /> Add custom template
          </h2>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name"
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            placeholder="Dear Parent, …"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => void handleAddCustom()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            <FaPlus size={11} /> Add template
          </button>
        </div>
      </div>
    </div>
  );
}
