import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dashboard/messages/compose?type=ANNOUNCEMENT");
}
