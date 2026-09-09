"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StockTransaction, ProductDetail } from "../../types";
import { formatCurrency, formatDateTime, formatNumber } from "../../lib/api";
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Filter,
  Tag,
  Package,
  Activity,
  Boxes,
  Coins,
} from "lucide-react";
import { MultiSelectDropdown, MultiSelectOption } from "../Common/MultiSelectDropdown";
import { DateRangeDropdown, DatePreset } from "../Common/DateRangeDropdown";
import { NumericRangeDropdown } from "../Common/NumericRangeDropdown";
import { ActiveFilterChips, FilterChip } from "../Common/ActiveFilterChips";
import { SortableHeader } from "../Common/SortableHeader";

interface TransactionJournalProps {
  transactions: StockTransaction[];
  products?: ProductDetail[];
  onRefresh?: () => void;
  onEditTransaction?: (transaction: StockTransaction) => void;
  onDeleteTransaction?: (transaction: StockTransaction) => void;
  onOpenExcelImport?: () => void;
  onOpenExcelExport?: () => void;
}

export const TransactionJournal: React.FC<TransactionJournalProps> = ({
  transactions,
  products,
  onRefresh,
  onEditTransaction,
  onDeleteTransaction,
  onOpenExcelImport,
  onOpenExcelExport,
}) => {
  const { t: translate } = useTranslation();

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Multi-select filters
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Date range filter
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Numeric range filters
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<string | null>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Expand row state
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  // Build brand lookup from products for transactions that don't have explicit brand
  const brandMap = useMemo(() => {
    const map = new Map<number, string>();
    if (products) {
      products.forEach((p) => {
        if (p.brand) map.set(p.id, p.brand);
      });
    }
    return map;
  }, [products]);

  // Options for Type
  const typeOptions: MultiSelectOption[] = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    transactions.forEach((t) => {
      if (t.type === "StockIn") inCount++;
      if (t.type === "StockOut") outCount++;
    });
    return [
      { value: "StockIn", label: translate("transaction.in"), count: inCount },
      { value: "StockOut", label: translate("transaction.out"), count: outCount },
    ];
  }, [transactions, translate]);

  // Options for Brand
  const brandOptions: MultiSelectOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((t) => {
      const b = (t.brand || brandMap.get(t.productId) || "").trim();
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
        label: val || translate("tableFilter.noBrand"),
        count,
      }));
  }, [transactions, brandMap, translate]);

  // Options for Products
  const productOptions: MultiSelectOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((t) => {
      const name = t.productName.trim();
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "th"))
      .map(([name, count]) => ({
        value: name,
        label: name,
        count,
      }));
  }, [transactions]);

  // Combined Filter & Sort logic
  const filteredAndSorted = useMemo(() => {
    // 1. Filter
    const list = transactions.filter((t) => {
      const brand = (t.brand || brandMap.get(t.productId) || "").trim();

      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          t.productName.toLowerCase().includes(s) ||
          t.sku.toLowerCase().includes(s) ||
          brand.toLowerCase().includes(s) ||
          (t.referenceNote && t.referenceNote.toLowerCase().includes(s));
        if (!match) return false;
      }

      // Type multi-select
      if (selectedTypes.size > 0 && !selectedTypes.has(t.type)) {
        return false;
      }

      // Brand multi-select
      if (selectedBrands.size > 0 && !selectedBrands.has(brand)) {
        return false;
      }

      // Product multi-select
      if (selectedProducts.size > 0 && !selectedProducts.has(t.productName.trim())) {
        return false;
      }

      // Date range filter
      if (fromDate || toDate) {
        const txDate = t.createdAt ? t.createdAt.substring(0, 10) : "";
        if (fromDate && txDate < fromDate) return false;
        if (toDate && txDate > toDate) return false;
      }

      // Quantity range
      if (minQty !== "" && t.quantity < Number(minQty)) return false;
      if (maxQty !== "" && t.quantity > Number(maxQty)) return false;

      // Cost range
      if (minCost !== "" && t.totalCost < Number(minCost)) return false;
      if (maxCost !== "" && t.totalCost > Number(maxCost)) return false;

      return true;
    });

    // 2. Sort
    if (!sortKey) return list;

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        cmp = tA - tB;
      } else if (sortKey === "type") {
        cmp = a.type.localeCompare(b.type);
      } else if (sortKey === "brand") {
        const bA = (a.brand || brandMap.get(a.productId) || "").trim();
        const bB = (b.brand || brandMap.get(b.productId) || "").trim();
        cmp = bA.localeCompare(bB, "th");
      } else if (sortKey === "product") {
        cmp = a.productName.localeCompare(b.productName, "th");
      } else if (sortKey === "quantity") {
        cmp = a.quantity - b.quantity;
      } else if (sortKey === "cost") {
        cmp = a.totalCost - b.totalCost;
      } else if (sortKey === "reference") {
        cmp = (a.referenceNote || "").localeCompare(b.referenceNote || "", "th");
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    transactions,
    brandMap,
    searchTerm,
    selectedTypes,
    selectedBrands,
    selectedProducts,
    fromDate,
    toDate,
    minQty,
    maxQty,
    minCost,
    maxCost,
    sortKey,
    sortDirection,
  ]);

  // Build active filter chips
  const activeChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];

    // Types
    if (selectedTypes.size > 0) {
      const labels = Array.from(selectedTypes)
        .map((tp) => (tp === "StockIn" ? translate("transaction.in") : translate("transaction.out")))
        .join(", ");
      chips.push({
        id: "type",
        category: translate("tableFilter.type"),
        label: labels,
        onRemove: () => setSelectedTypes(new Set()),
      });
    }

    // Brands
    if (selectedBrands.size > 0) {
      const labels = Array.from(selectedBrands)
        .map((b) => b || translate("tableFilter.noBrand"))
        .join(", ");
      chips.push({
        id: "brand",
        category: translate("tableFilter.brand"),
        label: labels,
        onRemove: () => setSelectedBrands(new Set()),
      });
    }

    // Products
    if (selectedProducts.size > 0) {
      const labels = Array.from(selectedProducts).join(", ");
      chips.push({
        id: "product",
        category: translate("tableFilter.product"),
        label: labels,
        onRemove: () => setSelectedProducts(new Set()),
      });
    }

    // Date Range
    if (fromDate || toDate) {
      const label =
        fromDate && toDate
          ? `${fromDate} ~ ${toDate}`
          : fromDate
          ? `≥ ${fromDate}`
          : `≤ ${toDate}`;
      chips.push({
        id: "date",
        category: translate("tableFilter.dateRange"),
        label,
        onRemove: () => {
          setDatePreset("all");
          setFromDate("");
          setToDate("");
        },
      });
    }

    // Qty Range
    if (minQty || maxQty) {
      const label =
        minQty && maxQty
          ? `${minQty} - ${maxQty} ${translate("tableFilter.pieces")}`
          : minQty
          ? `≥ ${minQty} ${translate("tableFilter.pieces")}`
          : `≤ ${maxQty} ${translate("tableFilter.pieces")}`;
      chips.push({
        id: "qty",
        category: translate("tableFilter.quantity"),
        label,
        onRemove: () => {
          setMinQty("");
          setMaxQty("");
        },
      });
    }

    // Cost Range
    if (minCost || maxCost) {
      const label =
        minCost && maxCost
          ? `${minCost} - ${maxCost} ${translate("tableFilter.baht")}`
          : minCost
          ? `≥ ${minCost} ${translate("tableFilter.baht")}`
          : `≤ ${maxCost} ${translate("tableFilter.baht")}`;
      chips.push({
        id: "cost",
        category: translate("tableFilter.cost"),
        label,
        onRemove: () => {
          setMinCost("");
          setMaxCost("");
        },
      });
    }

    return chips;
  }, [
    selectedTypes,
    selectedBrands,
    selectedProducts,
    fromDate,
    toDate,
    minQty,
    maxQty,
    minCost,
    maxCost,
    translate,
  ]);

  const handleClearAllFilters = () => {
    setSelectedTypes(new Set());
    setSelectedBrands(new Set());
    setSelectedProducts(new Set());
    setDatePreset("all");
    setFromDate("");
    setToDate("");
    setMinQty("");
    setMaxQty("");
    setMinCost("");
    setMaxCost("");
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Control Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={translate("transaction.search")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {translate("common.clear")}
            </button>
          )}
        </div>

        {/* Excel Import & Export */}
        <div className="flex items-center gap-2">
          {onOpenExcelImport && (
            <button
              onClick={onOpenExcelImport}
              className="flex items-center gap-1.5 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 dark:hover:border-blue-800/60 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{translate("shell.importExcel")}</span>
            </button>
          )}

          {onOpenExcelExport && (
            <button
              onClick={onOpenExcelExport}
              title={translate("transaction.excelTitle")}
              className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-800/60 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{translate("shell.exportExcel")}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dedicated Filter Panel ("Filter ใหญ่") */}
      <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
            <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>{translate("tableFilter.filterPanel")}:</span>
          </div>

          {/* Type Multi-Select */}
          <MultiSelectDropdown
            label={translate("tableFilter.type")}
            icon={<Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
            options={typeOptions}
            selectedValues={selectedTypes}
            onChange={setSelectedTypes}
          />

          {/* Brand Multi-Select */}
          <MultiSelectDropdown
            label={translate("tableFilter.brand")}
            icon={<Tag className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
            options={brandOptions}
            selectedValues={selectedBrands}
            onChange={setSelectedBrands}
            searchPlaceholder={translate("tableFilter.search")}
          />

          {/* Product Multi-Select */}
          <MultiSelectDropdown
            label={translate("tableFilter.product")}
            icon={<Package className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
            options={productOptions}
            selectedValues={selectedProducts}
            onChange={setSelectedProducts}
            searchPlaceholder={translate("tableFilter.search")}
          />

          {/* Date Range Dropdown */}
          <DateRangeDropdown
            label={translate("tableFilter.dateRange")}
            preset={datePreset}
            fromDate={fromDate}
            toDate={toDate}
            onChange={(p, f, t) => {
              setDatePreset(p);
              setFromDate(f);
              setToDate(t);
            }}
          />

          {/* Quantity Range */}
          <NumericRangeDropdown
            label={translate("tableFilter.quantity")}
            min={minQty}
            max={maxQty}
            unit={translate("tableFilter.pieces")}
            icon={<Boxes className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            onChange={(mn, mx) => {
              setMinQty(mn);
              setMaxQty(mx);
            }}
          />

          {/* Cost Range */}
          <NumericRangeDropdown
            label={translate("tableFilter.cost")}
            min={minCost}
            max={maxCost}
            unit="฿"
            icon={<Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
            onChange={(mn, mx) => {
              setMinCost(mn);
              setMaxCost(mx);
            }}
          />
        </div>

        {/* 3. Active Filters Tag Bar */}
        <ActiveFilterChips
          chips={activeChips}
          totalCount={transactions.length}
          filteredCount={filteredAndSorted.length}
          onClearAll={handleClearAllFilters}
          className="mt-3"
        />
      </div>

      {/* 4. Transaction Table with Sortable Headers */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <SortableHeader
                label={translate("transaction.date")}
                sortKey="date"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                isFiltered={Boolean(fromDate || toDate)}
              />
              <SortableHeader
                label={translate("transaction.type")}
                sortKey="type"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                isFiltered={selectedTypes.size > 0}
              />
              <SortableHeader
                label={translate("common.brand")}
                sortKey="brand"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                isFiltered={selectedBrands.size > 0}
              />
              <SortableHeader
                label={translate("transaction.product")}
                sortKey="product"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                isFiltered={selectedProducts.size > 0}
              />
              <SortableHeader
                label={translate("transaction.quantity")}
                sortKey="quantity"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                isFiltered={Boolean(minQty || maxQty)}
              />
              <SortableHeader
                label={translate("transaction.cost")}
                sortKey="cost"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                isFiltered={Boolean(minCost || maxCost)}
              />
              <SortableHeader
                label={translate("transaction.reference")}
                sortKey="reference"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="px-4 py-3.5 text-center">{translate("transaction.breakdown")}</th>
              <th className="px-4 py-3.5 text-right">{translate("transaction.manage")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    <span>{translate("transaction.empty")}</span>
                    {activeChips.length > 0 && (
                      <button
                        onClick={handleClearAllFilters}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        {translate("tableFilter.clearAll")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((t) => {
                const isStockIn = t.type === "StockIn";
                const isExpanded = expandedId === t.id;
                const brand = (t.brand || brandMap.get(t.productId) || "").trim();

                return (
                  <React.Fragment key={t.id}>
                    <tr className="group transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDateTime(t.createdAt)}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isStockIn
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {isStockIn ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          <span>{isStockIn ? translate("transaction.in") : translate("transaction.out")}</span>
                        </span>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3.5">
                        {brand ? (
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-800/40">
                            {brand}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {t.productName}
                        </div>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {t.sku}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {isStockIn ? "+" : "-"}
                        {formatNumber(t.quantity)} {translate("common.pieces")}
                      </td>

                      {/* Total Cost */}
                      <td
                        className={`px-4 py-3.5 text-right font-bold ${
                          isStockIn
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(t.totalCost)}
                      </td>

                      {/* Reference Note */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        {t.referenceNote || "-"}
                      </td>

                      {/* Lot Breakdown Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                        >
                          <Layers className="h-3 w-3" />
                          <span>{t.details.length} {translate("common.lots")}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEditTransaction && (
                            <button
                              onClick={() => onEditTransaction(t)}
                              title={translate("transaction.editTitle")}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button
                              onClick={() => onDeleteTransaction(t)}
                              title={translate("transaction.deleteTitle")}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Breakdown Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-750 dark:bg-slate-850">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {translate("transaction.batchBreakdownTitle")}
                            </div>
                            <div className="mt-2 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                              {t.details.map((d, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between py-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                      {d.batchNumber}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {translate("transaction.batchDrawnDetail", {
                                        qty: formatNumber(d.quantityDrawn),
                                        cost: formatCurrency(d.unitCost),
                                      })}
                                    </span>
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(d.subtotalCost)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
