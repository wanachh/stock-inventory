"use client";

import React, { useState, useMemo } from "react";
import { ProductDetail } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import {
  Search,
  Filter,
  Plus,
  Minus,
  Layers,
  Edit2,
  AlertCircle,
  Barcode,
  Package,
  Upload,
  Download,
} from "lucide-react";

interface ProductTableProps {
  products: ProductDetail[];
  onOpenStockIn: (product: ProductDetail) => void;
  onOpenStockOut: (product: ProductDetail) => void;
  onViewBatches: (product: ProductDetail) => void;
  onEditProduct: (product: ProductDetail) => void;
  onOpenExcelImport?: () => void;
  onOpenExcelExport?: () => void;
  initialSearch?: string;
  initialStatusFilter?: string;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onOpenStockIn,
  onOpenStockOut,
  onViewBatches,
  onEditProduct,
  onOpenExcelImport,
  onOpenExcelExport,
  initialSearch = "",
  initialStatusFilter = "all",
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          p.name.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s) ||
          (p.barcode && p.barcode.toLowerCase().includes(s));
        if (!match) return false;
      }

      // Category
      if (categoryFilter !== "all" && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Status
      if (statusFilter !== "all" && p.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        {/* Search input (machine & human friendly) */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            data-scanner-input="true"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วย SKU, Barcode, หรือชื่อสินค้า..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-medium dark:bg-slate-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-2.5 py-1.5 transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter("InStock")}
              className={`rounded-xl px-2.5 py-1.5 transition cursor-pointer ${
                statusFilter === "InStock"
                  ? "bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              ปกติ
            </button>
            <button
              onClick={() => setStatusFilter("LowStock")}
              className={`rounded-xl px-2.5 py-1.5 transition cursor-pointer ${
                statusFilter === "LowStock"
                  ? "bg-amber-50 text-amber-700 shadow-xs dark:bg-amber-950 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              ใกล้หมด
            </button>
            <button
              onClick={() => setStatusFilter("OutOfStock")}
              className={`rounded-xl px-2.5 py-1.5 transition cursor-pointer ${
                statusFilter === "OutOfStock"
                  ? "bg-rose-50 text-rose-700 shadow-xs dark:bg-rose-950 dark:text-rose-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              หมด
            </button>
          </div>

          {/* Excel Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onOpenExcelImport && (
              <button
                type="button"
                onClick={onOpenExcelImport}
                className="flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-xs transition hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>นำเข้า Excel</span>
              </button>
            )}
            {onOpenExcelExport && (
              <button
                type="button"
                onClick={onOpenExcelExport}
                className="flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>ออกรายงาน Excel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm md:block dark:border-slate-800/80 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3.5">SKU / Barcode</th>
              <th className="px-4 py-3.5">ชื่อสินค้า / หมวดหมู่</th>
              <th className="px-4 py-3.5 text-center">สถานะสต็อก</th>
              <th className="px-4 py-3.5 text-right">จำนวนคงเหลือ</th>
              <th className="px-4 py-3.5 text-right">มูลค่าคงเหลือจริง</th>
              <th className="px-4 py-3.5 text-center">จัดการสต็อกด่วน</th>
              <th className="px-4 py-3.5 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isLow = p.status === "LowStock";
                const isOut = p.status === "OutOfStock";

                return (
                  <tr
                    key={p.id}
                    className="group transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    {/* SKU & Barcode */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {p.sku}
                      </div>
                      {p.barcode && (
                        <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <Barcode className="h-3 w-3" />
                          <span>{p.barcode}</span>
                        </div>
                      )}
                    </td>

                    {/* Name & Category */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-800">
                          {p.category}
                        </span>
                        <span>เกณฑ์เตือน: {p.minThreshold} ชิ้น</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center align-top">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                          หมดสต็อก
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          ปกติ
                        </span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {formatNumber(p.totalQuantityRemaining)}
                      </div>
                      <button
                        onClick={() => onViewBatches(p)}
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{p.activeBatches.length} ล็อตที่ยังเหลือ</span>
                      </button>
                    </td>

                    {/* Valuation */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.totalValuation)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        ตามราคาทุนจริง
                      </div>
                    </td>

                    {/* Quick In / Out */}
                    <td className="px-4 py-3.5 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenStockIn(p)}
                          title="รับสินค้าเข้าสต็อก (สร้างล็อตใหม่)"
                          className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>รับเข้า</span>
                        </button>
                        <button
                          onClick={() => onOpenStockOut(p)}
                          disabled={p.totalQuantityRemaining === 0}
                          title="ตัดสต็อกออก (คำนวณต้นทุน )"
                          className="flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                          <span>ตัดออก</span>
                        </button>
                      </div>
                    </td>

                    {/* Edit & Detail Tools */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditProduct(p)}
                          title="แก้ไขข้อมูลสินค้า (ชื่อ, หมวดหมู่, เกณฑ์เตือน, SKU)"
                          className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800/80 dark:bg-slate-900">
            ไม่พบสินค้า
          </div>
        ) : (
          filtered.map((p) => {
            const isLow = p.status === "LowStock";
            const isOut = p.status === "OutOfStock";

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {p.sku}
                      </span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-800">
                        {p.category}
                      </span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">
                      {p.name}
                    </h4>
                  </div>

                  {isOut ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      หมดสต็อก
                    </span>
                  ) : isLow ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      ใกล้หมด
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ปกติ
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-2.5 text-xs dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">คงเหลือ:</span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatNumber(p.totalQuantityRemaining)} ชิ้น
                    </div>
                    <button
                      onClick={() => onViewBatches(p)}
                      className="text-[11px] text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                    >
                      {p.activeBatches.length} ล็อต
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400">มูลค่ารวม:</span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.totalValuation)}
                    </div>
                    <span className="text-[10px] text-slate-400">ทุนจริงรายรอบ</span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onEditProduct(p)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>แก้ไข</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenStockIn(p)}
                      className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>รับเข้า</span>
                    </button>
                    <button
                      onClick={() => onOpenStockOut(p)}
                      disabled={p.totalQuantityRemaining === 0}
                      className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                      <span>ตัดออก</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
