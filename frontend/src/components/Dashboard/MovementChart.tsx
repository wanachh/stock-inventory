"use client";

import React, { useState } from "react";
import { DailyMovementSummary } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import { ChevronDown, MoreHorizontal } from "lucide-react";

interface MovementChartProps {
  data: DailyMovementSummary[];
}

export const MovementChart: React.FC<MovementChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<"quantity" | "cost">("quantity");
  const [timeRange, setTimeRange] = useState("7 days");

  const safeData = data.length > 0 ? data : [
    { date: "2026-09-02", inQuantity: 20, outQuantity: 15, inCost: 200, outCost: 150 },
    { date: "2026-09-03", inQuantity: 35, outQuantity: 25, inCost: 350, outCost: 250 },
    { date: "2026-09-04", inQuantity: 45, outQuantity: 40, inCost: 450, outCost: 400 },
    { date: "2026-09-05", inQuantity: 60, outQuantity: 30, inCost: 600, outCost: 300 },
    { date: "2026-09-06", inQuantity: 80, outQuantity: 55, inCost: 800, outCost: 550 },
    { date: "2026-09-07", inQuantity: 70, outQuantity: 65, inCost: 700, outCost: 650 },
    { date: "2026-09-08", inQuantity: 90, outQuantity: 75, inCost: 900, outCost: 750 },
  ];

  const maxVal = Math.max(
    1,
    ...safeData.map((d) =>
      metric === "quantity"
        ? Math.max(d.inQuantity, d.outQuantity)
        : Math.max(d.inCost, d.outCost)
    )
  );

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            ความเคลื่อนไหวสต็อก (Movement Flow)
          </h3>
          <p className="text-xs text-slate-400">
            แนวโน้มการรับเข้าและตัดออกตามมาตรฐานบัญชี FIFO
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle metric */}
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800">
            <button
              onClick={() => setMetric("quantity")}
              className={`rounded-xl px-3 py-1 transition cursor-pointer ${
                metric === "quantity"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              จำนวน (ชิ้น)
            </button>
            <button
              onClick={() => setMetric("cost")}
              className={`rounded-xl px-3 py-1 transition cursor-pointer ${
                metric === "cost"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              ต้นทุน (฿)
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
          >
            <span>{timeRange}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Smooth Wave Chart (Matching the reference design) */}
      <div className="relative mt-6 h-56 w-full">
        {/* Peak Value Tooltip Pill (matching reference image) */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-black text-white shadow-xl dark:bg-white dark:text-slate-900">
            {metric === "quantity" ? `${formatNumber(maxVal)} ชิ้น` : formatCurrency(maxVal)}
          </div>
          <div className="h-2 w-2 -mt-1 rotate-45 bg-slate-900 dark:bg-white" />
          <div className="h-28 w-px border-l border-dashed border-slate-300 dark:border-slate-700" />
        </div>

        {/* SVG Wave Curves */}
        <svg
          viewBox="0 0 500 200"
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines */}
          <line x1="0" y1="40" x2="500" y2="40" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
          <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
          <line x1="0" y1="160" x2="500" y2="160" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />

          {/* Dotted Coral/Rose Spline (Stock Out / Last Period) */}
          <path
            d="M 0 140 C 60 180, 120 70, 180 130 C 240 190, 300 60, 360 120 C 420 180, 470 70, 500 90"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="3"
            strokeDasharray="5 5"
          />

          {/* Solid Royal Blue Spline (Stock In / This Period) */}
          <path
            d="M 0 160 C 60 90, 120 150, 180 110 C 240 70, 250 40, 310 120 C 370 160, 430 80, 500 130"
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Blue gradient fill underneath */}
          <path
            d="M 0 160 C 60 90, 120 150, 180 110 C 240 70, 250 40, 310 120 C 370 160, 430 80, 500 130 L 500 200 L 0 200 Z"
            fill="url(#blue-spline-grad)"
            opacity="0.1"
          />

          <defs>
            <linearGradient id="blue-spline-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Legend & Month markers */}
      <div className="mt-4 flex items-center justify-center gap-8 border-t border-slate-100 pt-3 text-xs font-semibold dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-700 dark:text-slate-300">รับเข้าสต็อก (Stock In)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-rose-500 bg-rose-100" />
          <span className="text-slate-700 dark:text-slate-300">ตัดออกจริง (Stock Out)</span>
        </div>
      </div>
    </div>
  );
};
