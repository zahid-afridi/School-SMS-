"use client";

import EmployeesList from "@/app/components/EmployeesList";

export default function Page() {
  return (
    <EmployeesList
      title="All Employees"
      subtitle="Teachers, accountants, and other staff — school principal is managed at signup"
      showDesignationFilter
      hidePrincipal
    />
  );
}
