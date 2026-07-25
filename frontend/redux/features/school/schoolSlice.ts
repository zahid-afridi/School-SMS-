import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { School, SchoolState } from "./schoolTypes";

const initialState: SchoolState = {
  mySchool: null,
  schools: [],
};

const schoolSlice = createSlice({
  name: "school",
  initialState,
  reducers: {
    setMySchool(state, { payload }: PayloadAction<School | null>) {
      state.mySchool = payload;
    },
    setSchools(state, { payload }: PayloadAction<School[]>) {
      state.schools = payload;
    },
    clearSchool(state) {
      state.mySchool = null;
      state.schools = [];
    },
  },
});

export const { setMySchool, setSchools, clearSchool } = schoolSlice.actions;
export default schoolSlice.reducer;
