import type { RootState } from "../../Store";

export const selectAllTeachers = (state: RootState) => state.teachers.teachers;

export const selectSelectedTeacher = (state: RootState) =>
  state.teachers.selectedTeacher;

export const selectTeacherById = (id: string) => (state: RootState) =>
  state.teachers.teachers.find((t) => t.id === id) ?? null;

export const selectTeachersOnly = (state: RootState) =>
  state.teachers.teachers.filter((t) => t.designation === "TEACHER");
