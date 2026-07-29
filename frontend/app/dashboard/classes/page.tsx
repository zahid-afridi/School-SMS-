"use client";

import PageLoader from "@/app/components/PageLoader";
import Link from "next/link";
import { FaPlus, FaListAlt, FaLayerGroup } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";

export default function ClassesPage() {
  const { data: classes, isLoading } = useGetAllClassesQuery();

  const totalSections =
    classes?.reduce((acc, c) => acc + (c.sections?.length ?? 0), 0) ?? 0;

  if (isLoading) {
    return <PageLoader label="Loading classes" />;
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 mt-1">Manage your school classes and sections</p>
        </div>
        <Link
          href="/dashboard/classes/add-class"
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <FaPlus size={14} /> Add Class
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <StatCard
          icon={<FaListAlt className="text-blue-500" size={22} />}
          label="Total Classes"
          value={String(classes?.length ?? 0)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<FaLayerGroup className="text-green-500" size={22} />}
          label="Total Sections"
          value={String(totalSections)}
          bg="bg-green-50"
        />
        <StatCard
          icon={<FaPlus className="text-purple-500" size={22} />}
          label="Quick Actions"
          value="Add / View"
          bg="bg-purple-50"
        />
      </div>

      {/* Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NavCard
          href="/dashboard/classes/all-classes"
          title="All Classes"
          description="View and manage all existing classes"
          icon={<FaListAlt size={28} className="text-blue-600" />}
          bg="bg-blue-600"
        />
        <NavCard
          href="/dashboard/classes/add-class"
          title="Add Class"
          description="Create a new class with sections"
          icon={<FaPlus size={28} className="text-green-600" />}
          bg="bg-green-600"
        />
        <NavCard
          href="/dashboard/classes/sections"
          title="Manage Sections"
          description="Add or update sections for existing classes"
          icon={<FaLayerGroup size={28} className="text-purple-600" />}
          bg="bg-purple-600"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-6 flex items-center gap-4`}>
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function NavCard({
  href,
  title,
  description,
  icon,
  bg,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Link href={href} className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-6 group">
      <div className={`w-14 h-14 ${bg} bg-opacity-10 rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
}
