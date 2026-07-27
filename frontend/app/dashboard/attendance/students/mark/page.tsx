import { Suspense } from "react";
import MarkStudentAttendancePage from "./MarkClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <MarkStudentAttendancePage />
    </Suspense>
  );
}
