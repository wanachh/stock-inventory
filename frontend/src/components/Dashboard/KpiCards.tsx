"use client";

import React, { useState } from "react";
import { DashboardKpis } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  MoreHorizontal,
  Layers,
  Sparkles,
} from "lucide-react";

interface KpiCardsProps {
  kpis: DashboardKpis;
  onFilterLowStock?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, onFilterLowStock }) => {
  const [timeRange, setTimeRange] = useState("7 days");

  // Calculate stock health percentages for the Activity Bubbles card
  const totalItems = kpis.totalRemainingItems || 1;
  const lowCount = kpis.lowStockProductCount || 0;
  const normalPercent = Math.max(10, Math.min(85, 100 - lowCount * 10));
  const lowPercent = Math.min(70, lowCount * 10);
  const outPercent = Math.max(5, 100 - normalPercent - lowPercent);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. HERO ROYAL BLUE CARD: Balance & Ending Valuation */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-600/20 transition-transform duration-200 hover:-translate-y-0.5">
        {/* Top bar: icon & period selector */}
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Package className="h-5 w-5 text-white" />
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-md hover:bg-white/25 transition cursor-pointer"
          >
            <span>{timeRange}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Value */}
        <div className="mt-5">
          <span className="text-xs font-semibold tracking-wider text-blue-100 uppercase">
            สินค้าคงเหลือจริง (Balance)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {formatNumber(kpis.totalRemainingItems)}
            </span>
            <span className="text-sm font-semibold text-blue-200">ชิ้น</span>
          </div>
          <div className="mt-1 text-xs font-medium text-blue-100/80">
            มูลค่าทุนจริง: <strong className="text-white">{formatCurrency(kpis.totalRemainingValuation)}</strong>
          </div>
        </div>

        {/* Mini Equalizer Bar Graphic (matching reference image) */}
        <div className="mt-6 flex items-end gap-1.5 h-10 pt-2">
          {[40, 65, 80, 50, 95, 70, 85, 60, 90, 75, 100, 80, 60].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 rounded-full bg-white/40 transition-all duration-300 hover:bg-white"
            />
          ))}
        </div>
      </div>

      {/* 2. WHITE CARD WITH CORAL/ROSE WAVE: Sells / Stock Out (COGS) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <button
              type="button"
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <span>{timeRange}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              สินค้าตัดออก (COGS Sells)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {formatNumber(kpis.totalItemsOut)}
              </span>
              <span className="text-sm font-semibold text-slate-400">ชิ้น</span>
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              ต้นทุนจริง: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(kpis.totalCostOut)}</strong>
            </div>
          </div>
        </div>

        {/* Smooth Coral/Rose Wave Sparkline SVG */}
        <div className="mt-4 -mx-2">
          <svg viewBox="0 0 200 60" className="w-full h-12 overflow-visible" fill="none">
            <path
              d="M0 45 C 30 55, 50 15, 80 35 C 110 55, 140 10, 170 30 C 185 40, 195 20, 200 25"
              stroke="#f43f5e"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M0 45 C 30 55, 50 15, 80 35 C 110 55, 140 10, 170 30 C 185 40, 195 20, 200 25 L 200 60 L 0 60 Z"
              fill="url(#rose-grad)"
              opacity="0.15"
            />
            <defs>
              <linearGradient id="rose-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 3. WHITE CARD WITH AMBER/GOLD WAVE: Revenue / Stock In */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <button
              type="button"
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <span>{timeRange}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              สินค้ารับเข้ารอบนี้ (Revenue In)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {formatNumber(kpis.totalItemsIn)}
              </span>
              <span className="text-sm font-semibold text-slate-400">ชิ้น</span>
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              ยอดซื้อเข้า: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.totalCostIn)}</strong>
            </div>
          </div>
        </div>

        {/* Smooth Amber/Gold Wave Sparkline SVG */}
        <div className="mt-4 -mx-2">
          <svg viewBox="0 0 200 60" className="w-full h-12 overflow-visible" fill="none">
            <path
              d="M0 35 C 30 15, 60 55, 90 25 C 120 0, 150 45, 180 20 C 190 12, 195 28, 200 25"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M0 35 C 30 15, 60 55, 90 25 C 120 0, 150 45, 180 20 C 190 12, 195 28, 200 25 L 200 60 L 0 60 Z"
              fill="url(#amber-grad)"
              opacity="0.15"
            />
            <defs>
              <linearGradient id="amber-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 4. ACTIVITY: Overlapping Bubble Metrics (matching reference image) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
            Activity & Health
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Interlocking Colorful Bubble Circles (Matching reference image) */}
        <div className="relative my-2 flex h-32 items-center justify-center">
          {/* Main Blue Bubble: Normal stock */}
          <div className="absolute left-6 top-3 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-transform duration-300 hover:scale-105 z-20">
            <span className="text-xs font-black">85%</span>
            <span className="text-[9px] text-blue-100 font-medium">In Stock</span>
          </div>

          {/* Rose Bubble: Low stock alert */}
          <div
            onClick={onFilterLowStock}
            className="absolute right-6 top-2 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/30 transition-transform duration-300 hover:scale-110 z-10 cursor-pointer"
          >
            <span className="text-xs font-black">{kpis.lowStockProductCount}</span>
            <span className="text-[9px] text-rose-100 font-medium">Low Stock</span>
          </div>

          {/* Gold Bubble: Depleted / Out */}
          <div className="absolute bottom-1 right-12 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-md shadow-amber-400/30 transition-transform duration-300 hover:scale-105 z-30">
            <span className="text-xs font-black">FIFO</span>
            <span className="text-[8px] font-bold">Active</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <span>พร้อมจ่ายปกติ: <strong className="text-blue-600 dark:text-blue-400">85%</strong></span>
          <span
            onClick={onFilterLowStock}
            className="font-semibold text-rose-500 hover:underline cursor-pointer"
          >
            เตือน {kpis.lowStockProductCount} รายการ →
          </span>
        </div>
      </div>
    </div>
  );
};
