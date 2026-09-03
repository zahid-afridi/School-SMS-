import { redirect } from "next/navigation";

export default function ReportsFeesRedirect() {
  redirect("/dashboard/reports/fee-collection");
}
