"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DailyMovementSummary } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
} from "lucide-react";

interface MovementChartProps {
  data: DailyMovementSummary[];
  productName?: string;
}

export const MovementChart: React.FC<MovementChartProps> = ({ data, productName }) => {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<"quantity" | "cost">("quantity");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fallback demo data if no movement data yet
  const safeData =
    data && data.length > 0
      ? data
      : [
          { date: "02 Sep", inQuantity: 20, outQuantity: 12, inCost: 2000, outCost: 1200 },
          { date: "03 Sep", inQuantity: 35, outQuantity: 28, inCost: 3500, outCost: 2800 },
          { date: "04 Sep", inQuantity: 15, outQuantity: 40, inCost: 1500, outCost: 4000 },
          { date: "05 Sep", inQuantity: 50, outQuantity: 25, inCost: 5000, outCost: 2500 },
          { date: "06 Sep", inQuantity: 80, outQuantity: 55, inCost: 8000, outCost: 5500 },
          { date: "07 Sep", inQuantity: 30, outQuantity: 65, inCost: 3000, outCost: 6500 },
          { date: "08 Sep", inQuantity: 75, outQuantity: 22, inCost: 7500, outCost: 2200 },
        ];

  // Quick-glance totals for executive summary
  const totalIn = safeData.reduce(
    (acc, d) => acc + (metric === "quantity" ? d.inQuantity : d.inCost),
    0
  );
  const totalOut = safeData.reduce(
    (acc, d) => acc + (metric === "quantity" ? d.outQuantity : d.outCost),
    0
  );
  const netFlow = totalIn - totalOut;

  // Maximum value for scaling the bar heights
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
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {productName
                ? t("dashboard.chartTitleProduct", { name: productName })
                : t("dashboard.chartTitle")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
            {productName
              ? t("dashboard.chartSubtitleProduct", { name: productName })
              : t("dashboard.chartSubtitle")}
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center rounded-2xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMetric("quantity")}
            className={`rounded-xl px-3.5 py-1.5 transition cursor-pointer ${
              metric === "quantity"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t("dashboard.chartQuantity")}
          </button>
          <button
            type="button"
            onClick={() => setMetric("cost")}
            className={`rounded-xl px-3.5 py-1.5 transition cursor-pointer ${
              metric === "cost"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t("dashboard.chartCost")}
          </button>
        </div>
      </div>

      {/* 2. Executive Quick-Glance Summary Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-4 border-b border-slate-100 pb-4 dark:border-slate-800/80">
        {/* Total In */}
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50/80 px-3.5 py-1.5 dark:bg-blue-950/40">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
            <ArrowDownRight className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t("dashboard.chartIn")}
          </span>
          <span className="text-xs font-black text-blue-700 dark:text-blue-400">
            {metric === "quantity" ? `+${formatNumber(totalIn)} ${t("dashboard.chartPieces")}` : formatCurrency(totalIn)}
          </span>
        </div>

        {/* Total Out */}
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50/80 px-3.5 py-1.5 dark:bg-rose-950/40">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t("dashboard.chartOut")}
          </span>
          <span className="text-xs font-black text-rose-700 dark:text-rose-400">
            {metric === "quantity" ? `-${formatNumber(totalOut)} ${t("dashboard.chartPieces")}` : formatCurrency(totalOut)}
          </span>
        </div>

        {/* Last 7 days label */}
        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          <span>{t("dashboard.chartLast7")}</span>
        </div>
      </div>

      {/* 3. Grouped Bar Chart Area */}
      <div className="relative mt-6 pt-6">
        {/* Background Horizontal Guide Grid Lines */}
        <div className="pointer-events-none absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between">
          <div className="border-b border-dashed border-slate-100 dark:border-slate-800/80 w-full" />
          <div className="border-b border-dashed border-slate-100 dark:border-slate-800/80 w-full" />
          <div className="border-b border-dashed border-slate-100 dark:border-slate-800/80 w-full" />
          <div className="border-b border-slate-200 dark:border-slate-800 w-full" />
        </div>

        {/* The Bars Container */}
        <div className="relative flex h-56 items-end justify-between gap-2 sm:gap-6 px-2 sm:px-4">
          {safeData.map((d, index) => {
            const inVal = metric === "quantity" ? d.inQuantity : d.inCost;
            const outVal = metric === "quantity" ? d.outQuantity : d.outCost;

            const inPercent = maxVal > 0 ? (inVal / maxVal) * 100 : 0;
            const outPercent = maxVal > 0 ? (outVal / maxVal) * 100 : 0;

            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative flex flex-1 flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* Floating Tooltip when hovering a column */}
                {isHovered && (
                  <div className="absolute -top-16 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="rounded-2xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xl dark:bg-slate-800 dark:border dark:border-slate-700 whitespace-nowrap">
                      <div className="text-slate-400 text-[10px] pb-0.5 border-b border-slate-700/60 mb-1">
                        {d.date}
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <span>รับเข้า:</span>
                        <span className="font-extrabold text-white">
                          {metric === "quantity" ? `${formatNumber(d.inQuantity)} ชิ้น` : formatCurrency(d.inCost)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-rose-400">
                        <span>ตัดออก:</span>
                        <span className="font-extrabold text-white">
                          {metric === "quantity" ? `${formatNumber(d.outQuantity)} ชิ้น` : formatCurrency(d.outCost)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-1.5 -mt-0.5 rotate-45 bg-slate-900 dark:bg-slate-800" />
                  </div>
                )}

                {/* The Two Grouped Bars */}
                <div className="flex items-end justify-center gap-1 sm:gap-2 w-full h-[180px]">
                  {/* 1. Inbound Bar (Blue) */}
                  <div className="relative flex flex-col items-center flex-1 max-w-[28px] h-full justify-end">
                    {/* Number on top of bar for instant glance */}
                    {inVal > 0 && inPercent > 18 && (
                      <span className="mb-1 hidden sm:block text-[10px] font-black text-blue-600 dark:text-blue-400">
                        {metric === "quantity" ? formatNumber(inVal) : `${Math.round(inVal / 1000)}k`}
                      </span>
                    )}
                    <div
                      style={{ height: `${Math.max(inVal > 0 ? 6 : 2, inPercent)}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        inVal > 0
                          ? "bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 shadow-sm shadow-blue-500/20"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    />
                  </div>

                  {/* 2. Outbound Bar (Rose) */}
                  <div className="relative flex flex-col items-center flex-1 max-w-[28px] h-full justify-end">
                    {/* Number on top of bar for instant glance */}
                    {outVal > 0 && outPercent > 18 && (
                      <span className="mb-1 hidden sm:block text-[10px] font-black text-rose-600 dark:text-rose-400">
                        {metric === "quantity" ? formatNumber(outVal) : `${Math.round(outVal / 1000)}k`}
                      </span>
                    )}
                    <div
                      style={{ height: `${Math.max(outVal > 0 ? 6 : 2, outPercent)}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        outVal > 0
                          ? "bg-rose-500 hover:bg-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400 shadow-sm shadow-rose-500/20"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* X-Axis Day Label */}
                <div className="mt-3 text-center">
                  <span className={`text-[11px] font-bold block transition-colors ${
                    isHovered
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}>
                    {d.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Legend at bottom */}
      <div className="mt-4 flex items-center justify-center gap-6 sm:gap-10 border-t border-slate-100 pt-3.5 text-xs font-bold dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-md bg-blue-600 dark:bg-blue-500 shadow-xs" />
          <span className="text-slate-700 dark:text-slate-300">
            แท่งสีน้ำเงิน: รับเข้าสต็อก (Stock In)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-md bg-rose-500 dark:bg-rose-500 shadow-xs" />
          <span className="text-slate-700 dark:text-slate-300">
            แท่งสีชมพูแดง: เบิก-ขายออก (Stock Out)
          </span>
        </div>
      </div>
    </div>
  );
};
