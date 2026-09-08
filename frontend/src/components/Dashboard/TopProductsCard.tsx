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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            สินค้ามูลค่าคงเหลือสูงสุด
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            จัดอันดับตามมูลค่าต้นทุนจริงค้างสต็อก
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <DollarSign className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {products.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-400">ยังไม่มีข้อมูลสินค้า</p>
        ) : (
          products.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => onSelectProduct?.(p.sku)}
              className="group flex cursor-pointer items-center justify-between py-3 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                    {p.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
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
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(p.totalValuation)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
