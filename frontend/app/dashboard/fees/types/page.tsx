import { redirect } from "next/navigation";

/** Fee Types → manage via Fee Structure settings */
export default function FeeTypesPage() {
  redirect("/dashboard/settings/fees-structure");
}
