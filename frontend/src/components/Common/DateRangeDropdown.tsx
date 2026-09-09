"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Calendar, X } from "lucide-react";

export type DatePreset = "all" | "today" | "last7" | "last30" | "thisMonth" | "custom";

interface DateRangeDropdownProps {
  label: string;
  preset: DatePreset;
  fromDate: string;
  toDate: string;
  onChange: (preset: DatePreset, from: string, to: string) => void;
  className?: string;
}

export const DateRangeDropdown: React.FC<DateRangeDropdownProps> = ({
  label,
  preset,
  fromDate,
  toDate,
  onChange,
  className = "",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo, setLocalTo] = useState(toDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFrom(fromDate);
    setLocalTo(toDate);
  }, [fromDate, toDate]);

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

  const isApplied = preset !== "all" || Boolean(fromDate || toDate);

  const getPresetDates = (p: DatePreset) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (p === "today") {
      const d = toYMD(now);
      return { from: d, to: d };
    }
    if (p === "last7") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: toYMD(past), to: toYMD(now) };
    }
    if (p === "last30") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: toYMD(past), to: toYMD(now) };
    }
    if (p === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toYMD(firstDay), to: toYMD(now) };
    }
    return { from: "", to: "" };
  };

  const handleSelectPreset = (p: DatePreset) => {
    if (p === "all") {
      onChange("all", "", "");
      setIsOpen(false);
      return;
    }
    if (p === "custom") {
      return;
    }
    const dates = getPresetDates(p);
    onChange(p, dates.from, dates.to);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    onChange("custom", localFrom, localTo);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("all", "", "");
    setLocalFrom("");
    setLocalTo("");
    setIsOpen(false);
  };

  const getButtonLabel = () => {
    if (preset === "today") return t("tableFilter.today");
    if (preset === "last7") return t("tableFilter.last7Days");
    if (preset === "last30") return t("tableFilter.last30Days");
    if (preset === "thisMonth") return t("tableFilter.thisMonth");
    if (fromDate && toDate) return `${fromDate} ~ ${toDate}`;
    if (fromDate) return `≥ ${fromDate}`;
    if (toDate) return `≤ ${toDate}`;
    return t("tableFilter.all");
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer ${
          isApplied
            ? "border-blue-500/60 bg-blue-50/80 text-blue-700 dark:border-blue-600/60 dark:bg-blue-950/50 dark:text-blue-300 ring-2 ring-blue-500/20"
            : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-750"
        }`}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>

        {isApplied ? (
          <span className="rounded-md bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            {getButtonLabel()}
          </span>
        ) : (
          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
            {t("tableFilter.all")}
          </span>
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xl transition-all dark:border-slate-700/90 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100">
          <div className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            {label}
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { key: "all" as DatePreset, label: t("tableFilter.allTime") },
              { key: "today" as DatePreset, label: t("tableFilter.today") },
              { key: "last7" as DatePreset, label: t("tableFilter.last7Days") },
              { key: "thisMonth" as DatePreset, label: t("tableFilter.thisMonth") },
              { key: "last30" as DatePreset, label: t("tableFilter.last30Days") },
            ].map((p) => {
              const active = preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={`rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs */}
          <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <div className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t("tableFilter.customRange")}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  {t("tableFilter.fromDate")}
                </label>
                <input
                  type="date"
                  value={localFrom}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  {t("tableFilter.toDate")}
                </label>
                <input
                  type="date"
                  value={localTo}
                  onChange={(e) => setLocalTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              >
                {t("tableFilter.clear")}
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!localFrom && !localTo}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:bg-blue-500"
              >
                {t("tableFilter.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
