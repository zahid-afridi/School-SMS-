"use client";

type PageLoaderProps = {
  label?: string;
  compact?: boolean;
  className?: string;
};

export default function PageLoader({
  label = "Preparing your workspace",
  compact = false,
  className = "",
}: PageLoaderProps) {
  return (
    <div
      className={`flex w-full items-center justify-center ${
        compact ? "min-h-32 py-8" : "min-h-[55vh] py-12"
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex flex-col items-center">
        <div className="relative h-20 w-20">
          <span className="loader-orbit loader-orbit-one" />
          <span className="loader-orbit loader-orbit-two" />
          <span className="absolute inset-[15px] flex items-center justify-center rounded-2xl bg-black text-white shadow-xl shadow-black/15">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
            >
              school
            </span>
          </span>
        </div>

        <p className="mt-5 text-sm font-semibold tracking-wide text-slate-800">
          {label}
        </p>

        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          <span className="loader-dot" />
          <span className="loader-dot loader-dot-delay-one" />
          <span className="loader-dot loader-dot-delay-two" />
        </div>
      </div>
    </div>
  );
}

export function ButtonLoader({ label = "Working" }: { label?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
