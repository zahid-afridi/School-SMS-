import type { RootState } from "../../store";

export const selectSchool = (state: RootState) => state.settings.school;
