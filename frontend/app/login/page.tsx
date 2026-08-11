"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import type { LoginRequest } from "@/redux/features/auth/authTypes";

const REMEMBER_KEY = "sms_remember_credentials";

type RememberedCredentials = {
  email: string;
  password: string;
};
// heelo channges cekingggggg
// hello just for pusehing the code this is nothing
function loadRemembered(): RememberedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedCredentials;
    if (!parsed?.email || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [user, setUser] = useState<LoginRequest>({
    email: "",
    password: "",
  });

  useEffect(() => {
    const saved = loadRemembered();
    if (!saved) return;
    setUser({ email: saved.email, password: saved.password });
    setRememberMe(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(user).unwrap();

      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({
            email: user.email.trim(),
            password: user.password,
          })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      toast.success("Logged in successfully!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ?? "Login failed";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 bg-[#f9f9fb]">
      <main
        className="
          w-full
          max-w-[1000px]
          min-h-[min(100dvh-2rem,640px)]
          md:h-[min(90dvh,720px)]
          bg-white
          rounded-xl
          shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)]
          overflow-hidden
          flex
          flex-col
          md:flex-row
        "
      >
        {/* LEFT: LOGIN FORM */}
        <section className="w-full md:w-[45%] p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white overflow-y-auto">
          <header className="mb-8 md:mb-10">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-primary text-[40px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>

              <h1 className="font-display bold text-headline-lg text-primary">
                WolfExa Edu
              </h1>
            </div>

            <p className="text-secondary text-sm mb-2">
              Please enter your credentials to access your dashboard.
            </p>

            <h2 className="text-xl font-semibold text-primary">Welcome Back</h2>
          </header>

          {/* method="post" keeps credentials out of the URL if JS hasn't loaded */}
          <form method="post" onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-outline-variant py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">
                mail
              </span>

              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="w-full outline-none bg-transparent text-primary"
                required
                autoComplete="email"
              />
            </div>

            <div className="border-b border-outline-variant py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">
                lock
              </span>

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={user.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full outline-none bg-transparent text-primary"
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                className="text-secondary hover:text-primary transition"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-black text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">login</span>
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <div className="text-center">
              <a href="#" className="text-sm text-secondary hover:text-primary">
                Forgot your{" "}
                <span className="font-semibold text-primary">password?</span>
              </a>
            </div>

            <div className="text-center md:hidden pt-2">
              <Link href="/register" className="text-sm text-secondary">
                Don&apos;t have an account?{" "}
                <span className="font-semibold text-black">Sign Up</span>
              </Link>
            </div>
          </form>
        </section>

        {/* RIGHT SIDE */}
        <section className="hidden md:flex w-[55%] luxury-gradient relative flex-col justify-between p-10 text-white overflow-hidden">
          <div className="max-w-lg mt-10">
            <h2 className="text-5xl font-bold mb-4">Continue Managing!</h2>

            <p className="text-white/70 text-lg">
              Pick up right where you left off. Sign in to the world&apos;s
              favorite fast, easy school management platform.
            </p>
          </div>

          <div className="flex items-end justify-center flex-grow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEzApgN-Pav-fzyniVGpPcpA_x-6m1ejor9WeexCyhQQBaDTU1apFTD0IX-YJQU7KwKmB59ukZvHMIC67lwtwbnR-7NkpMjumQs4p-uem7yM7LnSIYBH6o3gcDkw-nRmoYViOsOyNt_44ln0v5-05EiWNdTU7s9HfLwFZoNiaaenwsjo-wP1yCZvYta-fRaUXzHaQqhZG-L8hbdAPH_L05QpsqrEK-fJpCC-ecNvekdIBJCMtuciDM6IXY6tBHvlb9t5UYf2-JjA"
              alt="login"
              className="w-[70%] grayscale contrast-125"
            />
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-4 bg-white/5 backdrop-blur-md rounded-full px-6 py-2 border border-white/10">
            <p>Don&apos;t have an account?</p>

            <Link href="/register">
              <span className="inline-block bg-white/10 border border-white/20 px-6 py-2 rounded-full text-sm hover:bg-white/20 transition">
                Sign Up
              </span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
