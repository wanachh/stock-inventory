"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  Info,
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
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePostVatAsCost, setUsePostVatAsCost] = useState(false);
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
    setFile(f);
    setError(null);
    setLoading(true);
    try {
      const res = await parseExcelFile(f);
      if (res.items.length === 0) {
        setError("ไม่พบแถวข้อมูลในไฟล์ หรือรูปแบบคอลัมน์ไม่ตรงกับเทมเพลต");
        setParseResult(null);
      } else {
        setParseResult(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows === 0) {
      setError("ไม่มีรายการที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const validItems = parseResult.items.filter((item) => item.isValid);
      const res = await api.importExcel({
        items: validItems,
        usePriceAfterVatAsCost: usePostVatAsCost,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้าสู่ระบบ");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                นำเข้าสต็อกและสินค้าจากไฟล์ Excel (.xlsx / .csv)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                รองรับเทมเพลตคอลัมน์: ลำดับ, SKU, barcode, Brand, จำนวน, ราคาก่อนแวท, แวท, หลังแวท
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadExcelTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ดาวน์โหลดเทมเพลต Excel</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                ลากไฟล์ Excel (.xlsx, .csv) มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                ระบบจะตรวจสอบความถูกต้องของจำนวน (ห้าม 0, ห้ามทศนิยม) และคำนวณภาษี VAT ให้อัตโนมัติ
              </p>
              <div className="mt-4 flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                <span>หากไม่มีคอลัมน์วันที่ ระบบจะใช้วันที่นำเข้าปัจจุบันโดยอัตโนมัติ</span>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-xs text-zinc-500">กำลังประมวลผลไฟล์ Excel...</p>
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">รายการทั้งหมด</div>
                  <div className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {parseResult.totalRows} แถว
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    ✓ ถูกต้อง {parseResult.validRows} | ✗ ผิด {parseResult.invalidRows}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">จำนวนชิ้นรวม</div>
                  <div className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(parseResult.totalUnits)} ชิ้น
                  </div>
                  <div className="text-[10px] text-zinc-400">จำนวนเต็มบวก</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">มูลค่ารวม (ก่อน VAT)</div>
                  <div className="mt-0.5 text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(parseResult.totalValueBeforeVat)}
                  </div>
                  <div className="text-[10px] text-zinc-400">ต้นทุนฐานบัญชี</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">มูลค่ารวม (หลัง VAT)</div>
                  <div className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(parseResult.totalValueAfterVat)}
                  </div>
                  <div className="text-[10px] text-zinc-400">รวม VAT 7% แล้ว</div>
                </div>
              </div>

              {/* Setting Toggle: Use Pre-VAT vs Post-VAT */}
              <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    ราคาที่ใช้บันทึกเป็นต้นทุนสต็อก (Unit Cost):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUsePostVatAsCost(false)}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      !usePostVatAsCost
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    ใช้ราคาก่อนแวท (แนะนำ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePostVatAsCost(true)}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      usePostVatAsCost
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    ใช้ราคาหลังแวท
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-100/75 text-[11px] font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900/75 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2.5">สถานะ</th>
                      <th className="px-3 py-2.5">ลำดับ</th>
                      <th className="px-3 py-2.5">SKU</th>
                      <th className="px-3 py-2.5">Barcode</th>
                      <th className="px-3 py-2.5">Brand</th>
                      <th className="px-3 py-2.5 text-right">จำนวน</th>
                      <th className="px-3 py-2.5 text-right">ราคาก่อนแวท</th>
                      <th className="px-3 py-2.5 text-right">แวท</th>
                      <th className="px-3 py-2.5 text-right">หลังแวท</th>
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
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>ผ่าน</span>
                            </span>
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
                        <td className="px-3 py-2 font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {row.sku}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-500">{row.barcode || "-"}</td>
                        <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">{row.brand}</td>
                        <td className="px-3 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatNumber(row.quantity)}
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
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                เลือกไฟล์ใหม่
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              ยกเลิก
            </button>

            {parseResult && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || parseResult.validRows === 0}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>กำลังนำเข้าสต็อก...</span>
                  </>
                ) : (
                  <>
                    <span>ยืนยันนำเข้า {parseResult.validRows} รายการ</span>
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
