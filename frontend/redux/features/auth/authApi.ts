import { rootApi } from "../../rootApi";
import { setCredentials, setUser } from "./authSlice";
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  MeResponse,
  MessageResponse,
  RegisterRequest,
  UpdateAccountRequest,
} from "./authTypes";

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
        localStorage.setItem("token", data.data.token);
        document.cookie = `token=${data.data.token}; path=/`;
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
        localStorage.setItem("token", data.data.token);
        document.cookie = `token=${data.data.token}; path=/`;
      },
      invalidatesTags: ["Auth"],
    }),

    getMe: builder.query<AuthUser, void>({
      query: () => "/auth/me",
      transformResponse: (res: MeResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
        } catch {
          // keep previous state
        }
      },
      providesTags: ["Auth"],
    }),

    updateAccount: builder.mutation<MeResponse, UpdateAccountRequest>({
      query: (body) => ({
        url: "/auth/update-account",
        method: "PUT",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setUser(data.data));
      },
      invalidatesTags: ["Auth"],
    }),

    changePassword: builder.mutation<MessageResponse, ChangePasswordRequest>({
      query: (body) => ({
        url: "/auth/change-password",
        method: "PUT",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useUpdateAccountMutation,
  useChangePasswordMutation,
} = authApi;
