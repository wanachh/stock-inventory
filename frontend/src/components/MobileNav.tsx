"use client";

import React from "react";
import { LayoutDashboard, Package, ArrowRightLeft, ScanLine } from "lucide-react";
import { NavTab } from "./Sidebar";

interface MobileNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  lowStockCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onChangeTab,
  lowStockCount = 0,
}) => {
  const tabs = [
    { id: "dashboard" as NavTab, label: "แดชบอร์ด", icon: LayoutDashboard },
    {
      id: "products" as NavTab,
      label: "สินค้า",
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: "transactions" as NavTab, label: "เข้า-ออก", icon: ArrowRightLeft },
    { id: "scanner" as NavTab, label: "สแกน", icon: ScanLine },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-zinc-200 bg-white/95 px-2 backdrop-blur-sm md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 text-xs font-medium transition ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {tab.badge && (
                <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="mt-1 text-[11px]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
