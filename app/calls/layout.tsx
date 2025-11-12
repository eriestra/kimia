"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft } from "lucide-react";

type CallsLayoutProps = {
  children: ReactNode;
};

export default function CallsLayout({ children }: CallsLayoutProps) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.users.getCurrentUser);

  const isDetailPage = pathname !== "/calls";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/kimia-imago.png"
                  alt="Kimia"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </Link>
              {isDetailPage && (
                <>
                  <div className="hidden sm:block h-6 w-px bg-gray-300" />
                  <Link
                    href="/dashboard/calls"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back to Calls</span>
                    <span className="sm:hidden">Back</span>
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <div className="hidden md:block text-sm text-right">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      router.push("/");
                    }}
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
