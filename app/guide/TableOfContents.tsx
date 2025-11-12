"use client";

import { useState, useEffect } from "react";
import { List } from "lucide-react";

type TocItem = {
  level: number;
  content: string;
  slug: string;
};

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -35% 0px",
      }
    );

    // Observe all headings
    items.forEach((item) => {
      const element = document.getElementById(item.slug);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [items]);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b-2 border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <List className="w-5 h-5 text-purple-600" />
            Contents
          </h2>
        </div>
        <nav className="px-4 py-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li key={`toc-${index}`}>
                <a
                  href={`#${item.slug}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                    activeId === item.slug
                      ? "bg-purple-100 text-purple-900 font-bold shadow-sm"
                      : "hover:bg-purple-50 hover:text-purple-700"
                  } ${
                    item.level === 2
                      ? "font-semibold text-gray-900"
                      : "ml-4 text-gray-600 font-medium"
                  }`}
                >
                  {item.content}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
