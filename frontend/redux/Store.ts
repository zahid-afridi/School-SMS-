import { configureStore } from "@reduxjs/toolkit";
import { rootApi } from "./rootApi";
import authReducer from "./features/auth/authSlice";
import teacherReducer from "./features/teachers/teacherSlice";

export const store = configureStore({
  reducer: {
    [rootApi.reducerPath]: rootApi.reducer,
    auth: authReducer,
    teachers: teacherReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(rootApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
