"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleSelector from "./RoleSelector";
import toast from "react-hot-toast";
import { useRegisterMutation } from "@/redux/features/auth/authApi";
import type { RegisterRequest, User } from "@/redux/features/auth/authTypes";

export default function RegisterForm() {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const [user, setUser] = useState<RegisterRequest>({
    name: "",
    email: "",
    password: "",
    role: "admin",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await register(user).unwrap();
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
    <section className="w-full md:w-[45%]  p-10 flex flex-col justify-center bg-white">
      <header className="mb-12">
        <div className="flex items-center gap-2  mt-[26px]">
          <span
            className="material-symbols-outlined text-black text-[40px]"
            style={{
              fontVariationSettings: "'FILL' 1",
            }}
          >
            school
          </span>

          <h1 className="text-3xl font-bold ">Haroon</h1>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Please enter your details to create your account.
        </p>

        <h2 className="text-xl font-semibold">
          Create Your <span className="font-bold">Account</span>
        </h2>
      </header>

      <RoleSelector
        role={user.role}
        setRole={(role: string) =>
          setUser((prev) => ({
            ...prev,
            role: role.toLowerCase() as User["role"],
          }))
        }
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-b py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined">person</span>

          <input
            name="name"
            value={user.name}
            onChange={handleChange}
            type="text"
            placeholder="Full Name"
            className="w-full outline-none"
            required
          />
        </div>

        <div className="border-b py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined">mail</span>

          <input
            type="email"
            value={user.email}
            name="email"
            onChange={handleChange}
            placeholder="Email Address"
            className="w-full outline-none"
            required
          />
        </div>

        <div className="border-b py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined">lock</span>

          <input
            value={user.password}
            name="password"
            onChange={handleChange}
            type="password"
            placeholder="Password"
            className="w-full outline-none"
            required
          />
        </div>

        <button
          disabled={isLoading}
          type="submit"
          className="w-full h-14 bg-black text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">how_to_reg</span>
          {isLoading ? "Registering..." : "Register"}
        </button>

        <div className="text-center">
          <a href="/login" className="text-gray-500">
            Already have an{" "}
            <span className="font-semibold text-black">account?</span>
          </a>
        </div>
      </form>
    </section>
  );
}
