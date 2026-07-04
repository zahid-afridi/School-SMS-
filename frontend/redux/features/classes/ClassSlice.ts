import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ClassState, SchoolClass } from "./ClassTypes";

const initialState: ClassState = {
  classes: [],
  selectedClass: null,
};

const classSlice = createSlice({
  name: "classes",
  initialState,
  reducers: {
    setClasses(state, { payload }: PayloadAction<SchoolClass[]>) {
      state.classes = payload;
    },
    setSelectedClass(state, { payload }: PayloadAction<SchoolClass | null>) {
      state.selectedClass = payload;
    },
    clearClasses(state) {
      state.classes = [];
      state.selectedClass = null;
    },
  },
});

export const { setClasses, setSelectedClass, clearClasses } =
  classSlice.actions;
export default classSlice.reducer;
