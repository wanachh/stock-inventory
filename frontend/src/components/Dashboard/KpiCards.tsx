"use client";

import React from "react";
import { DashboardKpis } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface KpiCardsProps {
  kpis: DashboardKpis;
  onFilterLowStock?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, onFilterLowStock }) => {
  const isLowStock = (kpis.lowStockProductCount || 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. สินค้าคงเหลือในคลัง (Current Stock Balance) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          {/* Card Top: Icon & Type Tag */}
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Package className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              คงเหลือในคลัง
            </span>
          </div>

          {/* Main Metric */}
          <div className="mt-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500">
              สินค้าคงเหลือทั้งหมด (Balance)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {formatNumber(kpis.totalRemainingItems)}
              </span>
              <span className="text-sm font-bold text-slate-400">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Footer info: มูลค่าต้นทุนจริง */}
        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">มูลค่าต้นทุนจริง:</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">
              {formatCurrency(kpis.totalRemainingValuation)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            คำนวณตามราคาซื้อจริงของทุกล็อตย่อย
          </p>
        </div>
      </div>

      {/* 2. ยอดตัดจ่าย / ขายออก (Stock Out / COGS) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          {/* Card Top: Icon & Type Tag */}
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
              เบิก-ขายออก
            </span>
          </div>

          {/* Main Metric */}
          <div className="mt-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500">
              ยอดตัดจ่าย / ขายออก (Stock Out)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {formatNumber(kpis.totalItemsOut)}
              </span>
              <span className="text-sm font-bold text-slate-400">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Footer info: ต้นทุนขายจริง  */}
        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">ต้นทุนตัดจ่าย ():</span>
            <span className="font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(kpis.totalCostOut)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>ตัดจากล็อตเก่าก่อนเสมอตามหลักบัญชี</span>
          </p>
        </div>
      </div>

      {/* 3. ยอดรับเข้าคลัง (Stock In / Purchases) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          {/* Card Top: Icon & Type Tag */}
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <TrendingDown className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              รับเข้าสต็อก
            </span>
          </div>

          {/* Main Metric */}
          <div className="mt-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500">
              ยอดรับเข้าสต็อก (Stock In)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {formatNumber(kpis.totalItemsIn)}
              </span>
              <span className="text-sm font-bold text-slate-400">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Footer info: มูลค่ารับเข้า */}
        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">มูลค่ายอดซื้อเข้ารวม:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpis.totalCostIn)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>แยกเก็บประวัติต้นทุนตามล็อตจริง</span>
          </p>
        </div>
      </div>

      {/* 4. แจ้งเตือนสินค้าใกล้หมด (Stock Alert & Health) */}
      <div className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isLowStock
          ? "border-amber-200/90 bg-amber-50/20 dark:border-amber-900/50 dark:bg-amber-950/20"
          : "border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900"
      }`}>
        <div>
          {/* Card Top: Icon & Status Tag */}
          <div className="flex items-center justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isLowStock
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
              isLowStock
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLowStock ? "bg-amber-600" : "bg-emerald-600"}`}></span>
              {isLowStock ? "ต้องเติมของ" : "สต็อกปกติ"}
            </span>
          </div>

          {/* Main Metric */}
          <div className="mt-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500">
              สินค้าใกล้หมด (Low Stock)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tight sm:text-4xl ${
                isLowStock ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
              }`}>
                {formatNumber(kpis.lowStockProductCount)}
              </span>
              <span className="text-sm font-bold text-slate-400">รายการ</span>
            </div>
          </div>
        </div>

        {/* Footer info: Action button */}
        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
          {isLowStock ? (
            <button
              type="button"
              onClick={onFilterLowStock}
              className="flex w-full items-center justify-between text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer group"
            >
              <span>ดูรายการที่ถึงจุดสั่งซื้อ</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>สถานะสินค้าทุกตัว:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">ปลอดภัย</span>
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {isLowStock
              ? "สินค้าต่ำกว่าเกณฑ์ความปลอดภัย (Reorder Point)"
              : "ไม่มีสินค้าที่ต่ำกว่าเกณฑ์สั่งซื้อขั้นต่ำ"}
          </p>
        </div>
      </div>
    </div>
  );
};
