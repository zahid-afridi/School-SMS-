"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleSelector from "./RoleSelector";
import api from "../server/Api";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/auth/authSlice";

export default function RegisterForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading,setLoading]=useState(false);



  

  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN"

  })
  //onchange
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }))


  }

  // onSubmit
const handleSubmit = async (e) => {
  e.preventDefault();
setLoading(true)
  try {
    const res = await api.post("/api/auth/register", user);

    const token = res.data.data.token;
    const userData = res.data.data.user;

    localStorage.setItem("token", token);
    // Set cookie so middleware can protect dashboard routes
    document.cookie = `token=${token}; path=/`;

    dispatch(
      loginSuccess({
        user: userData,
        token: token,
      })
    );

    toast.success(
      res.data.message || "User Created Successfully!"
    );

    router.push("/dashboard");
  } catch (error) {
    console.log("POST API Error:", error);

    toast.error(
      error?.response?.data?.message ||
        "Registration Failed"
    );
  }
  finally{
    setLoading(false)
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

          <h1 className="text-3xl font-bold ">
            Haroon
          </h1>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Please enter your details to create your account.
        </p>

        <h2 className="text-xl font-semibold">
          Create Your
          <span className="font-bold">
            {" "}
            Account
          </span>
        </h2>
      </header>

      <RoleSelector
        role={user.role}
        setRole={(role) =>
          setUser((prev) => ({
            ...prev,
            role,
          }))
        }
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-b py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined">
            person
          </span>

          <input
            name="name"
            value={user.name}
            onChange={handleChange}
            type="text"
            placeholder="Full Name"
            className="w-full outline-none"
          />
        </div>

        <div className="border-b py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined">
            mail
          </span>

          <input
            type="email"
            value={user.email}
            name="email"
            onChange={handleChange}
            placeholder="Email Address"
            className="w-full outline-none"
          />
        </div>

        <div className="border-b py-4 flex gap-3 items-center">
          <span className="material-symbols-outlined">
            lock
          </span>

          <input
            value={user.password}
            name="password"
            onChange={handleChange}
            type="password"
            placeholder="Password"
            className="w-full outline-none"
          />
        </div>

        <button
        disabled ={loading}

          type="submit"
          className="w-full h-14 bg-black text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800"
        >
          <span className="material-symbols-outlined">
            how_to_reg
          </span>

          
          {loading? "submit...":"Register"}
        </button>

        <div className="text-center">
          <a
            href="/login"
            className="text-gray-500"
          >
            Already have an{" "}
            <span className="font-semibold text-black">
              account?
            </span>
          </a>
        </div>
      </form>
    </section>
  );
}