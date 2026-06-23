"use client";

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
} from "react-icons/fa";

export default function Sidebar() {
  const menus = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <FaTachometerAlt size={18} />,
    },
    {
      name: "Students",
      href: "/dashboard/students",
      icon: <FaUserGraduate size={18} />,
    },
    {
      name: "Teachers",
      href: "/dashboard/teachers",
      icon: <FaChalkboardTeacher size={18} />,
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
      href: "/dashboard/fees",
      icon: <FaMoneyBillWave size={18} />,
    },
    {
      name: "Fees",
      href: "/dashboard/fees",
      icon: <FaMoneyBillWave size={18} />,
    },
    {
      name: "Fees",
      href: "/dashboard/fees",
      icon: <FaMoneyBillWave size={18} />,
    },
    {
      name: "Fees",
      href: "/dashboard/fees",
      icon: <FaMoneyBillWave size={18} />,
    },

  ];

  return (
    <aside className="w-72 bg-white shadow-sm  overflow-y-auto">
      <div className="p-4">
        <ul className="space-y-2">
          {menus.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}