import PageLoader from "@/app/components/PageLoader";

import { Suspense } from "react";
import MarkStudentAttendancePage from "./MarkClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <PageLoader compact label="Loading" />
        </div>
      }
    >
      <MarkStudentAttendancePage />
    </Suspense>
  );
}
