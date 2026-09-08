"use client";

import React from "react";
import { StockTransaction } from "../../types";
import { formatCurrency, formatDateTime, formatNumber } from "../../lib/api";
import { ArrowDownRight, ArrowUpRight, Clock } from "lucide-react";

interface RecentTransactionsProps {
  transactions: StockTransaction[];
  onViewAll?: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            รายการเคลื่อนไหวล่าสุด
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            ประวัติการรับเข้าและตัดออกพร้อมต้นทุนจริง
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ดูทั้งหมด &rarr;
          </button>
        )}
      </div>

      <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-400">
            ยังไม่มีประวัติการเคลื่อนไหว
          </p>
        ) : (
          transactions.slice(0, 6).map((tx) => {
            const isStockIn = tx.type === "StockIn";
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isStockIn
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {isStockIn ? (
                      <ArrowDownRight className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tx.productName}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isStockIn
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}
                      >
                        {isStockIn ? "+ รับเข้า" : "- ตัดออก"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono">{tx.sku}</span>
                      {tx.referenceNote && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">
                            {tx.referenceNote}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(tx.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
                      isStockIn
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {isStockIn ? "+" : "-"}
                    {formatNumber(tx.quantity)} ชิ้น
                  </div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(tx.totalCost)}
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
