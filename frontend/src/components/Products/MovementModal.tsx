"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

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
  const [type, setType] = useState<"StockIn" | "StockOut">(initialType);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");

  // Search & Suggestion states
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // New Product on-the-fly state (for StockIn)
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("General");

  const [quantity, setQuantity] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [reference, setReference] = useState("");

  // FIFO Preview state for Stock Out
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
    setNewProductName("");
    setNewProductSku("");
    setNewProductBarcode("");
    setNewProductCategory("General");
    setQuantity("");
    setUnitCost("");
    setReference("");
    setPreview(null);
    setPreviewError(null);
    setError(null);
  }, [isOpen, initialProduct, initialType]);

  const currentProduct = products.find((p) => p.id === Number(selectedProductId));

  // Filter products for suggestions
  const filteredProducts = products.filter((p) => {
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

  // Live FIFO Preview effect when stocking out
  useEffect(() => {
    const qtyNum = Number(quantity);
    if (type !== "StockOut" || !currentProduct || !quantity || qtyNum <= 0 || !Number.isInteger(qtyNum)) {
      setPreview(null);
      if (quantity !== "" && (!Number.isInteger(qtyNum) || qtyNum <= 0)) {
        setPreviewError("จำนวนสินค้าต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น (ไม่สามารถใส่ทศนิยมหรือ 0 ได้)");
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
          setPreviewError(err.message || "ไม่สามารถคำนวณต้นทุน FIFO ได้");
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    }, 250);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [type, selectedProductId, quantity, currentProduct]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = Number(quantity);
    if (quantity === "" || isNaN(qty) || qty <= 0) {
      setError("จำนวนสินค้าต้องมากกว่า 0 ชิ้น (ไม่สามารถระบุ 0 หรือติดลบได้)");
      return;
    }

    if (!Number.isInteger(qty)) {
      setError(`จำนวนสินค้าต้องเป็นจำนวนเต็มเท่านั้น (เช่น 1, 2, 3...) ไม่สามารถระบุเป็นทศนิยมอย่าง ${quantity} ชิ้นได้`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isNewProductMode) {
        if (!newProductName.trim()) {
          setError("กรุณาระบุชื่อสินค้าใหม่");
          setLoading(false);
          return;
        }
        if (!newProductSku.trim()) {
          setError("กรุณาระบุรหัส SKU สำหรับสินค้าใหม่");
          setLoading(false);
          return;
        }

        const cost = Number(unitCost);
        if (unitCost === "" || isNaN(cost) || cost < 0) {
          setError("กรุณาระบุราคาต้นทุนจริงต่อชิ้นสำหรับสินค้าใหม่ (ต้องไม่ติดลบ)");
          setLoading(false);
          return;
        }

        await api.createProduct({
          sku: newProductSku.trim().toUpperCase(),
          barcode: newProductBarcode.trim() || undefined,
          name: newProductName.trim(),
          category: newProductCategory.trim() || "General",
          minThreshold: 5,
          initialQuantity: qty,
          initialUnitCost: cost,
          reference: reference.trim() || "รับเข้าล็อตแรก (สินค้าใหม่)",
        });
      } else {
        if (!currentProduct) {
          setError("กรุณาเลือกหรือระบุสินค้าเป้าหมาย");
          setLoading(false);
          return;
        }

        if (type === "StockIn") {
          const cost = Number(unitCost);
          if (unitCost === "" || isNaN(cost) || cost < 0) {
            setError("กรุณาระบุราคาต้นทุนจริงของรอบนี้ (ต้องไม่ติดลบ)");
            setLoading(false);
            return;
          }

          await api.stockIn({
            productId: currentProduct.id,
            quantity: qty,
            unitCost: cost,
            reference: reference.trim() || undefined,
          });
        } else {
          await api.stockOut({
            productId: currentProduct.id,
            quantity: qty,
            referenceNote: reference.trim() || undefined,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              บันทึกการเคลื่อนไหวสต็อก (Stock Movement)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              รองรับทั้งการพิมพ์รหัส หรือใช้ปืนยิงบาร์โค้ดสแกน
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Toggle: Stock In vs Stock Out */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1.5 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={() => handleTypeChange("StockIn")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              type === "StockIn"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>รับสินค้าเข้า (Stock In)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("StockOut")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              type === "StockOut"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Minus className="h-4 w-4" />
            <span>ตัดสินค้าออก (Stock Out)</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Product: Smart Combobox with Suggestions or New Product Form */}
          {isNewProductMode ? (
            /* NEW PRODUCT ON-THE-FLY FORM */
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/60 to-white p-4 dark:border-blue-900/60 dark:from-blue-950/30 dark:to-zinc-950">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3 dark:border-blue-900/50">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>กำลังสร้างสินค้าใหม่พร้อมรับเข้าสต็อก</span>
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
                  ← กลับไปเลือกสินค้าเดิม
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    ชื่อสินค้าใหม่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="เช่น เมล็ดกาแฟดอยช้าง หรือ ปลั๊กไฟ 3 ตา"
                    required
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        รหัส SKU <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoSku}
                        className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        สร้างรหัสอัตโนมัติ
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newProductSku}
                      onChange={(e) => setNewProductSku(e.target.value.toUpperCase())}
                      placeholder="เช่น PRD-2026-001"
                      required
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-sm uppercase text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      รหัสบาร์โค้ด (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={newProductBarcode}
                      onChange={(e) => setNewProductBarcode(e.target.value)}
                      placeholder="เช่น 8850123456789"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-sm text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    หมวดหมู่สินค้า
                  </label>
                  <input
                    type="text"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    placeholder="เช่น General, เครื่องดื่ม, IT"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          ) : currentProduct ? (
            /* SELECTED PRODUCT CARD */
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {currentProduct.sku}
                      </span>
                      {currentProduct.barcode && (
                        <span className="font-mono text-[11px] text-zinc-400">
                          [{currentProduct.barcode}]
                        </span>
                      )}
                      <span className="rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {currentProduct.category}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {currentProduct.name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId("");
                    setSearchQuery("");
                    setIsDropdownOpen(true);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  เปลี่ยนสินค้า
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-zinc-200/60 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>สต็อกคงเหลือปัจจุบัน: <strong className="text-zinc-900 dark:text-zinc-100">{formatNumber(currentProduct.totalQuantityRemaining)} ชิ้น</strong></span>
                <span>มูลค่าสต็อกปัจจุบัน: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(currentProduct.totalValuation)}</strong></span>
              </div>
            </div>
          ) : (
            /* AUTO-SUGGEST COMBOBOX SEARCH INPUT */
            <div ref={comboboxRef} className="relative">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                ค้นหาหรือระบุสินค้าเป้าหมาย <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  data-scanner-input="true"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filteredProducts.length > 0) {
                        const target = filteredProducts.find(p => p.totalQuantityRemaining > 0) || filteredProducts[0];
                        setSelectedProductId(target.id);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      } else if (type === "StockIn" && searchQuery.trim()) {
                        handleStartNewProduct();
                      }
                    }
                  }}
                  placeholder="พิมพ์ชื่อสินค้า, SKU, หรือยิงบาร์โค้ด..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-10 pl-10 text-sm text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    ล้าง
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown Panel */}
              {isDropdownOpen && (
                <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => {
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
                            className={`flex w-full items-center justify-between p-3 text-left transition ${
                              disabledForOut
                                ? "cursor-not-allowed opacity-40 bg-zinc-50 dark:bg-zinc-950/40"
                                : "hover:bg-blue-50/60 dark:hover:bg-zinc-800/80 cursor-pointer"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {p.sku}
                                </span>
                                {p.barcode && (
                                  <span className="font-mono text-[11px] text-zinc-400">
                                    [{p.barcode}]
                                  </span>
                                )}
                                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  {p.category}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {p.name}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={`text-xs font-bold ${
                                isOutOfStock
                                  ? "text-rose-500"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {isOutOfStock ? "หมดสต็อก" : `${formatNumber(p.totalQuantityRemaining)} ชิ้น`}
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {formatCurrency(p.totalValuation)}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        ไม่พบสินค้าที่ตรงกับคำค้นหา
                      </div>
                    )}
                  </div>

                  {/* Create New Product Action in Dropdown (For Stock In) */}
                  {type === "StockIn" && (
                    <button
                      type="button"
                      onClick={handleStartNewProduct}
                      className="flex w-full items-center gap-2.5 border-t border-zinc-100 bg-blue-50/70 p-3 text-left text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-zinc-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div>
                        <div>+ สร้างเป็นสินค้าใหม่ {searchQuery.trim() ? `"${searchQuery.trim()}"` : ""}</div>
                        <div className="text-[11px] font-normal text-blue-600/80 dark:text-blue-400">
                          เพิ่มสินค้าใหม่ลงระบบและบันทึกรับเข้าสต็อกล็อตแรกทันที
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {type === "StockIn" ? "จำนวนที่รับเข้า (ชิ้น)" : "จำนวนที่ต้องการตัดออก (ชิ้น)"}{" "}
              <span className="text-rose-500">* (จำนวนเต็มเท่านั้น)</span>
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
              placeholder="เช่น 1, 5, 10 (ห้ามใส่ 0 หรือทศนิยม)"
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-base font-bold text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* If Stock In: Unit Cost of this new lot */}
          {type === "StockIn" && (
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                ราคาต้นทุนจริงของรอบนี้ต่อชิ้น (฿) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) =>
                  setUnitCost(e.target.value === "" ? "" : parseFloat(e.target.value))
                }
                placeholder="เช่น 5.00 หรือ 10.00"
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-base font-bold text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
              {quantity !== "" && unitCost !== "" && (
                <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  รวมมูลค่าเงินซื้อเข้ารอบนี้:{" "}
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
                  <span>การจัดสรรต้นทุนจริงตามล็อต (FIFO Cost Breakdown)</span>
                </div>
                {previewLoading && (
                  <span className="text-[11px] text-zinc-400">กำลังคำนวณ...</span>
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
                            ตัดจำนวน {item.quantityToDraw} ชิ้น @ ทุนจริง {formatCurrency(item.unitCost)}
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
                      ต้นทุนสินค้าที่ตัดออกรวม (Cost Out):
                    </span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(preview.totalCostOut)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  กรอกจำนวนที่ต้องการตัดออก เพื่อดูว่าระบบจะดึงจากล็อตไหนบ้างที่ราคาทุนจริงเท่าไหร่
                </p>
              )}
            </div>
          )}

          {/* Reference / Remark Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              เลขที่อ้างอิง / หมายเหตุ (เช่น เลขที่ PO, บิลขาย, หรือวัตถุประสงค์การเบิก)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={type === "StockIn" ? "เช่น PO-2026-003" : "เช่น ใบเสร็จ #INV-109 หรือ เบิกใช้งาน"}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-2xs transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ยกเลิก
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
                  ? "กำลังบันทึก..."
                  : isNewProductMode
                  ? "สร้างสินค้าใหม่ & รับเข้าสต็อก"
                  : type === "StockIn"
                  ? "ยืนยันรับเข้าสต็อก"
                  : "ยืนยันตัดสต็อกออก"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
