import type { RootState } from "../../Store";

export const selectAllStudents = (state: RootState) => state.students.students;

export const selectSelectedStudent = (state: RootState) =>
  state.students.selectedStudent;

export const selectStudentById = (id: string) => (state: RootState) =>
  state.students.students.find((s) => s.id === id) ?? null;
