import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SettingState, School } from "./SettingTypes";

const initialState: SettingState = {
  school: null,
};

const settingSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setSchool(state, { payload }: PayloadAction<School>) {
      state.school = payload;
    },
    clearSchool(state) {
      state.school = null;
    },
  },
});

export const { setSchool, clearSchool } = settingSlice.actions;
export default settingSlice.reducer;
