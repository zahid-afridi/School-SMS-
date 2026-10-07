"use client";

import PageLoader from "@/app/components/PageLoader";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaPhone, FaSearch, FaWhatsapp } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetFeeDefaultersQuery } from "@/redux/features/fees/feeApi";
import { useSendFeesWhatsAppMutation } from "@/redux/features/messages/messageApi";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function DefaultersPage() {
  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useGetFeeDefaultersQuery(
    classId ? { classId } : undefined
  );
  const [sendWhatsApp, { isLoading: sendingWhatsApp }] =
    useSendFeesWhatsAppMutation();

  const handleSendWhatsApp = async (
    studentId: string,
    studentName: string,
    amount: number,
    dueDate?: string | null
  ) => {
    try {
      await sendWhatsApp({
        studentId,
        amount,
        dueDate: dueDate || "Immediate",
      }).unwrap();
      toast.success(`WhatsApp fee reminder sent to ${studentName}!`);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to send WhatsApp reminder. Check WhatsApp session under Messages."
      );
    }
  };

  const defaulters =
    data?.defaulters.filter((d) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        d.student.name.toLowerCase().includes(q) ||
        d.student.registrationNo.toLowerCase().includes(q) ||
        (d.className ?? "").toLowerCase().includes(q)
      );
    }) ?? [];

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Fee Defaulters</h1>
            <p className="text-slate-500 mt-1">
              Students with unpaid or overdue fee months. Send 1-click WhatsApp reminders or collect dues.
            </p>
          </div>
          {data && (
            <div className="text-right">
              <p className="text-sm text-slate-500">
                {data.count} student(s)
              </p>
              <p className="text-xl font-bold text-rose-600">
                {money(data.totalOutstanding)}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or registration..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <PageLoader compact label="Loading defaulters" />
        ) : isError ? (
          <p className="text-red-500">Failed to load defaulters.</p>
        ) : defaulters.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            No defaulters found. Great collection!
          </div>
        ) : (
          <div className="space-y-4">
            {defaulters.map((d) => (
              <div
                key={d.student.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {d.student.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {d.student.registrationNo}
                      {d.className ? ` · ${d.className}` : ""}
                      {d.sectionName ? `-${d.sectionName}` : ""}
                      {d.rollNo ? ` · Roll ${d.rollNo}` : ""}
                    </p>
                    {d.student.contactPhone && (
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <FaPhone className="text-slate-400" size={12} />
                        {d.student.contactPhone}
                      </p>
                    )}
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      {d.unpaidMonths} unpaid month(s)
                      {d.oldestDue ? ` · since ${d.oldestDue}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-rose-600">
                      {money(d.totalBalance)}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-end mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleSendWhatsApp(
                            d.student.id,
                            d.student.name,
                            d.totalBalance,
                            d.oldestDue
                          )
                        }
                        disabled={sendingWhatsApp}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 shadow-sm disabled:opacity-50"
                        title="Send WhatsApp reminder via OpenWA"
                      >
                        <FaWhatsapp size={14} /> WhatsApp
                      </button>
                      <Link
                        href={`/dashboard/fees/ledger/${d.student.id}`}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                      >
                        Ledger
                      </Link>
                      <Link
                        href={`/dashboard/fees/collect?studentId=${d.student.id}`}
                        className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-sm"
                      >
                        Collect
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.invoices.map((inv) => (
                    <span
                      key={inv.id}
                      className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100"
                    >
                      {inv.monthLabel}: {money(inv.balanceAmount)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
