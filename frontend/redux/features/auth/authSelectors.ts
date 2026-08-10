import type { RootState } from "../../Store";

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectUserRole = (state: RootState) => state.auth.user?.role;
