"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/auth/authSlice";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/register");
    } else {
      dispatch(loginSuccess({ user: null, token }));
      setChecked(true);
    }
  }, []);

  if (!checked) return null;

  return <>{children}</>;
}
