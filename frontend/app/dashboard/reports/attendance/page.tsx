import { redirect } from "next/navigation";

export default function ReportsAttendanceRedirect() {
  redirect("/dashboard/reports/students-monthly-attendance");
}
