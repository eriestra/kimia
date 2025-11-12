"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, AlertCircle } from "lucide-react";

type UserRole =
  | "sysadmin"
  | "admin"
  | "evaluator"
  | "faculty"
  | "finance"
  | "observer";

export default function RegisterPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: "faculty", label: "Faculty / Researcher" },
    { value: "evaluator", label: "Evaluator" },
    { value: "admin", label: "Kimia Administrator" },
    { value: "finance", label: "Finance Officer" },
    { value: "observer", label: "Observer" },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const name = formData.get("name") as string;

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);

    try {
      // Remove confirmPassword from form data before sending
      formData.delete("confirmPassword");
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (err) {
      // Translate Convex Auth errors to user-friendly messages
      let errorMessage = "Failed to create account. Please try again.";

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate")) {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (msg.includes("invalid email")) {
          errorMessage = "Invalid email address. Please check and try again.";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          // Show original message if it's not a technical error
          errorMessage = err.message.includes("Error:") ? errorMessage : err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />

      {/* Back to home link */}
      <Link
        href="/"
        className="absolute top-8 left-8 inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to home</span>
      </Link>

      <div className="relative z-10 max-w-md w-full">
        {/* Glassmorphic card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">
              Create Account
            </h1>
            <p className="text-blue-200">Kimia Innovation Platform</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-lg border border-red-500/30 rounded-xl text-red-100 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="flex-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="flow" type="hidden" value="signUp" />

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Full Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Email <span className="text-pink-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="your.email@institution.edu"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Role <span className="text-pink-400">*</span>
              </label>
              <select
                id="role"
                name="role"
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {roles.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value} className="bg-slate-900">
                    {roleOption.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-blue-300">
                Select your primary role in the platform
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Password <span className="text-pink-400">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-blue-300">Minimum 8 characters</p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Confirm Password <span className="text-pink-400">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-bold shadow-2xl hover:shadow-blue-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                "Creating account..."
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-blue-200">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
