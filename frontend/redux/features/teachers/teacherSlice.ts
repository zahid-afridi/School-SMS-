import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TeacherState, Teacher } from "./teacherTypes";

const initialState: TeacherState = {
  teachers: [],
  selectedTeacher: null,
};

const teacherSlice = createSlice({
  name: "teachers",
  initialState,
  reducers: {
    setTeachers(state, { payload }: PayloadAction<Teacher[]>) {
      state.teachers = payload;
    },
    setSelectedTeacher(state, { payload }: PayloadAction<Teacher | null>) {
      state.selectedTeacher = payload;
    },
    clearTeachers(state) {
      state.teachers = [];
      state.selectedTeacher = null;
    },
  },
});

export const { setTeachers, setSelectedTeacher, clearTeachers } =
  teacherSlice.actions;
export default teacherSlice.reducer;
