"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, []);

  if (!checked) return null;

  return <>{children}</>;
}
