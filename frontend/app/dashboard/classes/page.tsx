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
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Classes</h1>
          <p className="text-gray-500 mt-1">Manage your school classes and sections</p>
        </div>
        <Link
          href="/dashboard/classes/add-class"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
        >
          <FaPlus size={14} /> Add Class
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:mb-10 sm:grid-cols-3 sm:gap-5">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
    <div className={`${bg} flex items-center gap-3 rounded-2xl p-4 sm:gap-4 sm:p-6`}>
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
    <Link href={href} className="group block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6">
      <div className={`w-14 h-14 ${bg} bg-opacity-10 rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
}
