import { rootApi } from "../../rootApi";
import { setCredentials } from "./authSlice";
import type { LoginRequest, RegisterRequest, AuthResponse } from "./authTypes";

export const authApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
        // Write cookie so the proxy can guard routes server-side
        document.cookie = `token=${data.token}; path=/`;
      },
      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
        document.cookie = `token=${data.token}; path=/`;
      },
    }),

    getMe: builder.query<AuthResponse["user"], void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useRegisterMutation, useGetMeQuery } = authApi;
