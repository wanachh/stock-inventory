"use client";

import React from "react";
import {
  Plus,
  ScanLine,
  ArrowDownUp,
  Lock,
  Upload,
  Download,
  Sun,
  Moon,
} from "lucide-react";
import { VisitorBadge } from "./Dashboard/VisitorBadge";
import { useTheme } from "./Theme/ThemeContext";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  onOpenNewProduct: () => void;
  onOpenQuickMovement: () => void;
  onOpenExcelImport?: () => void;
  onOpenExcelExport?: () => void;
  scannerActive?: boolean;
  onLock?: () => void;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewProduct,
  onOpenQuickMovement,
  onOpenExcelImport,
  onOpenExcelExport,
  scannerActive = true,
  onLock,
  userName = "StockPulse Team",
}) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex flex-col justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur-md sm:flex-row sm:items-center dark:border-slate-800/80 dark:bg-slate-900/85">
      {/* Left Greeting (Matching the reference design) */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {t("shell.greeting")}, <span className="text-blue-600 dark:text-blue-400">{userName}</span>
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t("shell.overview")}
        </p>
      </div>

      {/* Right Controls & Actions */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Live Visitor Badge */}
        <div className="hidden xl:block">
          <VisitorBadge compact={true} />
        </div>

        {/* Scanner Gun Active Indicator */}
        {/* <div
          title={t("shell.scannerReady")}
          className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <ScanLine className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{t("shell.scannerReadyShort")}</span>
        </div> */}

        {/* Excel Import Button */}
        {onOpenExcelImport && (
          <button
            onClick={onOpenExcelImport}
            className="flex items-center gap-1.5 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t("shell.importExcel")}</span>
          </button>
        )}

        {/* Excel Export Button */}
        {onOpenExcelExport && (
          <button
            onClick={onOpenExcelExport}
            className="flex items-center gap-1.5 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t("shell.exportExcel")}</span>
          </button>
        )}

        {/* Quick Stock Movement Button */}
        <button
          onClick={onOpenQuickMovement}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
        >
          <ArrowDownUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t("shell.movement")}</span>
        </button>

        {/* New Product Button */}
        <button
          onClick={onOpenNewProduct}
          className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("shell.newProduct")}</span>
          <span className="sm:hidden">{t("shell.newProductShort")}</span>
        </button>

        {/* Theme Toggle Button (Light / Dark) */}
        <button
          onClick={toggleTheme}
          title={theme === "light" ? t("common.darkMode") : t("common.lightMode")}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-slate-600" />
          ) : (
            <Sun className="h-4 w-4 text-amber-400" />
          )}
        </button>

        {/* User Profile Avatar Pill */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white py-1 pr-2.5 pl-1 shadow-2xs dark:border-slate-800 dark:bg-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-xs">
            ST
          </div>
          <span className="hidden sm:inline text-xs font-bold text-slate-700 dark:text-slate-200">
            {t("shell.admin")}
          </span>
        </div>

        {/* Lock Screen Button */}
        {onLock && (
          <button
            onClick={onLock}
            title={t("shell.lock")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};
