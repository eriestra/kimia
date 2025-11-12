"use client";

import TessellationBackground from "./TessellationBackground";
import { LucideIcon } from "lucide-react";

interface TessellationHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  gradient?: string; // Custom gradient colors, e.g., "from-blue-500 to-cyan-500"
}

export default function TessellationHeader({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  gradient = "from-blue-600/50 to-indigo-600/50",
}: TessellationHeaderProps) {
  return (
    <header className={`relative rounded-2xl shadow-xl p-8 text-white overflow-hidden ${className}`}>
      {/* Dark base background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />

      {/* Tessellation Background - animated triangles */}
      <div className="absolute inset-0 opacity-40">
        <TessellationBackground />
      </div>

      {/* Gradient overlay for color */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} pointer-events-none`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">{title}</h1>
            <p className="text-white/90 text-lg drop-shadow-md">{description}</p>
          </div>
        </div>
        {action && <div className="relative z-20">{action}</div>}
      </div>
    </header>
  );
}
