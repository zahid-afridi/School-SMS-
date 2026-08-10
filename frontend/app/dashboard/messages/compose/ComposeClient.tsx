"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaBullhorn,
  FaCheck,
  FaClipboardList,
  FaComments,
  FaGraduationCap,
  FaMoneyBillWave,
  FaPaperPlane,
} from "react-icons/fa";
import RecipientPicker from "@/app/components/messages/RecipientPicker";
import {
  useGetMessageTemplatesQuery,
  useSendAnnouncementWhatsAppMutation,
  useSendAttendanceWhatsAppMutation,
  useSendCustomWhatsAppMutation,
  useSendFeesWhatsAppMutation,
  useSendResultWhatsAppMutation,
} from "@/redux/features/messages/messageApi";
import type {
  MessageRecipient,
  WhatsAppMessageType,
} from "@/redux/features/messages/messageTypes";

const TYPES: Array<{
  id: WhatsAppMessageType;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "CUSTOM", label: "Custom", icon: <FaComments size={13} /> },
  { id: "ATTENDANCE", label: "Attendance", icon: <FaClipboardList size={13} /> },
  { id: "FEES", label: "Fees", icon: <FaMoneyBillWave size={13} /> },
  { id: "RESULT", label: "Result", icon: <FaGraduationCap size={13} /> },
  { id: "ANNOUNCEMENT", label: "Announcement", icon: <FaBullhorn size={13} /> },
];

