import type { RootState } from "../../Store";

export const selectAllClasses = (state: RootState) => state.classes.classes;

export const selectSelectedClass = (state: RootState) =>
  state.classes.selectedClass;

export const selectClassById = (id: string) => (state: RootState) =>
  state.classes.classes.find((c) => c.id === id) ?? null;
