"use client";

import React, { useState, useMemo } from "react";
import { StockTransaction } from "../../types";
import { formatCurrency, formatDateTime, formatNumber } from "../../lib/api";
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  FileSpreadsheet,
  Edit2,
  Trash2,
} from "lucide-react";

interface TransactionJournalProps {
  transactions: StockTransaction[];
  onRefresh?: () => void;
  onEditTransaction?: (transaction: StockTransaction) => void;
  onDeleteTransaction?: (transaction: StockTransaction) => void;
}

export const TransactionJournal: React.FC<TransactionJournalProps> = ({
  transactions,
  onRefresh,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          t.productName.toLowerCase().includes(s) ||
          t.sku.toLowerCase().includes(s) ||
          (t.referenceNote && t.referenceNote.toLowerCase().includes(s));
        if (!match) return false;
      }

      if (typeFilter !== "all" && t.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [transactions, searchTerm, typeFilter]);

  // Export to CSV for Accounting
  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Date",
      "Type",
      "SKU",
      "ProductName",
      "Quantity",
      "TotalCost",
      "Reference",
    ];
    const rows = filtered.map((t) => [
      t.id,
      `"${t.createdAt}"`,
      t.type,
      `"${t.sku}"`,
      `"${t.productName}"`,
      t.quantity,
      t.totalCost,
      `"${t.referenceNote || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วย SKU, ชื่อสินค้า, หรือเลขที่บิลอ้างอิง..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pr-4 pl-9 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Type tabs */}
          <div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-medium dark:bg-zinc-800">
            <button
              onClick={() => setTypeFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                typeFilter === "all"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              ทั้งหมด ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter("StockIn")}
              className={`rounded-lg px-3 py-1.5 transition ${
                typeFilter === "StockIn"
                  ? "bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              รับเข้า
            </button>
            <button
              onClick={() => setTypeFilter("StockOut")}
              className={`rounded-lg px-3 py-1.5 transition ${
                typeFilter === "StockOut"
                  ? "bg-rose-50 text-rose-700 shadow-xs dark:bg-rose-950 dark:text-rose-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              ตัดออก
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            title="ส่งออกรายงานเป็น CSV สำหรับงานบัญชี"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3.5">วัน-เวลา</th>
              <th className="px-4 py-3.5">ประเภท</th>
              <th className="px-4 py-3.5">สินค้า (SKU)</th>
              <th className="px-4 py-3.5 text-right">จำนวนชิ้น</th>
              <th className="px-4 py-3.5 text-right">มูลค่าต้นทุนจริงรวม</th>
              <th className="px-4 py-3.5">เอกสารอ้างอิง / หมายเหตุ</th>
              <th className="px-4 py-3.5 text-center">แจกแจงล็อต</th>
              <th className="px-4 py-3.5 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                  ไม่พบรายการเคลื่อนไหว
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isStockIn = t.type === "StockIn";
                const isExpanded = expandedId === t.id;

                return (
                  <React.Fragment key={t.id}>
                    <tr className="group transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{formatDateTime(t.createdAt)}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isStockIn
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {isStockIn ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          <span>{isStockIn ? "รับเข้า" : "ตัดออก"}</span>
                        </span>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {t.productName}
                        </div>
                        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                          {t.sku}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {isStockIn ? "+" : "-"}
                        {formatNumber(t.quantity)} ชิ้น
                      </td>

                      {/* Total Cost */}
                      <td
                        className={`px-4 py-3.5 text-right font-bold ${
                          isStockIn
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(t.totalCost)}
                      </td>

                      {/* Reference Note */}
                      <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {t.referenceNote || "-"}
                      </td>

                      {/* Lot Breakdown Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        >
                          <Layers className="h-3 w-3" />
                          <span>{t.details.length} ล็อต</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEditTransaction && (
                            <button
                              onClick={() => onEditTransaction(t)}
                              title="แก้ไขรายการ (จำนวน, ต้นทุน, หรือหมายเหตุ)"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button
                              onClick={() => onDeleteTransaction(t)}
                              title="ลบ/ยกเลิกรายการนี้ (ระบบจะคืนสต็อก/ปรับปรุงล็อตเดิมให้อัตโนมัติ)"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Breakdown Details */}
                    {isExpanded && (
                      <tr className="bg-zinc-50/80 dark:bg-zinc-900/60">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              📋 รายละเอียดการตัด/รับตามล็อตจริง (Batch Breakdown for Accounting):
                            </div>
                            <div className="mt-2 divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
                              {t.details.map((d, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between py-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                      {d.batchNumber}
                                    </span>
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      จำนวน {formatNumber(d.quantityDrawn)} ชิ้น @ ทุนจริง {formatCurrency(d.unitCost)}
                                    </span>
                                  </div>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatCurrency(d.subtotalCost)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
