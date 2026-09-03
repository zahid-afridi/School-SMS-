"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/redux/Store";

export const useAuth = () => {
  return useSelector((state: RootState) => state.auth);
};
