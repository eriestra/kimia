"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (err) {
      // Translate Convex Auth errors to user-friendly messages
      let errorMessage = "Failed to sign in. Please try again.";

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();

        if (msg.includes("invalidsecret") || msg.includes("invalid secret")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (msg.includes("account not found") || msg.includes("user not found")) {
          errorMessage = "No account found with this email. Please check your email or register.";
        } else if (msg.includes("too many requests")) {
          errorMessage = "Too many login attempts. Please wait a few minutes and try again.";
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
            {/* Logo with glow */}
            <div className="mx-auto mb-6 h-24 w-24 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-2xl opacity-50 animate-pulse" />
              <Image
                src="/kimia-imago.png"
                alt="Kimia"
                fill
                className="object-contain relative z-10 drop-shadow-2xl"
                priority
              />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Sign In</h1>
            <p className="text-blue-200">Innovation Management Platform</p>
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
            <input name="flow" type="hidden" value="signIn" />

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Email
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
                htmlFor="password"
                className="block text-sm font-semibold text-blue-100 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
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
                "Signing in..."
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-blue-200">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
