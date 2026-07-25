"use client";

import EmployeesList from "@/app/components/EmployeesList";

export default function Page() {
  return (
    <EmployeesList
      title="All Teachers"
      subtitle="Classroom teachers assigned to classes and sections"
      lockedDesignation="TEACHER"
      showDesignationFilter={false}
      hidePrincipal={false}
    />
  );
}
