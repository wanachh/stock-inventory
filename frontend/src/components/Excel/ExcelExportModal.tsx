"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  X,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { exportExcelReport } from "../../lib/excel";
import { ProductDetail, StockTransaction } from "../../types";

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDetail[];
  transactions: StockTransaction[];
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
}) => {
  const [reportType, setReportType] = useState<"StockIn" | "StockOut" | "CurrentStock" | "All">("StockIn");
  
  // Default date range: current month (e.g. 2026-08-01 to 2026-08-31)
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);

  if (!isOpen) return null;

  // Preset Date Range buttons
  const handlePreset = (preset: "today" | "7days" | "thisMonth" | "aug2026" | "all") => {
    const today = new Date();
    if (preset === "today") {
      const d = today.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "7days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === "thisMonth") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === "aug2026") {
      setStartDate("2026-08-01");
      setEndDate("2026-08-31");
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleExport = () => {
    let exportData: Array<{
      sku: string;
      barcode?: string | null;
      brand: string;
      quantity: number;
      priceBeforeVat: number;
      vat?: number | null;
      priceAfterVat?: number | null;
      date?: string;
      reference?: string;
    }> = [];

    let title = "รายงานสต็อกสินค้า StockPulse";

    if (reportType === "CurrentStock") {
      // Export current inventory batches
      title = "รายงานสินค้าคงเหลือปัจจุบันและราคาทุนจริง";
      products.forEach((prod) => {
        if (prod.activeBatches && prod.activeBatches.length > 0) {
          prod.activeBatches.forEach((batch) => {
            const preVat = batch.unitCost;
            const vat = +(preVat * 0.07).toFixed(2);
            exportData.push({
              sku: prod.sku,
              barcode: prod.barcode,
              brand: prod.name,
              quantity: batch.quantityRemaining,
              priceBeforeVat: preVat,
              vat: vat,
              priceAfterVat: +(preVat + vat).toFixed(2),
              reference: batch.batchNumber,
            });
          });
        } else if (prod.totalQuantityRemaining > 0) {
          exportData.push({
            sku: prod.sku,
            barcode: prod.barcode,
            brand: prod.name,
            quantity: prod.totalQuantityRemaining,
            priceBeforeVat: 0,
            vat: 0,
            priceAfterVat: 0,
          });
        }
      });
    } else {
      // Filter transactions by date range
      const start = startDate ? new Date(`${startDate}T00:00:00Z`).getTime() : 0;
      const end = endDate ? new Date(`${endDate}T23:59:59Z`).getTime() : Infinity;

      const filteredTx = transactions.filter((tx) => {
        const txTime = new Date(tx.createdAt).getTime();
        if (txTime < start || txTime > end) return false;

        if (reportType === "StockIn" && tx.type !== "StockIn") return false;
        if (reportType === "StockOut" && tx.type !== "StockOut") return false;

        return true;
      });

      filteredTx.forEach((tx) => {
        const unitCost = tx.quantity > 0 ? tx.totalCost / tx.quantity : 0;
        const preVat = +(unitCost).toFixed(2);
        const vat = +(preVat * 0.07).toFixed(2);
        const postVat = +(preVat + vat).toFixed(2);

        exportData.push({
          sku: tx.sku,
          barcode: "-",
          brand: tx.productName,
          quantity: tx.quantity,
          priceBeforeVat: preVat,
          vat: vat,
          priceAfterVat: postVat,
          date: tx.createdAt,
          reference: tx.referenceNote || "",
        });
      });
    }

    const rangeStr = startDate && endDate ? `${startDate}_to_${endDate}` : "All_Time";

    exportExcelReport({
      title,
      reportType,
      dateRangeStr: rangeStr,
      data: exportData,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                ส่งออกรายงาน Excel (.xlsx)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ฟอร์แมตตามเทมเพลต: ลำดับ, SKU, barcode, Brand, จำนวน, ราคาก่อนแวท, แวท, หลังแวท
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-6 space-y-5">
          {/* Report Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              ประเภทรายงานที่ต้องการส่งออก
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType("StockIn")}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                  reportType === "StockIn"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">1. รายงานรับเข้าสต็อก</div>
                  <div className="text-[10px] text-zinc-500">Stock In แยกตามราคาซื้อจริง</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("StockOut")}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                  reportType === "StockOut"
                    ? "border-amber-500 bg-amber-50/50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">2. รายงานตัดสต็อก FIFO</div>
                  <div className="text-[10px] text-zinc-500">Stock Out / ต้นทุนที่เบิกออก</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("CurrentStock")}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                  reportType === "CurrentStock"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
                }`}
              >
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">3. สต็อกคงเหลือปัจจุบัน</div>
                  <div className="text-[10px] text-zinc-500">ยอดคงเหลือทุกล็อตพร้อมมูลค่า</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("All")}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                  reportType === "All"
                    ? "border-purple-500 bg-purple-50/50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200"
                    : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
                }`}
              >
                <Filter className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">4. ประวัติเข้า-ออกทั้งหมด</div>
                  <div className="text-[10px] text-zinc-500">รวมทั้ง Stock In และ Out</div>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range Picker (Only for In/Out/All) */}
          {reportType !== "CurrentStock" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                เลือกช่วงวันที่ต้องการออกรายงาน (Date Range)
              </label>

              {/* Presets */}
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePreset("today")}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("7days")}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  7 วันล่าสุด
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("thisMonth")}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("aug2026")}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                >
                  สิงหาคม 2026
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("all")}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  ทั้งหมด
                </button>
              </div>

              {/* Inputs */}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-zinc-500">ตั้งแต่วันที่:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500">ถึงวันที่:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>ดาวน์โหลดรายงาน Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
