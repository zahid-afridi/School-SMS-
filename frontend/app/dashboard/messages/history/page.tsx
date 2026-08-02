"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import PageLoader from "@/app/components/PageLoader";
import { useGetWhatsAppMessagesQuery } from "@/redux/features/messages/messageApi";
import type {
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from "@/redux/features/messages/messageTypes";

const TYPES: Array<WhatsAppMessageType | ""> = [
  "",
  "CUSTOM",
  "ATTENDANCE",
  "FEES",
  "RESULT",
  "ANNOUNCEMENT",
];

const STATUSES: Array<WhatsAppMessageStatus | ""> = [
  "",
  "PENDING",
  "SENT",
  "FAILED",
  "DELIVERED",
];

function statusTone(status: string) {
  if (status === "SENT" || status === "DELIVERED")
    return "text-emerald-700 bg-emerald-50";
  if (status === "FAILED") return "text-rose-700 bg-rose-50";
  return "text-amber-700 bg-amber-50";
}

export default function MessageHistoryPage() {
  const [search, setSearch] = useState("");
  const [messageType, setMessageType] = useState<WhatsAppMessageType | "">("");
  const [status, setStatus] = useState<WhatsAppMessageStatus | "">("");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      messageType: messageType || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [search, messageType, status, page]
  );

  const { data, isLoading, isError, isFetching } =
    useGetWhatsAppMessagesQuery(query);

  const messages = data?.messages ?? [];
  const pagination = data?.pagination;

  return (
    <div className="w-full min-w-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/dashboard/messages"
              className="text-sm text-sky-700 hover:underline"
            >
              ← Messages
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              Message History
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Search, filter, and review delivery status of WhatsApp messages
            </p>
          </div>
          <Link
            href="/dashboard/messages/send"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700"
          >
            Send Message
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="relative md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search phone, student, message…"
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <select
            value={messageType}
            onChange={(e) => {
              setMessageType(e.target.value as WhatsAppMessageType | "");
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            {TYPES.map((t) => (
              <option key={t || "all-types"} value={t}>
                {t || "All types"}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as WhatsAppMessageStatus | "");
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            {STATUSES.map((s) => (
              <option key={s || "all-status"} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <PageLoader compact label="Loading history" />
            </div>
          ) : isError ? (
            <div className="px-4 py-10 text-center text-red-500">
              Failed to load message history.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Message</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Message ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-slate-400"
                        >
                          No messages found
                        </td>
                      </tr>
                    ) : (
                      messages.map((msg) => (
                        <tr key={msg.id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {new Date(msg.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">{msg.messageType}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {msg.phone}
                          </td>
                          <td className="px-4 py-3">
                            {msg.student?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="line-clamp-2 text-slate-700">
                              {msg.message}
                            </p>
                            {msg.error ? (
                              <p className="text-xs text-rose-600 mt-1 line-clamp-2">
                                {msg.error}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${statusTone(msg.status)}`}
                            >
                              {msg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {msg.messageId ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
                  <p className="text-slate-500">
                    Page {pagination.page} of {pagination.totalPages} ·{" "}
                    {pagination.total} total
                    {isFetching ? " · refreshing…" : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= (pagination.totalPages || 1)}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
