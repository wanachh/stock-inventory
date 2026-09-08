"use client";

import React from "react";
import { DashboardKpis } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import { Package, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";

interface KpiCardsProps {
  kpis: DashboardKpis;
  onFilterLowStock?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, onFilterLowStock }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Ending Stock Balance */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-5 shadow-sm dark:border-blue-900/30 dark:from-blue-950/30 dark:via-zinc-900 dark:to-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
            สินค้าคงเหลือจริง
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <Package className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              {formatNumber(kpis.totalRemainingItems)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              ชิ้น
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-blue-100/80 pt-2 dark:border-blue-900/30">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              มูลค่าต้นทุนคงเหลือ:
            </span>
            <span className="font-semibold text-blue-700 dark:text-blue-300">
              {formatCurrency(kpis.totalRemainingValuation)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Stock Out / COGS */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-white p-5 shadow-sm dark:border-rose-900/30 dark:from-rose-950/30 dark:via-zinc-900 dark:to-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-rose-600 uppercase dark:text-rose-400">
            ต้นทุนที่ตัดออก (COGS)
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shadow-rose-500/30">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              {formatNumber(kpis.totalItemsOut)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              ชิ้นที่ออก
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-rose-100/80 pt-2 dark:border-rose-900/30">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ต้นทุนจริงที่ออกไป:
            </span>
            <span className="font-semibold text-rose-700 dark:text-rose-300">
              {formatCurrency(kpis.totalCostOut)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stock In */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-sm dark:border-emerald-900/30 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
            สินค้ารับเข้ารวม
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/30">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              {formatNumber(kpis.totalItemsIn)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              ชิ้นรับเข้า
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-emerald-100/80 pt-2 dark:border-emerald-900/30">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              มูลค่าที่ซื้อเข้ารวม:
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(kpis.totalCostIn)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Low Stock Alert */}
      <div
        onClick={onFilterLowStock}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-white p-5 shadow-sm transition hover:border-amber-300 active:scale-[0.99] dark:border-amber-900/30 dark:from-amber-950/30 dark:via-zinc-900 dark:to-zinc-900 dark:hover:border-amber-700"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
            สินค้าใกล้หมดสต็อก
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              {formatNumber(kpis.lowStockProductCount)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              รายการ
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-amber-100/80 pt-2 dark:border-amber-900/30">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              สต็อก $\le$ เกณฑ์ Min:
            </span>
            <span className="text-xs font-semibold text-amber-700 underline group-hover:text-amber-800 dark:text-amber-300">
              คลิกเพื่อดูรายการ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
