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
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
        {/* Search input (machine & human friendly) */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            data-scanner-input="true"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วย SKU, Barcode, หรือชื่อสินค้า..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-10 pl-10 text-sm text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
            className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          >
            <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-medium dark:bg-zinc-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                statusFilter === "all"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter("InStock")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                statusFilter === "InStock"
                  ? "bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              ปกติ
            </button>
            <button
              onClick={() => setStatusFilter("LowStock")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                statusFilter === "LowStock"
                  ? "bg-amber-50 text-amber-700 shadow-xs dark:bg-amber-950 dark:text-amber-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              ใกล้หมด
            </button>
            <button
              onClick={() => setStatusFilter("OutOfStock")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                statusFilter === "OutOfStock"
                  ? "bg-rose-50 text-rose-700 shadow-xs dark:bg-rose-950 dark:text-rose-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
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
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-xs transition hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300"
              >
                <Download className="h-3.5 w-3.5" />
                <span>นำเข้า Excel</span>
              </button>
            )}
            {onOpenExcelExport && (
              <button
                type="button"
                onClick={onOpenExcelExport}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>ออกรายงาน Excel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:block dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
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
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
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
                    className="group transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
                  >
                    {/* SKU & Barcode */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {p.sku}
                      </div>
                      {p.barcode && (
                        <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          <Barcode className="h-3 w-3" />
                          <span>{p.barcode}</span>
                        </div>
                      )}
                    </td>

                    {/* Name & Category */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-zinc-800">
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
                      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {formatNumber(p.totalQuantityRemaining)}
                      </div>
                      <button
                        onClick={() => onViewBatches(p)}
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{p.activeBatches.length} ล็อตที่ยังเหลือ</span>
                      </button>
                    </td>

                    {/* Valuation */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(p.totalValuation)}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        ตามราคาทุนจริง
                      </div>
                    </td>

                    {/* Quick In / Out */}
                    <td className="px-4 py-3.5 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenStockIn(p)}
                          title="รับสินค้าเข้าสต็อก (สร้างล็อตใหม่)"
                          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>รับเข้า</span>
                        </button>
                        <button
                          onClick={() => onOpenStockOut(p)}
                          disabled={p.totalQuantityRemaining === 0}
                          title="ตัดสต็อกออก (คำนวณต้นทุน FIFO)"
                          className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
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
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
            ไม่พบสินค้า
          </div>
        ) : (
          filtered.map((p) => {
            const isLow = p.status === "LowStock";
            const isOut = p.status === "OutOfStock";

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {p.sku}
                      </span>
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-zinc-800">
                        {p.category}
                      </span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-50">
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

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-b border-zinc-100 py-2.5 text-xs dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">คงเหลือ:</span>
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(p.totalQuantityRemaining)} ชิ้น
                    </div>
                    <button
                      onClick={() => onViewBatches(p)}
                      className="text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {p.activeBatches.length} ล็อต
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 dark:text-zinc-400">มูลค่ารวม:</span>
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(p.totalValuation)}
                    </div>
                    <span className="text-[10px] text-zinc-400">ทุนจริงรายรอบ</span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onEditProduct(p)}
                    className="flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>แก้ไข</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenStockIn(p)}
                      className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>รับเข้า</span>
                    </button>
                    <button
                      onClick={() => onOpenStockOut(p)}
                      disabled={p.totalQuantityRemaining === 0}
                      className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
