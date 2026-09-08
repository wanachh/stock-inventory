"use client";

import React, { useState, useEffect, useRef } from "react";
import { ProductDetail, StockOutPreviewResponse } from "../../types";
import { api, formatCurrency, formatNumber } from "../../lib/api";
import {
  X,
  Plus,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Layers,
  Receipt,
} from "lucide-react";

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDetail[];
  initialProduct?: ProductDetail | null;
  initialType?: "StockIn" | "StockOut";
  onSuccess: () => void;
}

export const MovementModal: React.FC<MovementModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProduct = null,
  initialType = "StockIn",
  onSuccess,
}) => {
  const [type, setType] = useState<"StockIn" | "StockOut">(initialType);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [scannerCode, setScannerCode] = useState("");

  const [quantity, setQuantity] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [reference, setReference] = useState("");

  // FIFO Preview state for Stock Out
  const [preview, setPreview] = useState<StockOutPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setType(initialType);
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
    }
    setQuantity("");
    setUnitCost("");
    setReference("");
    setPreview(null);
    setPreviewError(null);
    setError(null);
  }, [isOpen, initialProduct, initialType, products]);

  const currentProduct = products.find((p) => p.id === Number(selectedProductId));

  // Live FIFO Preview effect when stocking out
  useEffect(() => {
    if (type !== "StockOut" || !currentProduct || !quantity || Number(quantity) <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);

      api
        .previewStockOut({
          productId: currentProduct.id,
          quantity: Number(quantity),
        })
        .then((res) => {
          setPreview(res);
          setPreviewError(null);
        })
        .catch((err) => {
          setPreview(null);
          setPreviewError(err.message || "ไม่สามารถคำนวณต้นทุน FIFO ได้");
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    }, 250);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [type, selectedProductId, quantity, currentProduct]);

  if (!isOpen) return null;

  // Handle machine scanner input or lookup
  const handleScannerSearch = async () => {
    if (!scannerCode.trim()) return;
    try {
      const found = await api.lookupProduct(scannerCode.trim());
      setSelectedProductId(found.id);
      setScannerCode("");
      setError(null);
    } catch {
      setError(`ไม่พบสินค้าสำหรับรหัส: ${scannerCode.trim()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) {
      setError("กรุณาเลือกสินค้า");
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("กรุณาระบุจำนวนที่มากกว่า 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (type === "StockIn") {
        const cost = Number(unitCost);
        if (cost < 0 || isNaN(cost)) {
          setError("กรุณาระบุราคาต้นทุนจริงของรอบนี้");
          setLoading(false);
          return;
        }

        await api.stockIn({
          productId: currentProduct.id,
          quantity: qty,
          unitCost: cost,
          reference: reference.trim() || undefined,
        });
      } else {
        await api.stockOut({
          productId: currentProduct.id,
          quantity: qty,
          referenceNote: reference.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              บันทึกการเคลื่อนไหวสต็อก (Stock Movement)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              รองรับทั้งการพิมพ์รหัส หรือใช้ปืนยิงบาร์โค้ดสแกน
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Toggle: Stock In vs Stock Out */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1.5 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={() => setType("StockIn")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              type === "StockIn"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>รับสินค้าเข้า (Stock In)</span>
          </button>
          <button
            type="button"
            onClick={() => setType("StockOut")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              type === "StockOut"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Minus className="h-4 w-4" />
            <span>ตัดสินค้าออก (Stock Out)</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick Scanner Barcode/SKU input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                data-scanner-input="true"
                value={scannerCode}
                onChange={(e) => setScannerCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScannerSearch();
                  }
                }}
                placeholder="ยิงบาร์โค้ด หรือพิมพ์ SKU แล้วกด Enter..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pr-3 pl-9 font-mono text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <button
              type="button"
              onClick={handleScannerSearch}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              ค้นหา
            </button>
          </div>

          {/* Product Select */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              เลือกสินค้าเป้าหมาย <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} (คงเหลือ {p.totalQuantityRemaining} ชิ้น)
                </option>
              ))}
            </select>
            {currentProduct && (
              <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>สต็อกปัจจุบัน: <strong className="text-zinc-900 dark:text-zinc-100">{currentProduct.totalQuantityRemaining} ชิ้น</strong></span>
                <span>มูลค่าสต็อกปัจจุบัน: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(currentProduct.totalValuation)}</strong></span>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {type === "StockIn" ? "จำนวนที่รับเข้า (ชิ้น)" : "จำนวนที่ต้องการตัดออก (ชิ้น)"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === "" ? "" : parseInt(e.target.value))}
              placeholder="เช่น 10"
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base font-bold text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* If Stock In: Unit Cost of this new lot */}
          {type === "StockIn" && (
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                ราคาต้นทุนจริงของรอบนี้ต่อชิ้น (฿) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) =>
                  setUnitCost(e.target.value === "" ? "" : parseFloat(e.target.value))
                }
                placeholder="เช่น 5.00 หรือ 10.00"
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base font-bold text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {quantity !== "" && unitCost !== "" && (
                <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  รวมมูลค่าเงินซื้อเข้ารอบนี้:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(quantity) * Number(unitCost))}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* If Stock Out: LIVE FIFO PREVIEW BOX */}
          {type === "StockOut" && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>การจัดสรรต้นทุนจริงตามล็อต (FIFO Cost Breakdown)</span>
                </div>
                {previewLoading && (
                  <span className="text-[11px] text-zinc-400">กำลังคำนวณ...</span>
                )}
              </div>

              {previewError ? (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                  ⚠️ {previewError}
                </p>
              ) : preview ? (
                <div className="mt-3 space-y-2">
                  <div className="divide-y divide-zinc-200/60 rounded-lg border border-zinc-200 bg-white text-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                    {preview.allocatedBatches.map((item) => (
                      <div key={item.batchId} className="flex items-center justify-between p-2.5">
                        <div>
                          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {item.batchNumber}
                          </span>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            ตัดจำนวน {item.quantityToDraw} ชิ้น @ ทุนจริง {formatCurrency(item.unitCost)}
                          </div>
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(item.subtotalCost)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/80 pt-2 text-xs dark:border-zinc-800">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      ต้นทุนสินค้าที่ตัดออกรวม (Cost Out):
                    </span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(preview.totalCostOut)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  กรอกจำนวนที่ต้องการตัดออก เพื่อดูว่าระบบจะดึงจากล็อตไหนบ้างที่ราคาทุนจริงเท่าไหร่
                </p>
              )}
            </div>
          )}

          {/* Reference / Remark Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              เลขที่อ้างอิง / หมายเหตุ (เช่น เลขที่ PO, บิลขาย, หรือวัตถุประสงค์การเบิก)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={type === "StockIn" ? "เช่น PO-2026-003" : "เช่น ใบเสร็จ #INV-109 หรือ เบิกใช้งาน"}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || (type === "StockOut" && !!previewError)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50 ${
                type === "StockIn"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {loading
                  ? "กำลังบันทึก..."
                  : type === "StockIn"
                  ? "ยืนยันรับเข้าสต็อก"
                  : "ยืนยันตัดสต็อกออก"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
