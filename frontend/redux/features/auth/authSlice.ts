import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, AuthResponse, AuthUser } from "./authTypes";

// Rehydrate token synchronously from localStorage on store creation
const storedToken =
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

const initialState: AuthState = {
  user: null,
  token: storedToken,
  isAuthenticated: !!storedToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Called after a successful login / register
    setCredentials(state, { payload }: PayloadAction<AuthResponse>) {
      state.user = payload.data.user;
      state.token = payload.data.token;
      state.isAuthenticated = true;
    },
    setUser(state, { payload }: PayloadAction<AuthUser>) {
      state.user = payload;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        document.cookie = "token=; path=/; max-age=0";
      }
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
