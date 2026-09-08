"use client";

import React from "react";
import { LayoutDashboard, Package, ArrowRightLeft, ScanLine } from "lucide-react";

export type NavTab = "dashboard" | "products" | "transactions" | "scanner";

interface SidebarProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  lowStockCount = 0,
}) => {
  const items = [
    {
      id: "dashboard" as NavTab,
      label: "แดชบอร์ดต้นทุน",
      sublabel: "Dashboard & KPIs",
      icon: LayoutDashboard,
    },
    {
      id: "products" as NavTab,
      label: "สินค้าและล็อต",
      sublabel: "Products & Batches",
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} เตือน` : undefined,
    },
    {
      id: "transactions" as NavTab,
      label: "ประวัติ เข้า-ออก",
      sublabel: "Transaction Journal",
      icon: ArrowRightLeft,
    },
    {
      id: "scanner" as NavTab,
      label: "ยิงสแกนด่วน",
      sublabel: "Quick Machine Scan",
      icon: ScanLine,
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-50/70 p-4 md:block dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div
                    className={`text-[11px] ${
                      isActive ? "text-blue-100" : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white text-blue-700"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>Accounting FIFO Mode</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          คำนวณต้นทุนตามราคาทุนจริงรายรอบ (First-In, First-Out)
          ไม่เฉลี่ยราคาเพื่อให้สอดคล้องกับมาตรฐานทางบัญชี
        </p>
      </div>
    </aside>
  );
};
