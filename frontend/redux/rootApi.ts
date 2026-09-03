import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Single RTK Query API instance for the entire app.
 * Each feature injects its own endpoints via `rootApi.injectEndpoints(...)`.
 * This keeps bundle splitting clean and avoids circular imports.
 */
export const rootApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "Students",
    "Teachers",
    "Classes",
    "School",
    "Fees",
    "Attendance",
    "Exams",
    "Reports",
    "Admission",
    "Dashboard",
    "Settings",
    "Messages",
  ],
  endpoints: () => ({}),
});
