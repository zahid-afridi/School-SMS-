import type { RootState } from "../../store";

export const selectAllTeachers = (state: RootState) =>
  state.teachers.teachers;

export const selectSelectedTeacher = (state: RootState) =>
  state.teachers.selectedTeacher;

export const selectTeacherById = (id: string) => (state: RootState) =>
  state.teachers.teachers.find((t) => t._id === id) ?? null;
