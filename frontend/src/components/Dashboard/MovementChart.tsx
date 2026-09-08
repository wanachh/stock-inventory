"use client";

import React, { useState } from "react";
import { DailyMovementSummary } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface MovementChartProps {
  data: DailyMovementSummary[];
}

export const MovementChart: React.FC<MovementChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<"quantity" | "cost">("quantity");

  const maxVal = Math.max(
    1,
    ...data.map((d) =>
      metric === "quantity"
        ? Math.max(d.inQuantity, d.outQuantity)
        : Math.max(d.inCost, d.outCost)
    )
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            แนวโน้มการเคลื่อนไหวสต็อก (Stock Flow)
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            เปรียบเทียบการรับเข้า (In) vs ตัดออก (Out) ย้อนหลัง 7 วัน
          </p>
        </div>

        {/* Toggle metric */}
        <div className="flex items-center rounded-xl bg-zinc-100 p-1 text-xs font-medium dark:bg-zinc-800">
          <button
            onClick={() => setMetric("quantity")}
            className={`rounded-lg px-3 py-1 transition ${
              metric === "quantity"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            จำนวนชิ้น (Units)
          </button>
          <button
            onClick={() => setMetric("cost")}
            className={`rounded-lg px-3 py-1 transition ${
              metric === "cost"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            มูลค่าต้นทุน (฿ Cost)
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="font-medium">รับเข้า (In)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-rose-500" />
          <span className="font-medium">ตัดออก (Out)</span>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="mt-6 flex h-48 items-end gap-2 sm:gap-4">
        {data.map((item, idx) => {
          const inVal = metric === "quantity" ? item.inQuantity : item.inCost;
          const outVal = metric === "quantity" ? item.outQuantity : item.outCost;

          const inHeightPercent = Math.min(100, Math.max(4, (inVal / maxVal) * 100));
          const outHeightPercent = Math.min(100, Math.max(4, (outVal / maxVal) * 100));

          return (
            <div key={idx} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-2">
                {/* In bar */}
                <div
                  title={`รับเข้า: ${metric === "quantity" ? formatNumber(inVal) + " ชิ้น" : formatCurrency(inVal)}`}
                  style={{ height: `${inVal > 0 ? inHeightPercent : 2}%` }}
                  className="w-full max-w-[18px] rounded-t-md bg-emerald-500 transition-all hover:bg-emerald-600 sm:max-w-[24px]"
                />
                {/* Out bar */}
                <div
                  title={`ตัดออก: ${metric === "quantity" ? formatNumber(outVal) + " ชิ้น" : formatCurrency(outVal)}`}
                  style={{ height: `${outVal > 0 ? outHeightPercent : 2}%` }}
                  className="w-full max-w-[18px] rounded-t-md bg-rose-500 transition-all hover:bg-rose-600 sm:max-w-[24px]"
                />
              </div>

              {/* Date label */}
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {item.date}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
