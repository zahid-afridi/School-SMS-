"use client";

import PageLoader from "@/app/components/PageLoader";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaLock, FaUserCog, FaEnvelope, FaUser } from "react-icons/fa";
import {
  useChangePasswordMutation,
  useGetMeQuery,
  useUpdateAccountMutation,
} from "@/redux/features/auth/authApi";

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

export default function Page() {
  const { data: me, isLoading, isError } = useGetMeQuery();
  const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const [account, setAccount] = useState({
    email: "",
    username: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!me) return;
    setAccount({
      email: me.email ?? "",
      username: me.username ?? "",
    });
  }, [me]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.email.trim() || !account.username.trim()) {
      toast.error("Email and username are required");
      return;
    }

    try {
      const res = await updateAccount({
        email: account.email.trim(),
        username: account.username.trim(),
      }).unwrap();
      toast.success(res.message || "Account updated");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update account"
      );
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error("Current and new password are required");
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      const res = await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }).unwrap();
      toast.success(res.message || "Password changed");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to change password"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading account" />
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">Failed to load account settings.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-medium mb-2">
            <FaUserCog /> General Settings
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Account Settings
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your login email, username, and password.
          </p>
        </div>

        {/* Account info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Login Details
            </h2>
            <span className="text-xs rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 font-medium">
              {me.role}
            </span>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <span className="inline-flex items-center gap-2">
                  <FaEnvelope className="text-slate-400" /> Email
                </span>
              </label>
              <input
                type="email"
                value={account.email}
                onChange={(e) =>
                  setAccount((prev) => ({ ...prev, email: e.target.value }))
                }
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <span className="inline-flex items-center gap-2">
                  <FaUser className="text-slate-400" /> Username
                </span>
              </label>
              <input
                value={account.username}
                onChange={(e) =>
                  setAccount((prev) => ({ ...prev, username: e.target.value }))
                }
                className={inputClass}
                placeholder="username"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-500 pt-1">
              <p>
                Account status:{" "}
                <span className="font-medium text-slate-700">
                  {me.isActive ? "Active" : "Inactive"}
                </span>
              </p>
              <p>
                School:{" "}
                <span className="font-medium text-slate-700">
                  {me.school?.name || "—"}
                </span>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="min-h-11 w-full rounded-xl bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
              >
                {isUpdating ? "Saving..." : "Save Account"}
              </button>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <FaLock className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Change Password
            </h2>
          </div>

          <form
            method="post"
            onSubmit={handlePasswordSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className={inputClass}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Repeat new password"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="min-h-11 w-full rounded-xl bg-slate-900 px-6 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-60 sm:w-auto"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
