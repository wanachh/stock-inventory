"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Filter, X, RotateCcw } from "lucide-react";

export interface FilterChip {
  id: string;
  category: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  totalCount: number;
  filteredCount: number;
  onClearAll: () => void;
  className?: string;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  chips,
  totalCount,
  filteredCount,
  onClearAll,
  className = "",
}) => {
  const { t } = useTranslation();

  if (chips.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-2.5 dark:border-blue-900/40 dark:bg-blue-950/20 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300">
          <Filter className="h-3.5 w-3.5" />
          <span>{t("tableFilter.activeFilters")}</span>
        </div>

        {/* Chips */}
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs dark:border-blue-800/60 dark:bg-slate-800 dark:text-slate-200"
          >
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
              {chip.category}:
            </span>
            <span className="max-w-40 truncate">{chip.label}</span>
            <button
              type="button"
              onClick={chip.onRemove}
              className="ml-0.5 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100 cursor-pointer"
              title={t("common.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Clear All Button */}
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer transition"
        >
          <RotateCcw className="h-3 w-3" />
          <span>{t("tableFilter.clearAll")}</span>
        </button>
      </div>

      {/* Results Count Summary */}
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {t("tableFilter.showingResults", {
          filtered: filteredCount,
          total: totalCount,
        })}{" "}
        <span className="text-blue-600 dark:text-blue-400">
          {t("tableFilter.filterApplied")}
        </span>
      </div>
    </div>
  );
};
