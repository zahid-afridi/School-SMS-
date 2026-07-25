import { configureStore } from "@reduxjs/toolkit";
import { rootApi } from "./rootApi";
import authReducer from "./features/auth/authSlice";
import teacherReducer from "./features/teachers/teacherSlice";
import classReducer from "./features/classes/ClassSlice";
import studentReducer from "./features/students/studentSlice";

export const store = configureStore({
  reducer: {
    [rootApi.reducerPath]: rootApi.reducer,
    auth: authReducer,
    teachers: teacherReducer,
    classes: classReducer,
    students: studentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(rootApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
