import type { RootState } from "../../Store";

export const selectSchool = (state: RootState) => state.settings.school;
