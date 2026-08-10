import { redirect } from "next/navigation";

export default function ExamReportsRedirect() {
  redirect("/dashboard/reports/students-report-card");
}
