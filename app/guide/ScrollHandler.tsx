"use client";

import { useEffect } from "react";

export default function ScrollHandler() {
  useEffect(() => {
    // Enable smooth scrolling for hash links
    document.documentElement.style.scrollBehavior = "smooth";

    // Handle initial hash on page load
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const element = document.getElementById(id);
      if (element) {
        // Small delay to ensure page is fully rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }

    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return null;
}
