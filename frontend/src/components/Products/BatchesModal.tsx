"use client";

import React, { useEffect, useState } from "react";
import { InventoryBatch, ProductDetail } from "../../types";
import { api, formatCurrency, formatDate, formatNumber } from "../../lib/api";
import { X, Layers, Calendar, Receipt, CheckCircle2, Clock } from "lucide-react";

interface BatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetail | null;
}

export const BatchesModal: React.FC<BatchesModalProps> = ({ isOpen, onClose, product }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  ทุกล็อตสินค้า (Batch / Lot History)
                </h3>
                <span className="font-mono text-xs text-zinc-500">[{product.sku}]</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {product.name} • จัดการต้นทุนจริงแบบเข้าก่อน-ออกก่อน (FIFO)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 bg-zinc-50/70 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">คงเหลือปัจจุบันทั้งหมด:</span>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {formatNumber(totalRemaining)} ชิ้น
            </div>
          </div>
          <div className="text-right">
            <span className="text-zinc-500 dark:text-zinc-400">มูลค่าคงเหลือจริงรวม:</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalValuation)}
            </div>
          </div>
        </div>

        {/* Batches Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-400">กำลังโหลดข้อมูลล็อต...</div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              ยังไม่มีประวัติการรับเข้าของสินค้านี้
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
                    className={`rounded-xl border p-4 transition ${
                      isActive
                        ? "border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                        : "border-zinc-200/50 bg-zinc-50/70 opacity-60 dark:border-zinc-800/50 dark:bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {b.batchNumber}
                          </span>
                          {isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              ยังมีของในล็อต
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                              ตัดหมดแล้ว (Depleted)
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
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
                          ต้นทุนจริง {formatCurrency(b.unitCost)} / ชิ้น
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          มูลค่าล็อตคงเหลือ {formatCurrency(b.totalBatchValue)}
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          คงเหลือ: <strong className="text-zinc-900 dark:text-zinc-100">{b.quantityRemaining}</strong> / {b.quantityReceived} ชิ้น
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          ตัดไปแล้ว {percentUsed}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          style={{ width: `${100 - percentUsed}%` }}
                          className={`h-full rounded-full transition-all ${
                            isActive ? "bg-emerald-500" : "bg-zinc-400"
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
        <div className="flex items-center justify-end border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
