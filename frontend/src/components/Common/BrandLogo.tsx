"use client";

import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showText = false,
  className = "",
}) => {
  const sizeMap = {
    sm: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-sm" },
    md: { box: "h-10 w-10", icon: "h-5 w-5", text: "text-base" },
    lg: { box: "h-14 w-14", icon: "h-7 w-7", text: "text-xl" },
    xl: { box: "h-20 w-20", icon: "h-10 w-10", text: "text-2xl" },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Modern Geometric Pulse Logo */}
      <div
        className={`relative flex ${current.box} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transition-transform duration-300 hover:scale-105`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className={current.icon}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Central Core Pulse */}
          <circle cx="16" cy="16" r="3.2" fill="white" />
          {/* Top Node */}
          <circle cx="16" cy="7" r="2.8" fill="white" fillOpacity="0.9" />
          {/* Bottom Node */}
          <circle cx="16" cy="25" r="2.8" fill="white" fillOpacity="0.9" />
          {/* Left Node */}
          <circle cx="7" cy="16" r="2.8" fill="white" fillOpacity="0.9" />
          {/* Right Node */}
          <circle cx="25" cy="16" r="2.8" fill="white" fillOpacity="0.9" />
          {/* Connecting Pulse Orbits */}
          <path
            d="M16 10V13M16 19V22M10 16H13M19 16H22"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
        </svg>

        {/* Ambient Ring Glow */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight text-slate-900 dark:text-slate-50 ${current.text}`}>
            Stock<span className="text-blue-600 dark:text-blue-400">Pulse</span>
          </span>
          <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Inventory & Costing
          </span>
        </div>
      )}
    </div>
  );
};
