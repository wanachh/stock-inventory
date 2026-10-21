"use client";

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ProductDetail } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import { MapPin, Layers, Check } from "lucide-react";

interface WarehouseLocationsCardProps {
  products: ProductDetail[];
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
}

const WAREHOUSE_KEYS = [
  { code: "BT", nameKey: "location.bt", descKey: "location.btDesc" },
  { code: "EB", nameKey: "location.eb", descKey: "location.ebDesc" },
  { code: "MT", nameKey: "location.mt", descKey: "location.mtDesc" },
  { code: "WS", nameKey: "location.ws", descKey: "location.wsDesc" },
];

export const WarehouseLocationsCard: React.FC<WarehouseLocationsCardProps> = ({
  products,
  selectedLocation,
  onSelectLocation,
}) => {
  const { t } = useTranslation();

  // Compute per-location stats
  const stats = useMemo(() => {
    let grandTotalItems = 0;
    let grandTotalValuation = 0;

    const map = new Map<
      string,
      { items: number; valuation: number; productSet: Set<number>; batches: number }
    >();
    WAREHOUSE_KEYS.forEach((w) => {
      map.set(w.code, { items: 0, valuation: 0, productSet: new Set<number>(), batches: 0 });
    });

    products.forEach((p) => {
      p.activeBatches?.forEach((b) => {
        if (b.status === "Active" && b.quantityRemaining > 0) {
          const loc = (b.location || "BT").toUpperCase();
          const cur = map.get(loc) || {
            items: 0,
            valuation: 0,
            productSet: new Set<number>(),
            batches: 0,
          };
          cur.items += b.quantityRemaining;
          cur.valuation += b.quantityRemaining * b.unitCost;
          cur.batches += 1;
          cur.productSet.add(p.id);
          map.set(loc, cur);

          grandTotalItems += b.quantityRemaining;
          grandTotalValuation += b.quantityRemaining * b.unitCost;
        }
      });
    });

    return {
      locations: WAREHOUSE_KEYS.map((w) => {
        const data = map.get(w.code) || {
          items: 0,
          valuation: 0,
          productSet: new Set<number>(),
          batches: 0,
        };
        const share = grandTotalItems > 0 ? (data.items / grandTotalItems) * 100 : 0;
        return {
          ...w,
          name: t(w.nameKey),
          desc: t(w.descKey),
          items: data.items,
          valuation: data.valuation,
          productCount: data.productSet.size,
          batchCount: data.batches,
          share,
        };
      }),
      grandTotalItems,
      grandTotalValuation,
    };
  }, [products, t]);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <MapPin className="h-4 w-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t("location.warehouseLocationsTitle")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("location.warehouseLocationsSubtitle")}
          </p>
        </div>

        {/* Reset / All filter pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectLocation("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              selectedLocation === "ALL"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {selectedLocation === "ALL" && <Check className="inline-block h-3.5 w-3.5 mr-1" />}
            {t("location.allLocations")}
          </button>
        </div>
      </div>

      {/* Grid of 4 Warehouses */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.locations.map((loc) => {
          const isSelected = selectedLocation === loc.code;
          return (
            <div
              key={loc.code}
              onClick={() => onSelectLocation(isSelected ? "ALL" : loc.code)}
              className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-purple-500 bg-purple-50/80 shadow-md ring-2 ring-purple-500/20 dark:border-purple-500/80 dark:bg-purple-950/40"
                  : "border-slate-200/80 bg-slate-50/70 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-purple-800/80 dark:hover:bg-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-xs font-black text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {loc.code}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {loc.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {loc.desc}
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {t("location.viewingThis")}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      {Math.round(loc.share)}%
                    </span>
                  )}
                </div>

                {/* Main Stock Numbers */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {formatNumber(loc.items)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {t("common.pieces")}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(loc.valuation)}
                  </div>
                </div>
              </div>

              {/* Progress Bar & Sub details */}
              <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-700/60">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, loc.share))}%` }}
                    className="h-full rounded-full bg-purple-600 transition-all duration-300"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    {loc.productCount} {t("common.products")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {loc.batchCount} {t("common.lots")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
