"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StockTransaction } from "../../types";
import { formatCurrency, formatDateTime, formatNumber } from "../../lib/api";
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Edit2,
  Trash2,
} from "lucide-react";

interface TransactionJournalProps {
  transactions: StockTransaction[];
  onRefresh?: () => void;
  onEditTransaction?: (transaction: StockTransaction) => void;
  onDeleteTransaction?: (transaction: StockTransaction) => void;
  onOpenExcelImport?: () => void;
  onOpenExcelExport?: () => void;
}

export const TransactionJournal: React.FC<TransactionJournalProps> = ({
  transactions,
  onRefresh,
  onEditTransaction,
  onDeleteTransaction,
  onOpenExcelImport,
  onOpenExcelExport,
}) => {
  const { t: translate } = useTranslation();
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

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={translate("transaction.search")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {translate("common.clear")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Type tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-medium dark:bg-slate-800">
            <button
              onClick={() => setTypeFilter("all")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer ${
                typeFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {translate("transaction.all", { count: transactions.length })}
            </button>
            <button
              onClick={() => setTypeFilter("StockIn")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer ${
                typeFilter === "StockIn"
                  ? "bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {translate("transaction.in")}
            </button>
            <button
              onClick={() => setTypeFilter("StockOut")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer ${
                typeFilter === "StockOut"
                  ? "bg-rose-50 text-rose-700 shadow-xs dark:bg-rose-950 dark:text-rose-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {translate("transaction.out")}
            </button>
          </div>

          {/* Import Excel */}
          {onOpenExcelImport && (
            <button
              onClick={onOpenExcelImport}
              className="flex items-center gap-1.5 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 dark:hover:border-blue-800/60 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{translate("shell.importExcel")}</span>
            </button>
          )}

          {/* Export Excel */}
          {onOpenExcelExport && (
            <button
              onClick={onOpenExcelExport}
              title={translate("transaction.excelTitle")}
              className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-800/60 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{translate("shell.exportExcel")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3.5">{translate("transaction.date")}</th>
              <th className="px-4 py-3.5">{translate("transaction.type")}</th>
              <th className="px-4 py-3.5">{translate("transaction.product")}</th>
              <th className="px-4 py-3.5 text-right">{translate("transaction.quantity")}</th>
              <th className="px-4 py-3.5 text-right">{translate("transaction.cost")}</th>
              <th className="px-4 py-3.5">{translate("transaction.reference")}</th>
              <th className="px-4 py-3.5 text-center">{translate("transaction.breakdown")}</th>
              <th className="px-4 py-3.5 text-right">{translate("transaction.manage")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {translate("transaction.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isStockIn = t.type === "StockIn";
                const isExpanded = expandedId === t.id;

                return (
                  <React.Fragment key={t.id}>
                    <tr className="group transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
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
                          <span>{isStockIn ? translate("transaction.in") : translate("transaction.out")}</span>
                        </span>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {t.productName}
                        </div>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {t.sku}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {isStockIn ? "+" : "-"}
                        {formatNumber(t.quantity)} {translate("common.pieces")}
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
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        {t.referenceNote || "-"}
                      </td>

                      {/* Lot Breakdown Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                        >
                          <Layers className="h-3 w-3" />
                          <span>{t.details.length} {translate("common.lots")}</span>
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
                              title={translate("transaction.editTitle")}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button
                              onClick={() => onDeleteTransaction(t)}
                              title={translate("transaction.deleteTitle")}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Breakdown Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-750 dark:bg-slate-850">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {translate("transaction.batchBreakdownTitle")}
                            </div>
                            <div className="mt-2 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                              {t.details.map((d, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between py-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                      {d.batchNumber}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {translate("transaction.batchDrawnDetail", { qty: formatNumber(d.quantityDrawn), cost: formatCurrency(d.unitCost) })}
                                    </span>
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
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
