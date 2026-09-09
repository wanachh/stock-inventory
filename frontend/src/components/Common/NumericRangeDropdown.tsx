"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

interface NumericRangeDropdownProps {
  label: string;
  min: string;
  max: string;
  unit?: string;
  onChange: (min: string, max: string) => void;
  icon?: React.ReactNode;
  presets?: { label: string; min: string; max: string }[];
  className?: string;
}

export const NumericRangeDropdown: React.FC<NumericRangeDropdownProps> = ({
  label,
  min,
  max,
  unit,
  onChange,
  icon,
  presets,
  className = "",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMin(min);
    setLocalMax(max);
  }, [min, max]);

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

  const isApplied = Boolean(min || max);

  const handleApply = () => {
    onChange(localMin, localMax);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalMin("");
    setLocalMax("");
    onChange("", "");
    setIsOpen(false);
  };

  const handleSelectPreset = (pMin: string, pMax: string) => {
    setLocalMin(pMin);
    setLocalMax(pMax);
    onChange(pMin, pMax);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer ${
          isApplied
            ? "border-blue-500/60 bg-blue-50/80 text-blue-700 hover:bg-blue-100 dark:border-blue-600/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 ring-2 ring-blue-500/20"
            : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
        }`}
      >
        {icon || <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />}
        <span>{label}</span>

        {isApplied ? (
          <span className="rounded-md bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            {min && max ? `${min} - ${max}` : min ? `≥ ${min}` : `≤ ${max}`} {unit}
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
            {label} {unit && `(${unit})`}
          </div>

          {/* Preset Buttons if any */}
          {presets && presets.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const isActive = localMin === p.min && localMax === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleSelectPreset(p.min, p.max)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Min and Max inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t("tableFilter.min")}
              </label>
              <input
                type="number"
                min="0"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t("tableFilter.max")}
              </label>
              <input
                type="number"
                min="0"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                placeholder="9999..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:bg-slate-800"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-slate-400 hover:text-rose-600 hover:underline dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
            >
              {t("tableFilter.clear")}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer"
            >
              {t("tableFilter.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
