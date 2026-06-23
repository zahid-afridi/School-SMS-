"use client";

import { store } from "@/redux/Store";
import { Provider } from "react-redux";
// import { store } from "@/redux/store";


export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}