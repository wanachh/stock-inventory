"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: MultiSelectOption[];
  selectedValues: Set<string>;
  onChange: (selected: Set<string>) => void;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  searchPlaceholder,
  emptyLabel,
  className = "",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter options based on inner search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const toggleOption = (val: string) => {
    const next = new Set(selectedValues);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    filteredOptions.forEach((opt) => next.add(opt.value));
    onChange(next);
  };

  const handleClear = () => {
    onChange(new Set());
  };

  const isSelected = selectedValues.size > 0;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer ${
          isSelected
            ? "border-blue-500/60 bg-blue-50/80 text-blue-700 dark:border-blue-600/60 dark:bg-blue-950/50 dark:text-blue-300 ring-2 ring-blue-500/20"
            : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-750"
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>

        {isSelected ? (
          <span className="flex items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white shadow-2xs dark:bg-blue-500">
            {selectedValues.size}
          </span>
        ) : (
          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
            {t("tableFilter.all")}
          </span>
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 dark:text-slate-400 ${
            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xl transition-all dark:border-slate-700/90 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100">
          {/* Search box if 4 or more options */}
          {options.length >= 4 && (
            <div className="relative mb-2">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder || t("tableFilter.search")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pr-7 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-850"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Quick Actions (Select All / Clear) */}
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5 px-1 text-[11px] dark:border-slate-800">
            <button
              type="button"
              onClick={handleSelectAll}
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
            >
              {t("tableFilter.selectAll")}
            </button>
            {isSelected && (
              <button
                type="button"
                onClick={handleClear}
                className="font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer"
              >
                {t("tableFilter.clear")}
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                {emptyLabel || t("tableFilter.noMatches")}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedValues.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 cursor-pointer transition select-none ${
                      checked
                        ? "bg-blue-50/70 text-blue-900 font-semibold dark:bg-blue-950/40 dark:text-blue-200"
                        : "text-slate-700 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                          checked
                            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer with Apply button */}
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
            >
              {t("tableFilter.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