function renderPreview(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export default function ComposeMessagePage() {
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type")?.toUpperCase() ||
    "CUSTOM") as WhatsAppMessageType;

  const [type, setType] = useState<WhatsAppMessageType>(
    TYPES.some((t) => t.id === initialType) ? initialType : "CUSTOM"
  );
  const [recipient, setRecipient] = useState<MessageRecipient | null>(null);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [multiRecipients, setMultiRecipients] = useState<MessageRecipient[]>([]);

  const { data: templates = [] } = useGetMessageTemplatesQuery();
  const [sendCustom, { isLoading: sendingCustom }] = useSendCustomWhatsAppMutation();
  const [sendAttendance, { isLoading: sendingAtt }] =
    useSendAttendanceWhatsAppMutation();
  const [sendFees, { isLoading: sendingFees }] = useSendFeesWhatsAppMutation();
  const [sendResult, { isLoading: sendingResult }] = useSendResultWhatsAppMutation();
  const [sendAnnouncement, { isLoading: sendingAnn }] =
    useSendAnnouncementWhatsAppMutation();

  const sending =
    sendingCustom || sendingAtt || sendingFees || sendingResult || sendingAnn;

  useEffect(() => {
    if (TYPES.some((t) => t.id === initialType)) setType(initialType);
  }, [initialType]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.key === type && t.isActive),
    [templates, type]
  );

  const previewVars = useMemo(
    () => ({
      studentName: recipient?.studentName || "Ali",
      parentName: recipient?.parentName || "Parent",
      employeeName: recipient?.employeeName || "Teacher",
      amount: amount || "5000",
      dueDate: dueDate || "01 Aug 2026",
      announcement: announcement || "School will remain closed tomorrow.",
      message: message || "Your custom message…",
    }),
    [recipient, amount, dueDate, announcement, message]
  );

  const preview = useMemo(() => {
    if (type === "CUSTOM" && message.trim()) {
      const body = activeTemplate?.body || "{{message}}";
      return body.includes("{{message}}")
        ? renderPreview(body, previewVars)
        : message.trim();
    }
    if (type === "ANNOUNCEMENT") {
      return renderPreview(activeTemplate?.body || "{{announcement}}", previewVars);
    }
    if (type === "FEES") {
      return renderPreview(
        activeTemplate?.body ||
          "Dear Parent, your child's fee of Rs. {{amount}} is due on {{dueDate}}.",
        previewVars
      );
    }
    if (type === "ATTENDANCE") {
      return renderPreview(
        activeTemplate?.body ||
          "Dear Parent, your child {{studentName}} was marked absent today.",
        previewVars
      );
    }
    if (type === "RESULT") {
      return renderPreview(
        activeTemplate?.body ||
          "Dear Parent, the exam result for {{studentName}} has been published.",
        previewVars
      );
    }
    return activeTemplate?.body || "";
  }, [type, message, activeTemplate, previewVars]);

  const needsStudent = type === "ATTENDANCE" || type === "RESULT";
  const isAnnouncementMulti = type === "ANNOUNCEMENT";

  const toggleMulti = (r: MessageRecipient) => {
    const key = r.studentId || r.employeeId || r.id;
    setMultiRecipients((prev) => {
      const exists = prev.some(
        (x) => (x.studentId || x.employeeId || x.id) === key
      );
      if (exists) {
        return prev.filter((x) => (x.studentId || x.employeeId || x.id) !== key);
      }
      return [...prev, r];
    });
    setMultiIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === "CUSTOM") {
        if (!message.trim()) {
          toast.error("Enter a message");
          return;
        }
        if (!recipient?.phone && !recipient?.studentId && !recipient?.employeeId) {
          toast.error("Select a recipient");
          return;
        }
        await sendCustom({
          message: message.trim(),
          studentId: recipient.studentId,
          employeeId: recipient.employeeId,
          phone: recipient.role === "other" ? recipient.phone : undefined,
        }).unwrap();
      } else if (type === "ATTENDANCE") {
        if (!recipient?.studentId) {
          toast.error("Select a student");
          return;
        }
        await sendAttendance({
          studentId: recipient.studentId,
          studentName: recipient.studentName,
        }).unwrap();
      } else if (type === "FEES") {
        if (!amount || !dueDate) {
          toast.error("Amount and due date are required");
          return;
        }
        if (!recipient?.studentId && !recipient?.phone) {
          toast.error("Select a student or parent");
          return;
        }
        await sendFees({
          amount,
          dueDate,
          studentId: recipient.studentId,
          phone: recipient.studentId ? undefined : recipient.phone,
        }).unwrap();
      } else if (type === "RESULT") {
        if (!recipient?.studentId) {
          toast.error("Select a student");
          return;
        }
        await sendResult({
          studentId: recipient.studentId,
          studentName: recipient.studentName,
        }).unwrap();
      } else if (type === "ANNOUNCEMENT") {
        if (!announcement.trim()) {
          toast.error("Enter announcement text");
          return;
        }
        const studentIds = multiRecipients
          .map((r) => r.studentId)
          .filter(Boolean) as string[];
        const employeeIds = multiRecipients
          .filter((r) => r.employeeId && !r.studentId)
          .map((r) => r.employeeId!);
        if (studentIds.length === 0 && employeeIds.length === 0 && !recipient) {
          toast.error("Select at least one recipient");
          return;
        }
        await sendAnnouncement({
          announcement: announcement.trim(),
          studentIds: studentIds.length ? studentIds : undefined,
          employeeIds: employeeIds.length ? employeeIds : undefined,
          studentId: !studentIds.length ? recipient?.studentId : undefined,
          employeeId: !employeeIds.length ? recipient?.employeeId : undefined,
          phone: recipient?.role === "other" ? recipient.phone : undefined,
        }).unwrap();
      }

      toast.success("Message sent");
      setMessage("");
      setAnnouncement("");
      setAmount("");
      setDueDate("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ||
          "Failed to send message"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-sky-700 bg-sky-50 mb-2">
              Messages
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Compose message
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Search students, parents, or teachers — phone is locked from their profile.
            </p>
          </div>
          <Link
            href="/dashboard/messages"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sky-700"
          >
            <FaArrowLeft size={12} /> Overview
          </Link>
        </div>

        <form
          onSubmit={handleSend}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="flex flex-wrap gap-1 p-3 border-b border-slate-100 bg-slate-50/80">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setType(t.id);
                  setRecipient(null);
                  setMultiIds([]);
                  setMultiRecipients([]);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  type === t.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-7 space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                1. Choose recipient
                {isAnnouncementMulti ? " (multi-select)" : ""}
              </h2>
              <RecipientPicker
                value={recipient}
                onChange={setRecipient}
                allowOther={type === "CUSTOM" || type === "ANNOUNCEMENT"}
                multi={isAnnouncementMulti}
                selectedIds={multiIds}
                onToggleMulti={toggleMulti}
              />
              {isAnnouncementMulti && multiRecipients.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Selected: {multiRecipients.length} recipient
                  {multiRecipients.length === 1 ? "" : "s"}
                </p>
              )}
              {needsStudent && recipient && !recipient.studentId && (
                <p className="text-xs text-amber-700 mt-2">
                  This message type needs a student-linked recipient.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">2. Message</h2>

              {type === "CUSTOM" && (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Write your message…"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 resize-y min-h-[120px]"
                  required
                />
              )}

              {type === "ANNOUNCEMENT" && (
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  rows={5}
                  placeholder="School announcement…"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 resize-y min-h-[120px]"
                  required
                />
              )}

              {type === "FEES" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      Amount
                    </label>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="5000"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      Due date
                    </label>
                    <input
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="01 Aug 2026"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>
              )}

              {(type === "ATTENDANCE" || type === "RESULT") && (
                <p className="text-sm text-slate-500">
                  Uses your school template from{" "}
                  <Link
                    href="/dashboard/settings/message-templates"
                    className="text-sky-700 font-semibold hover:underline"
                  >
                    Message Templates
                  </Link>
                  .
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Preview
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {preview || "—"}
              </p>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <Link
                href="/dashboard/settings/message-templates"
                className="text-xs font-semibold text-slate-500 hover:text-sky-700"
              >
                Edit templates
              </Link>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-6 h-11 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
              >
                {sending ? (
                  "Sending…"
                ) : (
                  <>
                    <FaPaperPlane size={12} /> Send WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <FaCheck className="text-emerald-500" />
          Selected profile phones cannot be edited — they come from student/parent/employee records.
        </div>
      </div>
    </div>
  );
}
