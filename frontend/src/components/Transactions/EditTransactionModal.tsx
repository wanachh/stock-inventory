"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StockTransaction, UpdateTransactionRequest } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import { X, Check, AlertCircle, ShieldAlert } from "lucide-react";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StockTransaction | null;
  onSuccess: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [referenceNote, setReferenceNote] = useState("");
  const [dateStr, setDateStr] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setQuantity(transaction.quantity);
      setReferenceNote(transaction.referenceNote || "");
      const firstDetail = transaction.details?.[0];
      setUnitCost(firstDetail ? firstDetail.unitCost : "");
      try {
        const d = new Date(transaction.createdAt);
        setDateStr(d.toISOString().slice(0, 16));
      } catch {
        setDateStr("");
      }
      setError(null);
    }
  }, [transaction, isOpen]);

  // Escape key always closes the modal, even if content overflows the viewport
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const isStockIn = transaction.type === "StockIn";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (quantity === "" || isNaN(qty) || qty <= 0) {
      setError("จำนวนสินค้าต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น (ไม่สามารถใส่ 0 หรือติดลบได้)");
      return;
    }
    if (!Number.isInteger(qty)) {
      setError("จำนวนสินค้าต้องเป็นจำนวนเต็มเท่านั้น ไม่สามารถมีทศนิยมได้");
      return;
    }

    let costNum: number | undefined = undefined;
    if (isStockIn) {
      costNum = Number(unitCost);
      if (unitCost === "" || isNaN(costNum) || costNum < 0) {
        setError("ราคาต้นทุนต่อชิ้นต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
        return;
      }
    }

    setLoading(true);
    try {
      const updateData: UpdateTransactionRequest = {
        quantity: qty,
        unitCost: costNum,
        referenceNote: referenceNote.trim(),
        createdAt: dateStr ? new Date(dateStr).toISOString() : undefined,
      };

      const { api } = await import("../../lib/api");
      await api.updateTransaction(transaction.id, updateData);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("เกิดข้อผิดพลาดในการแก้ไขรายการ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              แก้ไขรายการเคลื่อนไหวสต็อก #{transaction.id}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {transaction.productName} ({transaction.sku}) • {isStockIn ? "รับเข้า" : "ตัดออก"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quantity */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              จำนวนสินค้า (ชิ้น) <span className="text-rose-500">* (จำนวนเต็มเท่านั้น)</span>
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setQuantity(val === "" ? "" : parseFloat(val));
              }}
              required
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Unit Cost for Stock In */}
          {isStockIn && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ราคาต้นทุนจริงต่อชิ้น (฿) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) =>
                  setUnitCost(e.target.value === "" ? "" : parseFloat(e.target.value))
                }
                required
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              วัน-เวลาทำรายการ (แก้ไขย้อนหลังได้)
            </label>
            <input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Reference */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              เลขที่อ้างอิง / หมายเหตุ
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="เช่น บิลขาย #INV-001 หรือ ปรับยอด"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{loading ? t("common.loading") : t("common.save")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
