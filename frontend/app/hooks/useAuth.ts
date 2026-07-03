"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

export const useAuth = () => {
  return useSelector((state: RootState) => state.auth);
};
