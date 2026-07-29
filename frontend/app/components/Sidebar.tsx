"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaUsers,
  FaSchool,
  FaClipboardCheck,
  FaFileAlt,
  FaChartBar,
  FaMoneyBillWave,
  FaChevronDown,
  FaCog,
  FaTimes,
} from "react-icons/fa";

type SidebarProps = {
  onNavigate?: () => void;
};

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState("");

  const menus = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <FaTachometerAlt size={18} />,
    },
    {
      name: "General Settings",
      icon: <FaCog size={18} />,
      children: [
        {
          name: "Institute Profile",
          href: "/dashboard/settings/institute-profile",
        },
        {
          name: "Fees Structure",
          href: "/dashboard/settings/fees-structure",
        },
        {
          name: "Account Settings",
          href: "/dashboard/settings/account",
        },
      ],
    },
    {
      name: "Students",
      icon: <FaUserGraduate size={18} />,
      children: [
        { name: "All Students", href: "/dashboard/students" },
        { name: "Add Student", href: "/dashboard/students/Add-students" },
        { name: "Promote Student", href: "/dashboard/students/promote" },
        {
          name: "Manage Student Promotion",
          href: "/dashboard/students/manage-promotion",
        },
      ],
    },
    {
      name: "Employees",
      icon: <FaUsers size={18} />,
      children: [
        { name: "Add Employee", href: "/dashboard/employees" },
        { name: "All Employees", href: "/dashboard/employees/all" },
        { name: "Teachers", href: "/dashboard/employees/teachers" },
      ],
    },
    {
      name: "Classes",
      icon: <FaSchool size={18} />,
      children: [
        { name: "Overview", href: "/dashboard/classes" },
        { name: "All Classes", href: "/dashboard/classes/all-classes" },
        { name: "Add Class", href: "/dashboard/classes/add-class" },
        { name: "Class Sections", href: "/dashboard/classes/sections" },
      ],
    },
    {
      name: "Attendance",
      icon: <FaClipboardCheck size={18} />,
      children: [
        {
          name: "Students Attendance",
          href: "/dashboard/attendance/students",
        },
        {
          name: "Attendance Records",
          href: "/dashboard/attendance/records",
        },
        {
          name: "Students Attendance Report",
          href: "/dashboard/attendance/reports",
        },
      ],
    },
    {
      name: "Exams",
      icon: <FaFileAlt size={18} />,
      children: [
        { name: "Exam Overview", href: "/dashboard/exams" },
        { name: "Create New Exam", href: "/dashboard/exams/create" },
        { name: "Add / Update Exam Marks", href: "/dashboard/exams/marks" },
        { name: "Result Card", href: "/dashboard/exams/result-card" },
        { name: "Result Sheet", href: "/dashboard/exams/result-sheet" },
        { name: "Exam Schedule", href: "/dashboard/exams/schedule" },
        { name: "Date Sheet", href: "/dashboard/exams/date-sheet" },
        { name: "Blank Award List", href: "/dashboard/exams/award-list" },
        {
          name: "Document Studio",
          href: "/dashboard/exams/document-studio",
        },
      ],
    },
    {
      name: "Reports",
      icon: <FaChartBar size={18} />,
      children: [
        {
          name: "Students report Card",
          href: "/dashboard/reports/students-report-card",
        },
        {
          name: "Students info report",
          href: "/dashboard/reports/students-info",
        },
        {
          name: "Parents info report",
          href: "/dashboard/reports/parents-info",
        },
        {
          name: "Students Monthly Attendance Report",
          href: "/dashboard/reports/students-monthly-attendance",
        },
        {
          name: "Staff Monthly Attendance Report",
          href: "/dashboard/reports/staff-monthly-attendance",
        },
        {
          name: "Fee Collection Report",
          href: "/dashboard/reports/fee-collection",
        },
        {
          name: "Student Progress Report",
          href: "/dashboard/reports/student-progress",
        },
        {
          name: "Accounts Report",
          href: "/dashboard/reports/accounts",
        },
        {
          name: "Customised Reports",
          href: "/dashboard/reports/customised",
        },
      ],
    },
    {
      name: "Fees",
      icon: <FaMoneyBillWave size={18} />,
      children: [
        { name: "Fees Overview", href: "/dashboard/fees" },
        { name: "Collect Fees", href: "/dashboard/fees/collect" },
        { name: "Generate Invoices", href: "/dashboard/fees/generate" },
        { name: "Monthly Dues", href: "/dashboard/fees/dues" },
        { name: "Defaulters", href: "/dashboard/fees/defaulters" },
        { name: "Fee Reports", href: "/dashboard/fees/reports" },
        {
          name: "Fee Structure",
          href: "/dashboard/settings/fees-structure",
        },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-[min(18rem,85vw)] sm:w-72 h-full min-h-0 shrink-0 bg-white shadow-lg overflow-y-auto overscroll-contain border-r border-slate-100">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between lg:hidden">
        <span className="font-semibold text-slate-800">Menu</span>
        <button
          type="button"
          onClick={onNavigate}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
          aria-label="Close sidebar"
        >
          <FaTimes />
        </button>
      </div>

      <div className="p-3 sm:p-4 pb-10">
        <ul className="space-y-1.5">
          {menus.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu(openMenu === item.name ? "" : item.name)
                    }
                    className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <FaChevronDown
                      className={`shrink-0 transition-transform duration-300 ${
                        openMenu === item.name ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openMenu === item.name
                        ? "max-h-[600px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <ul className="ml-4 sm:ml-8 mt-1 mb-2 space-y-1 border-l-2 border-blue-100 pl-3 sm:pl-4">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            className={`block rounded-lg px-2.5 sm:px-3 py-2 text-sm transition-all break-words ${
                              isActive(child.href)
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                            }`}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <Link
                  href={item.href!}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all ${
                    isActive(item.href!)
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="font-medium truncate">{item.name}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
