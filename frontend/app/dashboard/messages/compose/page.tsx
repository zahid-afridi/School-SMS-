"use client";

import { Suspense } from "react";
import PageLoader from "@/app/components/PageLoader";
import ComposeMessagePage from "./ComposeClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <PageLoader compact label="Loading compose" />
        </div>
      }
    >
      <ComposeMessagePage />
    </Suspense>
  );
}
