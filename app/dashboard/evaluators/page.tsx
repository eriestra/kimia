"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function EvaluatorsPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (user.role === "sysadmin" || user.role === "admin") {
        // Admins go to manage evaluators by default
        router.push("/dashboard/evaluators/manage");
      } else if (user.role === "evaluator") {
        // Evaluators go to their evaluations
        router.push("/dashboard/evaluators/my-evaluations");
      } else {
        // Other roles shouldn't access this, redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
