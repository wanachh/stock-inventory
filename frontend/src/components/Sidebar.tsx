"use client";

import React from "react";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ScanLine,
  Layers,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "./Common/BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: t("nav.dashboard"),
      sublabel: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "products" as NavTab,
      label: t("nav.products"),
      sublabel: "Products",
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      id: "transactions" as NavTab,
      label: t("nav.transactions"),
      sublabel: "Transactions",
      icon: ArrowRightLeft,
    },
    {
      id: "scanner" as NavTab,
      label: t("nav.scanner"),
      sublabel: "Scanner",
      icon: ScanLine,
    },
  ];

  return (
    <aside className="sticky top-0 z-50 hidden h-screen w-20 sm:w-24 shrink-0 flex-col items-center border-r border-slate-200/80 bg-white/70 py-6 backdrop-blur-md md:flex dark:border-slate-800/80 dark:bg-slate-900/60">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <BrandLogo size="md" />
      </div>

      {/* Nav Dock Items (Positioned directly under the logo) */}
      <nav className="flex flex-col items-center gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group hover:z-50">
              <button
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/35 scale-105"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-5 w-5" />

                {/* Badge indicator */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Tooltip on hover (Floats above all page content) */}
              <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 z-[60] hidden rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap shadow-2xl ring-1 ring-white/10 group-hover:block dark:bg-white dark:text-slate-900 dark:ring-black/10 animate-in fade-in zoom-in-95 duration-150">
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-white" />
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Mode Pill */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <LanguageSwitcher />
        <div
          title={t("shell.realCost")}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>
    </aside>
  );
};
