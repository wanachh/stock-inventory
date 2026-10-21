"use client";

import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  MapPin,
  Sparkles,
} from "lucide-react";
import { parseExcelFile, downloadExcelTemplate, ParseExcelResult } from "../../lib/excel";
import { api, formatCurrency, formatNumber } from "../../lib/api";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePostVatAsCost, setUsePostVatAsCost] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("BT");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    processFile(dropped);
  };

  const processFile = async (f: File) => {
    setError(null);
    setLoading(true);
    try {
      const res = await parseExcelFile(f);
      if (res.items.length === 0) {
        setError(t("excel.rowFormatError"));
        setParseResult(null);
      } else {
        setParseResult(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("excel.readingError"));
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows === 0) {
      setError(t("excel.noValidRows"));
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const validItems = parseResult.items.filter((item) => item.isValid);
      await api.importExcel({
        items: validItems,
        usePriceAfterVatAsCost: usePostVatAsCost,
        defaultLocation: selectedLocation,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("excel.saveError"));
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setParseResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {t("shell.importExcel")} (.xlsx / .csv)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("excel.importDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadExcelTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("shell.importExcel")} template</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Upload Dropzone (when no file is loaded) */}
          {!parseResult && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center transition hover:border-blue-500 hover:bg-blue-50/30 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-blue-500/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Download className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {t("excel.dropZoneTitle")}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t("excel.dropZoneHint")}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  <Sparkles className="h-3 w-3" /> Auto SKU หากไม่มีรหัส
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  <MapPin className="h-3 w-3" /> แยกคลัง BT / EB / MT / WS
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  ✓ รองรับรับเข้า / ตัดออก (-1) / สต็อก 0
                </span>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-xs text-zinc-500">{t("common.loading")}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Table & Summary */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{t("excel.statTotalRows")}</div>
                  <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {parseResult.totalRows} {t("common.items")}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    ✓ {t("excel.statValid")} {parseResult.validRows} | ✗ {t("excel.statInvalid")} {parseResult.invalidRows}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">{t("excel.statUnitsIn")} (+รับเข้า)</div>
                  <div className="mt-0.5 text-base font-bold text-emerald-700 dark:text-emerald-300">
                    +{formatNumber(parseResult.totalUnitsIn)} {t("common.pieces")}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t("excel.statPostVat")}: {formatCurrency(parseResult.totalValueAfterVat)}</div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <div className="text-[11px] text-rose-700 dark:text-rose-300">{t("excel.statUnitsOut")} (-ตัดออก)</div>
                  <div className="mt-0.5 text-base font-bold text-rose-700 dark:text-rose-300">
                    -{formatNumber(parseResult.totalUnitsOut)} {t("common.pieces")}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t("excel.fifoAutoStockOut")}</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{t("excel.statMasterCount")}</div>
                  <div className="mt-0.5 text-base font-bold text-zinc-800 dark:text-zinc-200">
                    {parseResult.zeroQtyCount} {t("common.items")}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t("excel.catalogNoMovement")}</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{t("excel.statPreVat")}</div>
                  <div className="mt-0.5 text-base font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(parseResult.totalValueBeforeVat)}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t("excel.baseCost")}</div>
                </div>
              </div>

              {/* Setting Controls: Location Selector + Unit Cost Toggle */}
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/80">
                {/* Location Selection */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t("excel.defaultLocationTitle")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {["BT", "EB", "MT", "WS"].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setSelectedLocation(loc)}
                        className={`rounded-lg px-2.5 py-1 font-bold text-[11px] transition cursor-pointer ${
                          selectedLocation === loc
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VAT Cost Setting */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t("excel.unitCostSetting")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUsePostVatAsCost(false)}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer ${
                        !usePostVatAsCost
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {t("excel.usePreVat")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsePostVatAsCost(true)}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer ${
                        usePostVatAsCost
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {t("excel.usePostVat")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-100/75 text-[11px] font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900/75 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2.5">{t("excel.colStatus")}</th>
                      <th className="px-3 py-2.5">{t("excel.colSeq")}</th>
                      <th className="px-3 py-2.5">{t("excel.colSku")}</th>
                      <th className="px-3 py-2.5">{t("excel.colBarcode")}</th>
                      <th className="px-3 py-2.5">{t("excel.colBrand")}</th>
                      <th className="px-3 py-2.5">{t("excel.colName")}</th>
                      <th className="px-3 py-2.5">{t("excel.colLocation")}</th>
                      <th className="px-3 py-2.5 text-right">{t("excel.colQty")}</th>
                      <th className="px-3 py-2.5 text-right">{t("excel.colPreVat")}</th>
                      <th className="px-3 py-2.5 text-right">{t("excel.colVat")}</th>
                      <th className="px-3 py-2.5 text-right">{t("excel.colPostVat")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {parseResult.items.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isValid
                            ? "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                            : "bg-rose-50/50 dark:bg-rose-950/20"
                        }
                      >
                        {/* Status + Movement Type */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.isValid ? (
                            row.movementType === "StockIn" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>{t("excel.statusStockIn")}</span>
                              </span>
                            ) : row.movementType === "StockOut" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                <span>{t("excel.statusStockOut")}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                <span>{t("excel.statusMasterOnly")}</span>
                              </span>
                            )
                          ) : (
                            <span
                              title={row.error}
                              className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span>{row.error}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2 font-mono text-zinc-500">{row.lineNumber}</td>

                        {/* SKU with Auto Badge */}
                        <td className="px-3 py-2 font-bold font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{row.sku}</span>
                            {row.isAutoSku && (
                              <span className="rounded-sm bg-blue-100 px-1 py-0.2 text-[9px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                {t("excel.autoSkuBadge")}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2 font-mono text-zinc-500">{row.barcode || "-"}</td>

                        {/* Brand */}
                        <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                          {row.brand ? (
                            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              {row.brand}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate" title={row.name || ""}>
                          {row.name || "-"}
                        </td>

                        {/* Location */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="rounded-md bg-purple-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                            {row.location || selectedLocation}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${
                          row.quantity < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : row.quantity === 0
                            ? "text-zinc-400"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}>
                          {row.quantity > 0 ? `+${formatNumber(row.quantity)}` : formatNumber(row.quantity)}
                        </td>

                        <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          ฿{row.priceBeforeVat.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-500">
                          ฿{(row.vat || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ฿{(row.priceAfterVat || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            {parseResult && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                {t("common.clear")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              {t("common.cancel")}
            </button>

            {parseResult && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || parseResult.validRows === 0}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("excel.confirmImport", { count: parseResult.validRows })}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
