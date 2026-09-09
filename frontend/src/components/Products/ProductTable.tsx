"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ProductDetail } from "../../types";
import { formatCurrency, formatNumber } from "../../lib/api";
import {
  Search,
  Plus,
  Minus,
  Layers,
  Edit2,
  Barcode,
  Upload,
  Download,
  Filter,
  Tag,
  FolderTree,
  Activity,
  Boxes,
  Coins,
} from "lucide-react";
import { MultiSelectDropdown, MultiSelectOption } from "../Common/MultiSelectDropdown";
import { NumericRangeDropdown } from "../Common/NumericRangeDropdown";
import { ActiveFilterChips, FilterChip } from "../Common/ActiveFilterChips";
import { SortableHeader } from "../Common/SortableHeader";

interface ProductTableProps {
  products: ProductDetail[];
  onOpenStockIn: (product: ProductDetail) => void;
  onOpenStockOut: (product: ProductDetail) => void;
  onViewBatches: (product: ProductDetail) => void;
  onEditProduct: (product: ProductDetail) => void;
  onOpenExcelImport?: () => void;
  onOpenExcelExport?: () => void;
  initialSearch?: string;
  initialStatusFilter?: string;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onOpenStockIn,
  onOpenStockOut,
  onViewBatches,
  onEditProduct,
  onOpenExcelImport,
  onOpenExcelExport,
  initialSearch = "",
  initialStatusFilter = "all",
}) => {
  const { t } = useTranslation();

  // Search
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Multi-select filters
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    if (initialStatusFilter && initialStatusFilter !== "all") {
      return new Set([initialStatusFilter]);
    }
    return new Set();
  });

  // Numeric range filters
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Extract unique brands with counts
  const brandOptions: MultiSelectOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const b = p.brand?.trim() || "";
      counts.set(b, (counts.get(b) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (!a[0]) return 1;
        if (!b[0]) return -1;
        return a[0].localeCompare(b[0], "th");
      })
      .map(([val, count]) => ({
        value: val,
        label: val || t("tableFilter.noBrand"),
        count,
      }));
  }, [products, t]);

  // Extract unique categories with counts
  const categoryOptions: MultiSelectOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const c = p.category?.trim() || "";
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "th"))
      .map(([val, count]) => ({
        value: val,
        label: val || "-",
        count,
      }));
  }, [products]);

  // Status options with counts
  const statusOptions: MultiSelectOption[] = useMemo(() => {
    const counts = { InStock: 0, LowStock: 0, OutOfStock: 0 };
    products.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
    });
    return [
      { value: "InStock", label: t("product.normal"), count: counts.InStock },
      { value: "LowStock", label: t("product.low"), count: counts.LowStock },
      { value: "OutOfStock", label: t("product.out"), count: counts.OutOfStock },
    ];
  }, [products, t]);

  // Combined Filter & Sort logic
  const filteredAndSorted = useMemo(() => {
    // 1. Filter
    const list = products.filter((p) => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const match =
          p.name.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s) ||
          brand.includes(s) ||
          (p.barcode && p.barcode.toLowerCase().includes(s));
        if (!match) return false;
      }

      // Brand multi-select
      if (selectedBrands.size > 0) {
        const b = p.brand?.trim() || "";
        if (!selectedBrands.has(b)) return false;
      }

      // Category multi-select
      if (selectedCategories.size > 0) {
        const c = p.category?.trim() || "";
        if (!selectedCategories.has(c)) return false;
      }

      // Status multi-select
      if (selectedStatuses.size > 0) {
        if (!selectedStatuses.has(p.status)) return false;
      }

      // Quantity range
      if (minQty !== "" && p.totalQuantityRemaining < Number(minQty)) return false;
      if (maxQty !== "" && p.totalQuantityRemaining > Number(maxQty)) return false;

      // Valuation range
      if (minVal !== "" && p.totalValuation < Number(minVal)) return false;
      if (maxVal !== "" && p.totalValuation > Number(maxVal)) return false;

      return true;
    });

    // 2. Sort
    if (!sortKey) return list;

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "sku") {
        cmp = a.sku.localeCompare(b.sku);
      } else if (sortKey === "brand") {
        const bA = a.brand || "";
        const bB = b.brand || "";
        cmp = bA.localeCompare(bB, "th");
      } else if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name, "th");
      } else if (sortKey === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (sortKey === "quantity") {
        cmp = a.totalQuantityRemaining - b.totalQuantityRemaining;
      } else if (sortKey === "valuation") {
        cmp = a.totalValuation - b.totalValuation;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    products,
    searchTerm,
    selectedBrands,
    selectedCategories,
    selectedStatuses,
    minQty,
    maxQty,
    minVal,
    maxVal,
    sortKey,
    sortDirection,
  ]);

  // Build active filter chips
  const activeChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];

    // Brands
    if (selectedBrands.size > 0) {
      const labels = Array.from(selectedBrands)
        .map((b) => b || t("tableFilter.noBrand"))
        .join(", ");
      chips.push({
        id: "brand",
        category: t("tableFilter.brand"),
        label: labels,
        onRemove: () => setSelectedBrands(new Set()),
      });
    }

    // Categories
    if (selectedCategories.size > 0) {
      const labels = Array.from(selectedCategories).join(", ");
      chips.push({
        id: "category",
        category: t("tableFilter.category"),
        label: labels,
        onRemove: () => setSelectedCategories(new Set()),
      });
    }

    // Statuses
    if (selectedStatuses.size > 0) {
      const labels = Array.from(selectedStatuses)
        .map((st) => {
          if (st === "InStock") return t("product.normal");
          if (st === "LowStock") return t("product.low");
          if (st === "OutOfStock") return t("product.out");
          return st;
        })
        .join(", ");
      chips.push({
        id: "status",
        category: t("tableFilter.status"),
        label: labels,
        onRemove: () => setSelectedStatuses(new Set()),
      });
    }

    // Qty Range
    if (minQty || maxQty) {
      const label =
        minQty && maxQty
          ? `${minQty} - ${maxQty} ${t("tableFilter.pieces")}`
          : minQty
          ? `≥ ${minQty} ${t("tableFilter.pieces")}`
          : `≤ ${maxQty} ${t("tableFilter.pieces")}`;
      chips.push({
        id: "qty",
        category: t("tableFilter.quantity"),
        label,
        onRemove: () => {
          setMinQty("");
          setMaxQty("");
        },
      });
    }

    // Valuation Range
    if (minVal || maxVal) {
      const label =
        minVal && maxVal
          ? `${minVal} - ${maxVal} ${t("tableFilter.baht")}`
          : minVal
          ? `≥ ${minVal} ${t("tableFilter.baht")}`
          : `≤ ${maxVal} ${t("tableFilter.baht")}`;
      chips.push({
        id: "val",
        category: t("tableFilter.valuation"),
        label,
        onRemove: () => {
          setMinVal("");
          setMaxVal("");
        },
      });
    }

    return chips;
  }, [
    selectedBrands,
    selectedCategories,
    selectedStatuses,
    minQty,
    maxQty,
    minVal,
    maxVal,
    t,
  ]);

  const handleClearAllFilters = () => {
    setSelectedBrands(new Set());
    setSelectedCategories(new Set());
    setSelectedStatuses(new Set());
    setMinQty("");
    setMaxQty("");
    setMinVal("");
    setMaxVal("");
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Controls Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            data-scanner-input="true"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("product.search")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {t("product.clear")}
            </button>
          )}
        </div>

        {/* Excel Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenExcelImport && (
            <button
              type="button"
              onClick={onOpenExcelImport}
              className="flex items-center gap-1.5 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 dark:hover:border-blue-800/60 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("shell.importExcel")}</span>
            </button>
          )}
          {onOpenExcelExport && (
            <button
              type="button"
              onClick={onOpenExcelExport}
              className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-800/60 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{t("shell.exportExcel")}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dedicated Filter Panel ("Filter ใหญ่") */}
      <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
            <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("tableFilter.filterPanel")}:</span>
          </div>

          {/* Brand Multi-Select */}
          <MultiSelectDropdown
            label={t("tableFilter.brand")}
            icon={<Tag className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
            options={brandOptions}
            selectedValues={selectedBrands}
            onChange={setSelectedBrands}
            searchPlaceholder={t("tableFilter.search")}
          />

          {/* Category Multi-Select */}
          <MultiSelectDropdown
            label={t("tableFilter.category")}
            icon={<FolderTree className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
            options={categoryOptions}
            selectedValues={selectedCategories}
            onChange={setSelectedCategories}
            searchPlaceholder={t("tableFilter.search")}
          />

          {/* Status Multi-Select */}
          <MultiSelectDropdown
            label={t("tableFilter.status")}
            icon={<Activity className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
            options={statusOptions}
            selectedValues={selectedStatuses}
            onChange={setSelectedStatuses}
          />

          {/* Quantity Range */}
          <NumericRangeDropdown
            label={t("tableFilter.quantity")}
            min={minQty}
            max={maxQty}
            unit={t("tableFilter.pieces")}
            icon={<Boxes className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            onChange={(mn, mx) => {
              setMinQty(mn);
              setMaxQty(mx);
            }}
            presets={[
              { label: "0 (" + t("product.out") + ")", min: "0", max: "0" },
              { label: "1 - 10 (" + t("product.low") + ")", min: "1", max: "10" },
              { label: "≥ 10", min: "10", max: "" },
              { label: "≥ 50", min: "50", max: "" },
            ]}
          />

          {/* Valuation Range */}
          <NumericRangeDropdown
            label={t("tableFilter.valuation")}
            min={minVal}
            max={maxVal}
            unit="฿"
            icon={<Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
            onChange={(mn, mx) => {
              setMinVal(mn);
              setMaxVal(mx);
            }}
          />
        </div>

        {/* 3. Active Filters Tag Bar */}
        <ActiveFilterChips
          chips={activeChips}
          totalCount={products.length}
          filteredCount={filteredAndSorted.length}
          onClearAll={handleClearAllFilters}
          className="mt-3"
        />
      </div>

      {/* 4. Desktop Table View with Sortable Headers */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm md:block dark:border-slate-800/80 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <SortableHeader
                label="SKU / Barcode"
                sortKey="sku"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label={t("common.brand")}
                sortKey="brand"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                isFiltered={selectedBrands.size > 0}
              />
              <SortableHeader
                label={t("product.nameCategory")}
                sortKey="name"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                isFiltered={selectedCategories.size > 0}
              />
              <SortableHeader
                label={t("product.status")}
                sortKey="status"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="center"
                isFiltered={selectedStatuses.size > 0}
              />
              <SortableHeader
                label={t("product.quantity")}
                sortKey="quantity"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                isFiltered={Boolean(minQty || maxQty)}
              />
              <SortableHeader
                label={t("product.valuation")}
                sortKey="valuation"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                isFiltered={Boolean(minVal || maxVal)}
              />
              <th className="px-4 py-3.5 text-center">{t("product.quickMovement")}</th>
              <th className="px-4 py-3.5 text-right">{t("product.tools")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    <span>{t("product.notFound")}</span>
                    {activeChips.length > 0 && (
                      <button
                        onClick={handleClearAllFilters}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        {t("tableFilter.clearAll")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((p) => {
                const isLow = p.status === "LowStock";
                const isOut = p.status === "OutOfStock";

                return (
                  <tr
                    key={p.id}
                    className="group transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    {/* SKU & Barcode */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {p.sku}
                      </div>
                      {p.barcode && (
                        <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <Barcode className="h-3 w-3" />
                          <span>{p.barcode}</span>
                        </div>
                      )}
                    </td>

                    {/* Brand */}
                    <td className="px-4 py-3.5 align-top">
                      {p.brand ? (
                        <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-800/40">
                          {p.brand}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>

                    {/* Name & Category */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-800">
                          {p.category}
                        </span>
                        <span>{t("product.threshold", { count: p.minThreshold })}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center align-top">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                          {t("product.out")}
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          {t("product.low")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          {t("product.normal")}
                        </span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {formatNumber(p.totalQuantityRemaining)}
                      </div>
                      <button
                        onClick={() => onViewBatches(p)}
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{t("product.batches", { count: p.activeBatches.length })}</span>
                      </button>
                    </td>

                    {/* Valuation */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.totalValuation)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t("product.realCost")}
                      </div>
                    </td>

                    {/* Quick In / Out */}
                    <td className="px-4 py-3.5 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenStockIn(p)}
                          title={t("product.titleStockIn")}
                          className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t("product.stockIn")}</span>
                        </button>
                        <button
                          onClick={() => onOpenStockOut(p)}
                          disabled={p.totalQuantityRemaining === 0}
                          title={t("product.titleStockOut")}
                          className="flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                          <span>{t("product.stockOut")}</span>
                        </button>
                      </div>
                    </td>

                    {/* Edit & Detail Tools */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditProduct(p)}
                          title={t("product.titleEdit")}
                          className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800/80 dark:bg-slate-900">
            {t("product.noProducts")}
          </div>
        ) : (
          filteredAndSorted.map((p) => {
            const isLow = p.status === "LowStock";
            const isOut = p.status === "OutOfStock";

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {p.sku}
                      </span>
                      {p.brand && (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                          {p.brand}
                        </span>
                      )}
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-800">
                        {p.category}
                      </span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">
                      {p.name}
                    </h4>
                  </div>

                  {isOut ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {t("product.out")}
                    </span>
                  ) : isLow ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {t("product.low")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {t("product.normal")}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-2.5 text-xs dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("product.remaining")}</span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatNumber(p.totalQuantityRemaining)} {t("common.pieces")}
                    </div>
                    <button
                      onClick={() => onViewBatches(p)}
                      className="text-[11px] text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                    >
                      {p.activeBatches.length} {t("common.lots")}
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400">{t("product.value")}</span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.totalValuation)}
                    </div>
                    <span className="text-[10px] text-slate-400">{t("product.totalValuationRound")}</span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onEditProduct(p)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{t("product.edit")}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenStockIn(p)}
                      className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t("product.stockIn")}</span>
                    </button>
                    <button
                      onClick={() => onOpenStockOut(p)}
                      disabled={p.totalQuantityRemaining === 0}
                      className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                      <span>{t("product.stockOut")}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
