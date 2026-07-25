"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "react-icons/fa";

export default function Sidebar() {
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
        {
          name: "All Students",
          href: "/dashboard/students",
        },
        {
          name: "Add Student",
          href: "/dashboard/students/Add-students",
        },
        {
          name: "Promote Student",
          href: "/dashboard/students/promote",
        },
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
        {
          name: "Add Employee",
          href: "/dashboard/employees",
        },
        {
          name: "All Employees",
          href: "/dashboard/employees/all",
        },
        {
          name: "Teachers",
          href: "/dashboard/employees/teachers",
        },
      ],
    },

    {
      name: "Classes",
      icon: <FaSchool size={18} />,
      children: [
        {
          name: "Overview",
          href: "/dashboard/classes",
        },
        {
          name: "All Classes",
          href: "/dashboard/classes/all-classes",
        },
        {
          name: "Add Class",
          href: "/dashboard/classes/add-class",
        },
        {
          name: "Class Sections",
          href: "/dashboard/classes/sections",
        },
      ],
    },

    {
      name: "Attendance",
      icon: <FaClipboardCheck size={18} />,
      children: [
        {
          name: "Take Attendance",
          href: "/dashboard/attendance",
        },
        {
          name: "Attendance Records",
          href: "/dashboard/attendance/records",
        },
        {
          name: "Attendance Reports",
          href: "/dashboard/attendance/reports",
        },
      ],
    },

    {
      name: "Exams",
      icon: <FaFileAlt size={18} />,
      children: [
        {
          name: "Exam List",
          href: "/dashboard/exams",
        },
        {
          name: "Create Exam",
          href: "/dashboard/exams/create",
        },
        {
          name: "Exam Results",
          href: "/dashboard/exams/results",
        },
      ],
    },

    {
      name: "Reports",
      icon: <FaChartBar size={18} />,
      children: [
        {
          name: "Student Reports",
          href: "/dashboard/reports",
        },
        {
          name: "Attendance Reports",
          href: "/dashboard/reports/attendance",
        },
        {
          name: "Fee Reports",
          href: "/dashboard/reports/fees",
        },
        {
          name: "Exam Reports",
          href: "/dashboard/reports/exams",
        },
      ],
    },

  {
    name: "Fees",
    icon: <FaMoneyBillWave size={18} />,
    children: [
      {
        name: "Fees Overview",
        href: "/dashboard/fees",
      },
      {
        name: "Collect Fees",
        href: "/dashboard/fees/collect",
      },
      {
        name: "Generate Invoices",
        href: "/dashboard/fees/generate",
      },
      {
        name: "Monthly Dues",
        href: "/dashboard/fees/dues",
      },
      {
        name: "Defaulters",
        href: "/dashboard/fees/defaulters",
      },
      {
        name: "Fee Reports",
        href: "/dashboard/fees/reports",
      },
      {
        name: "Fee Structure",
        href: "/dashboard/settings/fees-structure",
      },
    ],
  },
  ];

  return (
    <aside className="w-72 h-full min-h-0 shrink-0 bg-white shadow-lg overflow-y-auto overscroll-contain">
      <div className="p-4 pb-10">
        <ul className="space-y-2">
          {menus.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === item.name ? "" : item.name)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </div>

                    <FaChevronDown
                      className={`transition-transform duration-300 ${
                        openMenu === item.name ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openMenu === item.name
                        ? "max-h-[500px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <ul className="ml-8 mt-2 mb-2 space-y-1 border-l-2 border-blue-100 pl-4">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-all"
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
