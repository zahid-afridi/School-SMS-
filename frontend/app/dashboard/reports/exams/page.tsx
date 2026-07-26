import { redirect } from "next/navigation";

export default function ExamReportsRedirect() {
  redirect("/dashboard/exams/result-sheet");
}
