"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import RoleSwitcher from "@/components/RoleSwitcher";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  roles: Array<
    | "sysadmin"
    | "admin"
    | "evaluator"
    | "faculty"
    | "finance"
    | "observer"
  >;
  subItems?: Array<{
    href: string;
    label: string;
    roles: Array<
      | "sysadmin"
      | "admin"
      | "evaluator"
      | "faculty"
      | "finance"
      | "observer"
    >;
  }>;
}> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: [
      "sysadmin",
      "admin",
      "evaluator",
      "faculty",
      "finance",
      "observer",
    ],
  },
  {
    href: "/dashboard/calls",
    label: "Calls",
    roles: [
      "sysadmin",
      "admin",
      "evaluator",
      "faculty",
      "finance",
      "observer",
    ],
  },
  {
    href: "/dashboard/proposals",
    label: "Proposals",
    roles: ["sysadmin", "admin", "faculty", "evaluator"],
    subItems: [
      {
        href: "/dashboard/proposals/my-proposals",
        label: "My Proposals",
        roles: ["faculty", "sysadmin", "admin"],
      },
      {
        href: "/dashboard/proposals/all",
        label: "All Proposals",
        roles: ["sysadmin", "admin"],
      },
    ],
  },
  {
    href: "/dashboard/matrix",
    label: "Assignment Matrix",
    roles: ["sysadmin", "admin"],
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    roles: ["sysadmin", "admin", "faculty"],
    subItems: [
      {
        href: "/dashboard/projects/my-projects",
        label: "My Projects",
        roles: ["faculty", "sysadmin", "admin"],
      },
      {
        href: "/dashboard/projects/all",
        label: "All Projects",
        roles: ["sysadmin", "admin"],
      },
    ],
  },
  {
    href: "/dashboard/evaluators",
    label: "Evaluators",
    roles: ["sysadmin", "admin", "evaluator"],
    subItems: [
      {
        href: "/dashboard/evaluators/my-evaluations",
        label: "My Evaluations",
        roles: ["evaluator", "sysadmin", "admin"],
      },
      {
        href: "/dashboard/evaluators/manage",
        label: "Manage Evaluators",
        roles: ["sysadmin", "admin"],
      },
    ],
  },
  {
    href: "/dashboard/admin/audit",
    label: "Audit",
    roles: ["sysadmin", "admin"],
  },
  {
    href: "/dashboard/admin/users",
    label: "Users",
    roles: ["sysadmin", "admin"],
  },
];

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user === null) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  const navigation = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
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
              <div className="hidden md:flex items-center gap-4">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  // If item has subitems, render a dropdown
                  if (item.subItems && item.subItems.length > 0) {
                    const visibleSubItems = item.subItems.filter(subItem =>
                      subItem.roles.includes(user.role)
                    );

                    return (
                      <div key={item.href} className="relative group">
                        <Link
                          href={item.href}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {item.label}
                        </Link>
                        {/* Dropdown menu */}
                        <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                          {visibleSubItems.map((subItem) => {
                            const subIsActive = pathname === subItem.href;
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`block px-4 py-2 text-sm transition ${
                                  subIsActive
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {subItem.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Regular item without subitems
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-right">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-gray-500">{user.email}</p>
              </div>
              <Link
                href="/dashboard/settings"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Settings
              </Link>
              <button
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b border-gray-200 md:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            // If item has subitems, show them all inline on mobile
            if (item.subItems && item.subItems.length > 0) {
              const visibleSubItems = item.subItems.filter(subItem =>
                subItem.roles.includes(user.role)
              );

              return (
                <div key={item.href} className="flex flex-wrap gap-2 w-full">
                  {/* Parent label (non-clickable, just for grouping) */}
                  <span className="text-xs text-gray-500 font-semibold w-full">
                    {item.label}:
                  </span>
                  {visibleSubItems.map((subItem) => {
                    const subIsActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                          subIsActive ? "bg-blue-600 text-white" : "text-gray-600 bg-gray-100"
                        }`}
                      >
                        {subItem.label}
                      </Link>
                    );
                  })}
                </div>
              );
            }

            // Regular item
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive ? "bg-blue-600 text-white" : "text-gray-600 bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Role Switcher for sysadmin (testing/demo only) */}
      <RoleSwitcher />
    </div>
  );
}
