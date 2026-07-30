"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleSelector from "./RoleSelector";
import toast from "react-hot-toast";
import { useRegisterMutation } from "@/redux/features/auth/authApi";
import type { RegisterRequest, User } from "@/redux/features/auth/authTypes";

export default function RegisterForm() {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const [user, setUser] = useState<
    Omit<RegisterRequest, "role"> & { role: string }
  >({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await register({
        ...user,
        role: user.role as User["role"],
      }).unwrap();
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        "Registration failed";
      toast.error(message);
    }
  };

  return (
    <section className="w-full md:w-[45%] p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white overflow-y-auto min-h-0">
      <header className="mb-6 md:mb-8 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <span
            className="material-symbols-outlined text-black text-[36px] md:text-[40px]"
            style={{
              fontVariationSettings: "'FILL' 1",
            }}
          >
            school
          </span>

          <h1 className="text-2xl md:text-3xl font-bold">Haroon</h1>
        </div>

        <p className="text-sm text-gray-500 mb-1">
          Please enter your details to create your account.
        </p>

        <h2 className="text-lg md:text-xl font-semibold">
          Create Your <span className="font-bold">Account</span>
        </h2>
      </header>

      <RoleSelector
        role={user.role}
        setRole={(role: string) => setUser((prev) => ({ ...prev, role }))}
      />

      {/* method="post" keeps credentials out of the URL if JS hasn't loaded */}
      <form
        method="post"
        onSubmit={handleSubmit}
        className="space-y-4 md:space-y-5"
      >
        <div className="border-b py-3 md:py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined shrink-0">person</span>

          <input
            name="name"
            value={user.name}
            onChange={handleChange}
            type="text"
            placeholder="Full Name"
            className="w-full outline-none min-w-0"
            required
            autoComplete="name"
          />
        </div>

        <div className="border-b py-3 md:py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined shrink-0">mail</span>

          <input
            type="email"
            value={user.email}
            name="email"
            onChange={handleChange}
            placeholder="Email Address"
            className="w-full outline-none min-w-0"
            required
            autoComplete="email"
          />
        </div>

        <div className="border-b py-3 md:py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined shrink-0">lock</span>

          <input
            value={user.password}
            name="password"
            onChange={handleChange}
            type="password"
            placeholder="Password"
            className="w-full outline-none min-w-0"
            required
            autoComplete="new-password"
          />
        </div>

        <button
          disabled={isLoading}
          type="submit"
          className="w-full h-12 md:h-14 bg-black text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">how_to_reg</span>
          {isLoading ? "Registering..." : "Register"}
        </button>

        <div className="text-center pb-2">
          <Link href="/login" className="text-gray-500 text-sm">
            Already have an{" "}
            <span className="font-semibold text-black">account?</span>
          </Link>
        </div>
      </form>
    </section>
  );
}
