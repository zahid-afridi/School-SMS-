"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaSchool,
  FaClipboardCheck,
  FaFileAlt,
  FaChartBar,
  FaMoneyBillWave,
  FaChevronDown,
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
        // {
        //   name: "Student Promotion",
        //   href: "/dashboard/students/promotion",
        // },
      ],
    },
    {
      name: "Teachers",
      icon: <FaChalkboardTeacher size={18} />,
      children: [
        {
          name: "Add Teacher",
          href: "/dashboard/teachers",
        },
        {
          name: "All-Teacher",
          href: "/dashboard/teachers/All-Teachers",
        },
      ],
    },
    {
      name: "Classes",
      href: "/dashboard/classes",
      icon: <FaSchool size={18} />,
    },
    {
      name: "Attendance",
      href: "/dashboard/attendance",
      icon: <FaClipboardCheck size={18} />,
    },
    {
      name: "Exams",
      href: "/dashboard/exams",
      icon: <FaFileAlt size={18} />,
    },
    {
      name: "Reports",
      href: "/dashboard/reports",
      icon: <FaChartBar size={18} />,
    },
    {
      name: "Fees",
      icon: <FaMoneyBillWave size={18} />,
      children: [
        {
          name: "Collect Fees",
          href: "/dashboard/fees",
        },
        {
          name: "Fee Types",
          href: "/dashboard/fees/types",
        },
        {
          name: "Fee Reports",
          href: "/dashboard/fees/reports",
        },
      ],
    },
  ];

  return (
    <aside className="w-72 h-screen bg-white shadow-lg overflow-y-auto">
      <div className="p-4">
        <ul className="space-y-2">
          {menus.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() =>
                      setOpenMenu(
                        openMenu === item.name ? "" : item.name
                      )
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
                    className={`overflow-hidden transition-all duration-500 ${
                      openMenu === item.name
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <ul className="ml-8 mt-2 space-y-1 border-l-2 border-blue-100 pl-4">
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
                  href={item.href}
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