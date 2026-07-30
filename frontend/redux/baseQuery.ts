import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "@/lib/apiBase";
import { logout } from "./features/auth/authSlice";
import type { RootState } from "./Store";

type RawBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
>;

let rawBaseQueryInstance: RawBaseQuery | null = null;

/**
 * Built on first request so the base URL can read the browser's host,
 * which keeps LAN/mobile access working without rebuilding.
 */
function getRawBaseQuery(): RawBaseQuery {
  if (!rawBaseQueryInstance) {
    rawBaseQueryInstance = fetchBaseQuery({
      baseUrl: getApiBaseUrl(),
      prepareHeaders(headers, { getState }) {
        const token = (getState() as RootState).auth.token;
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
      },
    });
  }
  return rawBaseQueryInstance;
}

/**
 * Re-auth base query with automatic 401 handling.
 * Extend here if you need token-refresh logic.
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await getRawBaseQuery()(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Token is invalid / expired — clear auth state
    api.dispatch(logout());
  }

  return result;
};
