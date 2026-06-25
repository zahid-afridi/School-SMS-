import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, AuthResponse } from "./authTypes";

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, { payload }: PayloadAction<AuthResponse>) {
      state.user = payload.user;
      state.token = payload.token;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
