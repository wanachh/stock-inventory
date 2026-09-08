"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductDetail } from "../../types";
import { api, formatCurrency, formatNumber } from "../../lib/api";
import { ScanLine, Search, Plus, Minus, Layers, CheckCircle2, AlertCircle } from "lucide-react";

interface QuickScanViewProps {
  onOpenStockIn: (product: ProductDetail) => void;
  onOpenStockOut: (product: ProductDetail) => void;
  onViewBatches: (product: ProductDetail) => void;
}

export const QuickScanView: React.FC<QuickScanViewProps> = ({
  onOpenStockIn,
  onOpenStockOut,
  onViewBatches,
}) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const p = await api.lookupProduct(code.trim());
      setProduct(p);
      setCode("");
    } catch (err: unknown) {
      setProduct(null);
      if (err instanceof Error) setError(err.message);
      else setError(t("scanner.notFound", { code: code.trim() }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Scanner Prompt Box */}
      <div className="rounded-3xl border-2 border-dashed border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-8 text-center shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:to-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
          <ScanLine className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-50">
          {t("scanner.title")}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("scanner.description")}
        </p>

        <form onSubmit={handleLookup} className="mx-auto mt-6 flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              data-scanner-input="true"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("scanner.placeholder")}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-10 font-mono text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? t("common.loading") : t("scanner.search")}
          </button>
        </form>

        {error && (
          <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Scanned Result Card */}
      {product && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {product.sku}
                </span>
                {product.barcode && (
                  <span className="font-mono text-xs text-slate-500">
                    [{product.barcode}]
                  </span>
                )}
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                  {product.category}
                </span>
              </div>
              <h3 className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-50">
                {product.name}
              </h3>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                product.status === "OutOfStock"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : product.status === "LowStock"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {product.status === "OutOfStock"
                ? t("scanner.out")
                : product.status === "LowStock"
                ? t("scanner.low")
                : t("scanner.inStock")}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-xs dark:bg-slate-800/50">
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t("scanner.remaining")}</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {formatNumber(product.totalQuantityRemaining)} {t("common.pieces")}
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400">{t("scanner.valuation")}</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(product.totalValuation)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => onViewBatches(product)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>{t("scanner.viewBatches", { count: product.activeBatches.length })}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenStockIn(product)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{t("scanner.stockIn")}</span>
              </button>
              <button
                onClick={() => onOpenStockOut(product)}
                disabled={product.totalQuantityRemaining === 0}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
                <span>{t("scanner.stockOut")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
