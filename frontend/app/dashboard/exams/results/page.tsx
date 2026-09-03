import { redirect } from "next/navigation";

/** Legacy link → result card */
export default function ExamResultsRedirect() {
  redirect("/dashboard/exams/result-card");
}
