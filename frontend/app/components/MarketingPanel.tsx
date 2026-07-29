import Link from "next/link";

export default function MarketingPanel() {
  return (
    <section className="hidden md:flex w-[55%] luxury-gradient relative flex-col justify-between p-8 lg:p-10 text-white overflow-hidden min-h-0">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-[80px] animate-float"></div>
      </div>

      <div className="relative z-10 flex justify-end shrink-0">
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md rounded-full px-6 py-2 border border-white/10">
          <span className="text-white/70 text-sm">Already have an account?</span>
          <Link href="/login">
            <button
              type="button"
              className="bg-white/20 px-6 py-2 rounded-full text-sm hover:bg-white/30 transition"
            >
              Login
            </button>
          </Link>
        </div>
      </div>

      <div className="relative z-10 max-w-lg shrink-0">
        <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 leading-tight">
          Continue Managing!
        </h2>

        <p className="text-white/70 text-base lg:text-lg">
          Pick up right where you left off. Sign in to the world&apos;s favorite
          fast, easy and free school management platform.
        </p>
      </div>

      <div className="relative z-10 flex-1 flex items-end justify-center min-h-0 py-4">
        <div className="relative w-full max-w-md aspect-square max-h-[280px] lg:max-h-[340px]">
          <div className="absolute top-6 left-0 glass-panel p-3 rounded-xl">
            <span className="material-symbols-outlined text-2xl">security</span>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEzApgN-Pav-fzyniVGpPcpA_x-6m1ejor9WeexCyhQQBaDTU1apFTD0IX-YJQU7KwKmB59ukZvHMIC67lwtwbnR-7NkpMjumQs4p-uem7yM7LnSIYBH6o3gcDkw-nRmoYViOsOyNt_44ln0v5-05EiWNdTU7s9HfLwFZoNiaaenwsjo-wP1yCZvYta-fRaUXzHaQqhZG-L8hbdAPH_L05QpsqrEK-fJpCC-ecNvekdIBJCMtuciDM6IXY6tBHvlb9t5UYf2-JjA"
            alt="Graduate"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 max-h-full object-contain grayscale brightness-110 contrast-125 z-10"
          />
        </div>
      </div>

      <div className="relative z-10 text-center text-white/30 text-xs tracking-widest shrink-0">
        TRUSTED BY 10,000+ INSTITUTIONS WORLDWIDE
      </div>
    </section>
  );
}
