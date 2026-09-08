"use client";

import React from "react";
import { MoreHorizontal } from "lucide-react";

interface StockDistributionDonutProps {
  healthyRatio?: number;
}

export const StockDistributionDonut: React.FC<StockDistributionDonutProps> = ({
  healthyRatio = 65,
}) => {
  // SVG Donut calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthyRatio / 100) * circumference;

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            สัดส่วนสต็อก (Distribution)
          </h3>
          <p className="text-xs text-slate-400">ภาพรวมล็อตและคลังสินค้า</p>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Radial Donut Chart */}
      <div className="relative my-4 flex items-center justify-center">
        <svg className="h-44 w-44 -rotate-90 transform" viewBox="0 0 140 140">
          {/* Background track (Amber/Gold for pending/depleted) */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#f59e0b"
            strokeWidth="16"
            fill="transparent"
          />
          {/* Active portion (Royal Blue for healthy active lots) */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#2563eb"
            strokeWidth="16"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {healthyRatio}%
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Active Stock
          </span>
        </div>
      </div>

      {/* Legend & Footnote */}
      <div>
        <div className="flex items-center justify-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-700 dark:text-slate-300">สต็อกพร้อมจ่าย (65%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700 dark:text-slate-300">สำรอง / รอเบิก (35%)</span>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          * ประเมินจากรอบหมุนเวียนสินค้าและเกณฑ์สต็อกขั้นต่ำ
        </p>
      </div>
    </div>
  );
};
