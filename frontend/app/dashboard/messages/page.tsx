"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import PageLoader from "@/app/components/PageLoader";
import {
  FaBullhorn,
  FaClipboardList,
  FaComments,
  FaExclamationTriangle,
  FaGraduationCap,
  FaHistory,
  FaMoneyBillWave,
  FaPaperPlane,
} from "react-icons/fa";
import { useGetWhatsAppStatsQuery } from "@/redux/features/messages/messageApi";

function statusTone(status: string) {
  if (status === "SENT" || status === "DELIVERED") return "text-emerald-700 bg-emerald-50";
  if (status === "FAILED") return "text-rose-700 bg-rose-50";
  return "text-amber-700 bg-amber-50";
}

export default function MessagesOverviewPage() {
  const { data, isLoading, isError } = useGetWhatsAppStatsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading messages" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">Failed to load messages overview.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 mb-2">
              WhatsApp Messaging
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Messages Overview
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Send parent notifications and track delivery history
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
            <Link
              href="/dashboard/messages/send"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              <FaPaperPlane size={12} /> Send Message
            </Link>
            <Link
              href="/dashboard/messages/history"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700"
            >
              <FaHistory size={14} /> History
            </Link>
          </div>
        </div>

        {!data.configured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-3 items-start">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <div>
              OpenWA is not fully configured. Set{" "}
              <code className="font-mono">OPENWA_URL</code>,{" "}
              <code className="font-mono">OPENWA_API_KEY</code>, and{" "}
              <code className="font-mono">OPENWA_SESSION_ID</code> in the backend
              .env file.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total" value={String(data.totals.total)} />
          <StatCard label="Sent" value={String(data.totals.sent)} tone="emerald" />
          <StatCard label="Delivered" value={String(data.totals.delivered)} tone="sky" />
          <StatCard label="Pending" value={String(data.totals.pending)} tone="amber" />
          <StatCard label="Failed" value={String(data.totals.failed)} tone="rose" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <NavTile
            href="/dashboard/messages/send"
            title="Custom Message"
            desc="Send any WhatsApp text to a parent"
            icon={<FaComments className="text-sky-600" />}
          />
          <NavTile
            href="/dashboard/messages/attendance"
            title="Attendance Notice"
            desc="Notify parents about absences"
            icon={<FaClipboardList className="text-orange-600" />}
          />
          <NavTile
            href="/dashboard/messages/fees"
            title="Fee Reminder"
            desc="Remind parents about due fees"
            icon={<FaMoneyBillWave className="text-emerald-600" />}
          />
          <NavTile
            href="/dashboard/messages/results"
            title="Result Notice"
            desc="Announce published exam results"
            icon={<FaGraduationCap className="text-indigo-600" />}
          />
          <NavTile
            href="/dashboard/messages/announcement"
            title="Announcement"
            desc="Broadcast a school announcement"
            icon={<FaBullhorn className="text-rose-600" />}
          />
          <NavTile
            href="/dashboard/messages/history"
            title="Message History"
            desc="Search, filter, and check status"
            icon={<FaHistory className="text-slate-600" />}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent messages</h2>
            <Link
              href="/dashboard/messages/history"
              className="text-sm text-sky-700 font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No messages sent yet
                    </td>
                  </tr>
                ) : (
                  data.recent.map((msg) => (
                    <tr key={msg.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {new Date(msg.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{msg.messageType}</td>
                      <td className="px-4 py-3 font-mono text-xs">{msg.phone}</td>
                      <td className="px-4 py-3">
                        {msg.student?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${statusTone(msg.status)}`}
                        >
                          {msg.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "sky" | "amber" | "rose";
}) {
  const tones = {
    slate: "bg-white border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-900",
    sky: "bg-sky-50 border-sky-100 text-sky-900",
    amber: "bg-amber-50 border-amber-100 text-amber-900",
    rose: "bg-rose-50 border-rose-100 text-rose-900",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function NavTile({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
