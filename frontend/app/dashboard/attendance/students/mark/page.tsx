import { Suspense } from "react";
import MarkStudentAttendancePage from "./MarkClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5fb] flex items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <MarkStudentAttendancePage />
    </Suspense>
  );
}
