"use client";

import React from "react";
import { TopValuedProduct } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import { DollarSign, Tag } from "lucide-react";

interface TopProductsCardProps {
  products: TopValuedProduct[];
  onSelectProduct?: (sku: string) => void;
}

export const TopProductsCard: React.FC<TopProductsCardProps> = ({
  products,
  onSelectProduct,
}) => {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            สินค้ามูลค่าคงเหลือสูงสุด
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            จัดอันดับตามมูลค่าต้นทุนจริงค้างสต็อก
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <DollarSign className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60">
        {products.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">ยังไม่มีข้อมูลสินค้า</p>
        ) : (
          products.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => onSelectProduct?.(p.sku)}
              className="group flex cursor-pointer items-center justify-between py-3 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 rounded-2xl px-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                    {p.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{p.sku}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {p.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(p.totalValuation)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  คงเหลือ {formatNumber(p.quantityRemaining)} ชิ้น
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
