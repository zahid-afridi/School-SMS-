"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  reportInputClass,
} from "../_components/ReportUI";

type ReportNeed =
  | "classId"
  | "status"
  | "parentType"
  | "year"
  | "month"
  | "from"
  | "to";

type ReportType = {
  id: string;
  label: string;
  path: string;
  needs: ReportNeed[];
};

const REPORT_TYPES: ReportType[] = [
  {
    id: "students-report-card",
    label: "Students report Card",
    path: "/dashboard/reports/students-report-card",
    needs: [],
  },
  {
    id: "students-info",
    label: "Students info report",
    path: "/dashboard/reports/students-info",
    needs: ["classId", "status"],
  },
  {
    id: "parents-info",
    label: "Parents info report",
    path: "/dashboard/reports/parents-info",
    needs: ["parentType"],
  },
  {
    id: "students-monthly-attendance",
    label: "Students Monthly Attendance Report",
    path: "/dashboard/reports/students-monthly-attendance",
    needs: ["classId", "year", "month"],
  },
  {
    id: "staff-monthly-attendance",
    label: "Staff Monthly Attendance Report",
    path: "/dashboard/reports/staff-monthly-attendance",
    needs: ["year", "month"],
  },
  {
    id: "fee-collection",
    label: "Fee Collection Report",
    path: "/dashboard/reports/fee-collection",
    needs: ["from", "to"],
  },
  {
    id: "student-progress",
    label: "Student Progress Report",
    path: "/dashboard/reports/student-progress",
    needs: [],
  },
  {
    id: "accounts",
    label: "Accounts Report",
    path: "/dashboard/reports/accounts",
    needs: ["year"],
  },
];

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CustomisedReportsPage() {
  const router = useRouter();
  const now = new Date();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [reportType, setReportType] = useState<string>("students-info");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [parentType, setParentType] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [from, setFrom] = useState(
    toInputDate(new Date(now.getFullYear(), now.getMonth(), 1))
  );
  const [to, setTo] = useState(toInputDate(now));

  const selected = useMemo(
    () => REPORT_TYPES.find((r) => r.id === reportType),
    [reportType]
  );

  const handleOpen = () => {
    if (!selected) return;
    const params = new URLSearchParams();
    if (selected.needs.includes("classId") && classId) params.set("classId", classId);
    if (selected.needs.includes("status") && status) params.set("status", status);
    if (selected.needs.includes("parentType") && parentType)
      params.set("type", parentType);
    if (selected.needs.includes("year")) params.set("year", String(year));
    if (selected.needs.includes("month")) params.set("month", String(month));
    if (selected.needs.includes("from")) params.set("from", from);
    if (selected.needs.includes("to")) params.set("to", to);
    const qs = params.toString();
    router.push(qs ? `${selected.path}?${qs}` : selected.path);
  };

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Customised Reports" />
      <ReportHeader
        title="Customised Reports"
        subtitle="Choose a report type, set filters, then open the full report"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl space-y-5">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Report type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={reportInputClass}
          >
            {REPORT_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {selected?.needs.includes("classId") ? (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={reportInputClass}
            >
              <option value="">All / select later</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {selected?.needs.includes("status") ? (
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Student status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={reportInputClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ALL">All</option>
            </select>
          </div>
        ) : null}

        {selected?.needs.includes("parentType") ? (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Parent type</label>
            <select
              value={parentType}
              onChange={(e) => setParentType(e.target.value)}
              className={reportInputClass}
            >
              <option value="">All</option>
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
              <option value="GUARDIAN">Guardian</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        ) : null}

        {selected?.needs.includes("year") || selected?.needs.includes("month") ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selected.needs.includes("year") ? (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={reportInputClass}
                >
                  {[year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {selected.needs.includes("month") ? (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={reportInputClass}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString("en", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

        {selected?.needs.includes("from") || selected?.needs.includes("to") ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={reportInputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={reportInputClass}
              />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleOpen}
          className="h-11 px-6 rounded-xl bg-black text-white text-sm font-semibold"
        >
          Open report
        </button>
      </div>
    </div>
  );
}
