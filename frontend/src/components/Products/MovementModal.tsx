"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ProductDetail, StockOutPreviewResponse } from "../../types";
import { api, formatCurrency, formatNumber } from "../../lib/api";
import {
  X,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Layers,
  Search,
  Sparkles,
  Package,
  PlusCircle,
  ChevronDown,
  Check,
  Calendar,
} from "lucide-react";

const getLocalDateTimeString = (d: Date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDetail[];
  initialProduct?: ProductDetail | null;
  initialType?: "StockIn" | "StockOut";
  onSuccess: () => void;
}

export const MovementModal: React.FC<MovementModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProduct = null,
  initialType = "StockIn",
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [type, setType] = useState<"StockIn" | "StockOut">(initialType);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");

  // Transaction Date state (allows backdating)
  const [transactionDate, setTransactionDate] = useState<string>("");

  // Search & Suggestion states
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "inStock">("all");

  // New Product on-the-fly state (for StockIn)
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("General");

  const [quantity, setQuantity] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [reference, setReference] = useState("");

  //  Preview state for Stock Out
  const [preview, setPreview] = useState<StockOutPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setType(initialType);
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      setIsDropdownOpen(false);
    } else {
      setSelectedProductId("");
      setIsDropdownOpen(false);
    }
    setIsNewProductMode(false);
    setSearchQuery("");
    setFilterTab("all");
    setNewProductName("");
    setNewProductSku("");
    setNewProductBarcode("");
    setNewProductBrand("");
    setNewProductCategory("General");
    setQuantity("");
    setUnitCost("");
    setReference("");
    setTransactionDate(getLocalDateTimeString());
    setPreview(null);
    setPreviewError(null);
    setError(null);
  }, [isOpen, initialProduct, initialType]);

  const currentProduct = products.find((p) => p.id === Number(selectedProductId));
  const inStockCount = products.filter((p) => p.totalQuantityRemaining > 0).length;

  // Filter products for suggestions (by tab and search query)
  const filteredProducts = products.filter((p) => {
    if (filterTab === "inStock" && p.totalQuantityRemaining <= 0) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Auto SKU generator
  const handleAutoSku = () => {
    const prefix = "PRD";
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setNewProductSku(`${prefix}-${year}-${random}`);
  };

  // Start new product mode
  const handleStartNewProduct = () => {
    setIsNewProductMode(true);
    setSelectedProductId("");
    setIsDropdownOpen(false);

    const typed = searchQuery.trim();
    setNewProductName(typed);

    if (/^[A-Za-z0-9_-]{3,20}$/.test(typed)) {
      setNewProductSku(typed.toUpperCase());
    } else {
      const prefix = "PRD";
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setNewProductSku(`${prefix}-${year}-${random}`);
    }
  };

  const handleTypeChange = (newType: "StockIn" | "StockOut") => {
    setType(newType);
    if (newType === "StockOut" && isNewProductMode) {
      setIsNewProductMode(false);
      setSelectedProductId("");
    }
    setError(null);
  };

  // Live  Preview effect when stocking out
  useEffect(() => {
    const qtyNum = Number(quantity);
    if (type !== "StockOut" || !currentProduct || !quantity || qtyNum <= 0 || !Number.isInteger(qtyNum)) {
      setPreview(null);
      if (quantity !== "" && (!Number.isInteger(qtyNum) || qtyNum <= 0)) {
        setPreviewError(t("movement.qtyErrorPositive"));
      } else {
        setPreviewError(null);
      }
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);

      api
        .previewStockOut({
          productId: currentProduct.id,
          quantity: qtyNum,
        })
        .then((res) => {
          setPreview(res);
          setPreviewError(null);
        })
        .catch((err) => {
          setPreview(null);
          setPreviewError(err.message || t("movement.fifoCalcError"));
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    }, 250);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [type, selectedProductId, quantity, currentProduct]);

  // Escape key always closes the modal, even if content overflows the viewport
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = Number(quantity);
    if (quantity === "" || isNaN(qty) || qty <= 0) {
      setError(t("movement.qtyErrorPositive"));
      return;
    }

    if (!Number.isInteger(qty)) {
      setError(t("movement.qtyErrorInt", { qty: quantity }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isNewProductMode) {
        if (!newProductName.trim()) {
          setError(t("movement.newNameError"));
          setLoading(false);
          return;
        }
        if (!newProductSku.trim()) {
          setError(t("movement.newSkuError"));
          setLoading(false);
          return;
        }

        const cost = Number(unitCost);
        if (unitCost === "" || isNaN(cost) || cost < 0) {
          setError(t("movement.newCostError"));
          setLoading(false);
          return;
        }

        const dateIso = transactionDate ? new Date(transactionDate).toISOString() : undefined;

        await api.createProduct({
          sku: newProductSku.trim().toUpperCase(),
          barcode: newProductBarcode.trim() || undefined,
          name: newProductName.trim(),
          category: newProductCategory.trim() || "General",
          brand: newProductBrand.trim() || undefined,
          minThreshold: 5,
          initialQuantity: qty,
          initialUnitCost: cost,
          reference: reference.trim() || t("movement.defaultRefNewProduct"),
          transactionDate: dateIso,
        });
      } else {
        if (!currentProduct) {
          setError(t("movement.targetProductError"));
          setLoading(false);
          return;
        }

        const dateIso = transactionDate ? new Date(transactionDate).toISOString() : undefined;

        if (type === "StockIn") {
          const cost = Number(unitCost);
          if (unitCost === "" || isNaN(cost) || cost < 0) {
            setError(t("movement.costErrorRequired"));
            setLoading(false);
            return;
          }

          await api.stockIn({
            productId: currentProduct.id,
            quantity: qty,
            unitCost: cost,
            reference: reference.trim() || undefined,
            transactionDate: dateIso,
          });
        } else {
          await api.stockOut({
            productId: currentProduct.id,
            quantity: qty,
            referenceNote: reference.trim() || undefined,
            transactionDate: dateIso,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(t("movement.generalError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800/80 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (always visible, not part of the scrollable area) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {t("movement.modalTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("movement.modalDesc")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Toggle: Stock In vs Stock Out */}
        <div className="mx-6 mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => handleTypeChange("StockIn")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
              type === "StockIn"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>{t("transaction.in")} (Stock In)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("StockOut")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
              type === "StockOut"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Minus className="h-4 w-4" />
            <span>{t("transaction.out")} (Stock Out)</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Target Product: Smart Combobox with Suggestions or New Product Form */}
          {isNewProductMode ? (
            /* NEW PRODUCT ON-THE-FLY FORM */
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/60 to-white p-4 dark:border-blue-900/60 dark:from-blue-950/30 dark:to-zinc-950">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3 dark:border-blue-900/50">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{t("shell.newProduct")} (Stock In)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProductMode(false);
                    setSelectedProductId("");
                    setIsDropdownOpen(true);
                  }}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  {t("movement.backToSelect")}
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("product.nameLabel")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder={t("product.namePlaceholder")}
                    required
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {t("product.skuLabel")} <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoSku}
                        className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t("product.autoSku")}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newProductSku}
                      onChange={(e) => setNewProductSku(e.target.value.toUpperCase())}
                      placeholder={t("product.skuPlaceholder")}
                      required
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-sm uppercase text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t("product.barcodeLabel")} ({t("common.optional")})
                    </label>
                    <input
                      type="text"
                      value={newProductBarcode}
                      onChange={(e) => setNewProductBarcode(e.target.value)}
                      placeholder={t("product.barcodePlaceholder")}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-sm text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("product.brandLabel")} ({t("common.optional")})
                  </label>
                  <input
                    type="text"
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    placeholder={t("product.brandPlaceholder")}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("product.categoryLabel")}
                  </label>
                  <input
                    type="text"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    placeholder={t("product.categoryPlaceholder")}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* TARGET PRODUCT: GITHUB BRANCH SELECTOR COMBOBOX */
            <div ref={comboboxRef} className="relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("movement.selectProductTitle")} <span className="text-rose-500">*</span>
                </label>
                {type === "StockIn" && (
                  <button
                    type="button"
                    onClick={handleStartNewProduct}
                    className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                  >
                    {t("movement.createNewProductBtn")}
                  </button>
                )}
              </div>

              {/* GitHub Branch Selector Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  const next = !isDropdownOpen;
                  setIsDropdownOpen(next);
                  if (next) {
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }}
                className="mt-1 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-sm text-zinc-900 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50/50 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Package className="h-4 w-4 shrink-0 text-zinc-400" />
                  {currentProduct ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {currentProduct.sku}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {currentProduct.name}
                      </span>
                    </div>
                  ) : (
                      <span className="text-zinc-400">{t("product.search")}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {currentProduct && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        currentProduct.totalQuantityRemaining > 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                      }`}
                    >
                      {currentProduct.totalQuantityRemaining > 0
                        ? `${formatNumber(currentProduct.totalQuantityRemaining)} ${t("common.pieces")}`
                        : t("product.out")}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Selected Product Quick Info strip */}
              {currentProduct && !isDropdownOpen && (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <div className="flex items-center gap-2 truncate">
                    {currentProduct.brand && (
                      <span className="truncate">
                        {t("movement.brandInfo")} <strong className="text-zinc-800 dark:text-zinc-200">{currentProduct.brand}</strong>
                      </span>
                    )}
                    <span>
                      {t("movement.categoryInfo")} <strong className="text-zinc-800 dark:text-zinc-200">{currentProduct.category}</strong>
                    </span>
                    {currentProduct.barcode && (
                      <span className="truncate">
                        • {t("movement.barcodeInfo")} <strong className="font-mono text-zinc-800 dark:text-zinc-200">[{currentProduct.barcode}]</strong>
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 pl-2">
                    {t("movement.stockValuation")} <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(currentProduct.totalValuation)}</strong>
                  </span>
                </div>
              )}

              {/* GITHUB BRANCH SELECTOR POPOVER DROPDOWN */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 z-40 mt-1.5 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-100">
                  {/* Search Input Box */}
                  <div className="border-b border-zinc-100 p-2.5 dark:border-zinc-800">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        data-scanner-input="true"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (filteredProducts.length > 0) {
                              const target =
                                filteredProducts.find((p) => p.totalQuantityRemaining > 0) ||
                                filteredProducts[0];
                              setSelectedProductId(target.id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            } else if (type === "StockIn" && searchQuery.trim()) {
                              handleStartNewProduct();
                            }
                          } else if (e.key === "Escape") {
                            setIsDropdownOpen(false);
                          }
                        }}
                        placeholder={t("movement.searchProductPlaceholder")}
                        className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pr-8 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 transition hover:border-zinc-400 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            searchInputRef.current?.focus();
                          }}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GitHub Tabs: Branches / Tags equivalent */}
                  <div className="flex items-center gap-5 border-b border-zinc-200 px-3 pt-1.5 text-xs dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setFilterTab("all")}
                      className={`-mb-[1px] pb-2 font-bold transition border-b-2 cursor-pointer ${
                        filterTab === "all"
                          ? "border-blue-600 text-zinc-900 dark:text-zinc-100"
                          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium"
                      }`}
                    >
                      {t("product.all")} ({products.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab("inStock")}
                      className={`-mb-[1px] pb-2 font-bold transition border-b-2 cursor-pointer ${
                        filterTab === "inStock"
                          ? "border-blue-600 text-zinc-900 dark:text-zinc-100"
                          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium"
                      }`}
                    >
                      {t("scanner.inStock")} ({inStockCount})
                    </button>
                  </div>

                  {/* Product List with Checkmark on Selected Item */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 py-1 dark:divide-zinc-800/60">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => {
                        const isSelected = p.id === Number(selectedProductId);
                        const isOutOfStock = p.totalQuantityRemaining === 0;
                        const disabledForOut = type === "StockOut" && isOutOfStock;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={disabledForOut}
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                              isSelected
                                ? "bg-blue-50/80 font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                                : disabledForOut
                                ? "cursor-not-allowed bg-zinc-50/50 opacity-40 dark:bg-zinc-900/30"
                                : "cursor-pointer text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-850"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {/* Checkmark slot: checkmark if selected, empty spacer if not */}
                              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                {isSelected && (
                                   <Check className="h-3.5 w-3.5 stroke-[2.5] text-blue-600 dark:text-blue-400" />
                                )}
                              </div>

                              <Package
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isSelected
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-zinc-400 dark:text-zinc-500"
                                }`}
                              />

                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                  {p.sku}
                                </span>
                                <span className="truncate font-medium">{p.name}</span>
                                {p.barcode && (
                                  <span className="font-mono text-[10px] text-zinc-400">
                                    [{p.barcode}]
                                  </span>
                                )}
                                {p.brand && (
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                    {p.brand}
                                  </span>
                                )}
                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  {p.category}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 pl-2 text-right">
                              <span
                                className={`text-[11px] font-semibold ${
                                  isOutOfStock
                                    ? "text-rose-500"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {isOutOfStock
                                  ? t("product.out")
                                  : `${formatNumber(p.totalQuantityRemaining)} ${t("common.pieces")}`}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        {searchQuery.trim()
                          ? t("movement.notFoundProduct", { query: searchQuery.trim() })
                          : t("movement.noProductsTab")}
                      </div>
                    )}
                  </div>

                  {/* Bottom Pinned Footer */}
                  {type === "StockIn" && (
                    <div className="border-t border-zinc-200 bg-zinc-50/70 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                      <button
                        type="button"
                        onClick={handleStartNewProduct}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50/80 dark:text-blue-400 dark:hover:bg-blue-950/50 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        <span>
                          {t("movement.createNewProductWithQuery", { query: searchQuery.trim() ? `"${searchQuery.trim()}"` : "" })}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {type === "StockIn" ? t("movement.qtyLabelIn") : t("movement.qtyLabelOut")}{" "}
              <span className="text-rose-500">{t("movement.qtyRequiredNote")}</span>
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setQuantity("");
                } else {
                  const parsed = parseFloat(val);
                  setQuantity(isNaN(parsed) ? "" : parsed);
                }
              }}
              placeholder={t("movement.qtyPlaceholder")}
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-base font-bold text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* If Stock In: Unit Cost of this new lot */}
          {type === "StockIn" && (
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t("movement.costLabel")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) =>
                  setUnitCost(e.target.value === "" ? "" : parseFloat(e.target.value))
                }
                placeholder={t("movement.costPlaceholder")}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-base font-bold text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
              {quantity !== "" && unitCost !== "" && (
                <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {t("movement.totalBuyValue")}{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(quantity) * Number(unitCost))}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* If Stock Out: LIVE FIFO PREVIEW BOX */}
          {type === "StockOut" && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{t("movement.fifoBreakdownTitle")}</span>
                </div>
                {previewLoading && (
                  <span className="text-[11px] text-zinc-400">{t("movement.calculating")}</span>
                )}
              </div>

              {previewError ? (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                  ⚠️ {previewError}
                </p>
              ) : preview ? (
                <div className="mt-3 space-y-2">
                  <div className="divide-y divide-zinc-200/60 rounded-lg border border-zinc-200 bg-white text-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                    {preview.allocatedBatches.map((item) => (
                      <div key={item.batchId} className="flex items-center justify-between p-2.5">
                        <div>
                          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {item.batchNumber}
                          </span>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {t("movement.fifoDraw", { qty: item.quantityToDraw, cost: formatCurrency(item.unitCost) })}
                          </div>
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(item.subtotalCost)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/80 pt-2 text-xs dark:border-zinc-800">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      {t("movement.totalCostOut")}
                    </span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(preview.totalCostOut)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {t("movement.fifoHint")}
                </p>
              )}
            </div>
          )}

          {/* Transaction Date & Time Picker */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {type === "StockIn" ? t("movement.dateLabelIn") : t("movement.dateLabelOut")}
                </span>
                <span className="text-rose-500">*</span>
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTransactionDate(getLocalDateTimeString(new Date()))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer transition"
                >
                  {t("common.today")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setTransactionDate(getLocalDateTimeString(y));
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer transition"
                >
                  {t("common.yesterday")}
                </button>
              </div>
            </div>

            <input
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 cursor-pointer"
            />
            <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              {t("movement.dateHint")}
            </p>
          </div>

          {/* Reference / Remark Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t("movement.refLabel")}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={type === "StockIn" ? t("movement.refPlaceholderIn") : t("movement.refPlaceholderOut")}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Actions - always visible, outside the scrollable area */}
        </div>
          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                (!isNewProductMode && !currentProduct) ||
                (type === "StockOut" && !!previewError)
              }
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50 ${
                type === "StockIn"
                  ? isNewProductMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {loading
                  ? t("common.loading")
                  : isNewProductMode
                  ? t("movement.submitNewProduct")
                  : type === "StockIn"
                  ? t("movement.submitStockIn")
                  : t("movement.submitStockOut")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
