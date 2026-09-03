import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StudentState, Student } from "./studentTypes";

const initialState: StudentState = {
  students: [],
  selectedStudent: null,
};

const studentSlice = createSlice({
  name: "students",
  initialState,
  reducers: {
    setStudents(state, { payload }: PayloadAction<Student[]>) {
      state.students = payload;
    },
    setSelectedStudent(state, { payload }: PayloadAction<Student | null>) {
      state.selectedStudent = payload;
    },
    clearStudents(state) {
      state.students = [];
      state.selectedStudent = null;
    },
  },
});

export const { setStudents, setSelectedStudent, clearStudents } =
  studentSlice.actions;
export default studentSlice.reducer;
