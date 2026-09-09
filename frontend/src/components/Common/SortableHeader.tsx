"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";

interface SortableHeaderProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSort?: (sortKey: string) => void;
  align?: "left" | "center" | "right";
  isFiltered?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSortKey,
  sortDirection = "asc",
  onSort,
  align = "left",
  isFiltered = false,
  onFilterClick,
  className = "",
}) => {
  const { t } = useTranslation();
  const isSorted = sortKey && currentSortKey === sortKey;

  const alignClasses = {
    left: "justify-start text-left",
    center: "justify-center text-center",
    right: "justify-end text-right",
  }[align];

  return (
    <th className={`px-4 py-3.5 select-none ${className}`}>
      <div className={`flex items-center gap-1.5 ${alignClasses}`}>
        {/* Sort Button / Header title */}
        {sortKey && onSort ? (
          <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={`group inline-flex items-center gap-1.5 transition cursor-pointer ${
              isSorted
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
            title={
              isSorted
                ? sortDirection === "asc"
                  ? t("tableFilter.sortDesc")
                  : t("tableFilter.sortAsc")
                : t("tableFilter.sortAsc")
            }
          >
            <span>{label}</span>
            <span
              className={`rounded-md p-0.5 transition ${
                isSorted
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                  : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
              }`}
            >
              {isSorted ? (
                sortDirection === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              )}
            </span>
          </button>
        ) : (
          <span>{label}</span>
        )}

        {/* Optional Filter Icon Button inside Header */}
        {onFilterClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFilterClick();
            }}
            className={`rounded-md p-1 transition cursor-pointer ${
              isFiltered
                ? "bg-blue-600 text-white shadow-2xs dark:bg-blue-500"
                : "text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            }`}
            title={t("tableFilter.filterTitle")}
          >
            <Filter className="h-3 w-3" />
          </button>
        )}
      </div>
    </th>
  );
};
