"use client";

import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {t("transaction.date")} ({t("transaction.recent")})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("dashboard.descriptionDateTime")}
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
          >
            {t("common.showAll")} &rarr;
          </button>
        )}
      </div>

      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60">
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            {t("transaction.empty")}
          </p>
        ) : (
          transactions.slice(0, 6).map((tx) => {
            const isStockIn = tx.type === "StockIn";
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-2 rounded-2xl transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
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
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tx.productName}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isStockIn
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}
                      >
                        {isStockIn ? `+ ${t("transaction.in")}` : `- ${t("transaction.out")}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                    {formatNumber(tx.quantity)} {t("common.pieces")}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
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
