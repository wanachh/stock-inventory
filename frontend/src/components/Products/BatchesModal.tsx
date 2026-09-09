"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { InventoryBatch, ProductDetail } from "../../types";
import { api, formatCurrency, formatDate, formatNumber } from "../../lib/api";
import { X, Layers, Calendar, Receipt, CheckCircle2, Clock } from "lucide-react";

interface BatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetail | null;
}

export const BatchesModal: React.FC<BatchesModalProps> = ({ isOpen, onClose, product }) => {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      api
        .getProductBatches(product.id)
        .then((res) => setBatches(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const totalRemaining = batches
    .filter((b) => b.status === "Active")
    .reduce((acc, b) => acc + b.quantityRemaining, 0);

  const totalValuation = batches
    .filter((b) => b.status === "Active")
    .reduce((acc, b) => acc + b.totalBatchValue, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800/80 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                  {t("product.batchesModalTitle")}
                </h3>
                <span className="font-mono text-xs text-slate-500">[{product.sku}]</span>
                {product.brand && (
                  <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    {product.brand}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("product.batchesModalDesc", { name: product.name })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <span className="text-slate-500 dark:text-slate-400">{t("product.remaining")}</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatNumber(totalRemaining)} {t("common.pieces")}
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">{t("product.valuation")}</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalValuation)}
            </div>
          </div>
        </div>

        {/* Batches Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">{t("common.loading")}</div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t("transaction.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => {
                const isActive = b.status === "Active" && b.quantityRemaining > 0;
                const percentUsed = Math.round(
                  ((b.quantityReceived - b.quantityRemaining) / b.quantityReceived) * 100
                );

                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl border p-4 transition ${
                      isActive
                        ? "border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-850"
                        : "border-slate-200/50 bg-slate-50/70 opacity-60 dark:border-slate-800/50 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {b.batchNumber}
                          </span>
                          {isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {t("product.normal")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {t("product.out")}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(b.receivedDate)}
                          </span>
                          {b.reference && (
                            <span className="flex items-center gap-1">
                              <Receipt className="h-3.5 w-3.5" />
                              {b.reference}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {t("product.batchUnitCost", { cost: formatCurrency(b.unitCost) })}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t("product.batchValuation", { cost: formatCurrency(b.totalBatchValue) })}
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {t("product.batchRemaining", { rem: b.quantityRemaining, rec: b.quantityReceived })}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t("product.batchUsed", { percent: percentUsed })}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          style={{ width: `${100 - percentUsed}%` }}
                          className={`h-full rounded-full transition-all ${
                            isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};
