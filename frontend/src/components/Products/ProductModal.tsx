"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CreateProductRequest, ProductDetail, UpdateProductRequest } from "../../types";
import { X, Wand2, ShieldAlert, Check } from "lucide-react";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateProductRequest) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateProductRequest) => Promise<void>;
  productToEdit?: ProductDetail | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  productToEdit,
}) => {
  const { t } = useTranslation();
  const isEdit = !!productToEdit;

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("General");
  const [minThreshold, setMinThreshold] = useState(5);

  // For create only: optional initial stock
  const [initialQuantity, setInitialQuantity] = useState<number | "">("");
  const [initialUnitCost, setInitialUnitCost] = useState<number | "">("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-generate machine-friendly SKU (e.g. PRD-2026-XXXX)
  const generateRandomSku = () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRD-${new Date().getFullYear()}-${randomChars}`;
  };

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku);
      setBarcode(productToEdit.barcode || "");
      setName(productToEdit.name);
      setBrand(productToEdit.brand || "");
      setCategory(productToEdit.category || "General");
      setMinThreshold(productToEdit.minThreshold || 5);
      setInitialQuantity("");
      setInitialUnitCost("");
    } else {
      // Pre-fill a random SKU so the user can edit it later instead of starting blank
      setSku(generateRandomSku());
      setBarcode("");
      setName("");
      setBrand("");
      setCategory("General");
      setMinThreshold(5);
      setInitialQuantity("");
      setInitialUnitCost("");
    }
    setError(null);
  }, [productToEdit, isOpen]);

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

  const handleAutoGenerateSku = () => {
    setSku(generateRandomSku());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const cleanSku = sku.trim().toUpperCase();
    if (!cleanSku) {
      setError(t("product.skuErrorRequired"));
      return;
    }
    const skuRegex = /^[A-Za-z0-9_\-\.]{2,50}$/;
    if (!skuRegex.test(cleanSku)) {
      setError(t("product.skuErrorFormat"));
      return;
    }

    if (!name.trim()) {
      setError(t("product.nameErrorRequired"));
      return;
    }

    const minThreshNum = Number(minThreshold);
    if (isNaN(minThreshNum) || minThreshNum < 0 || !Number.isInteger(minThreshNum)) {
      setError(t("product.thresholdError"));
      return;
    }

    // Strict validation for initial quantity
    if (!isEdit && initialQuantity !== "") {
      const initQty = Number(initialQuantity);
      if (isNaN(initQty) || initQty <= 0) {
        setError(t("product.initialQtyErrorPos"));
        return;
      }
      if (!Number.isInteger(initQty)) {
        setError(t("product.initialQtyErrorInt", { qty: initialQuantity }));
        return;
      }
      if (initialUnitCost === "" || isNaN(Number(initialUnitCost)) || Number(initialUnitCost) < 0) {
        setError(t("product.initialCostError"));
        return;
      }
    }

    setLoading(true);
    try {
      if (isEdit && productToEdit) {
        await onSubmitUpdate(productToEdit.id, {
          sku: cleanSku,
          barcode: barcode.trim() || null,
          name: name.trim(),
          brand: brand.trim() || null,
          category: category.trim() || "General",
          minThreshold: Number(minThreshold) || 5,
        });
      } else {
        await onSubmitCreate({
          sku: cleanSku,
          barcode: barcode.trim() || null,
          name: name.trim(),
          brand: brand.trim() || null,
          category: category.trim() || "General",
          minThreshold: Number(minThreshold) || 5,
          initialQuantity: initialQuantity !== "" ? Number(initialQuantity) : undefined,
          initialUnitCost: initialUnitCost !== "" ? Number(initialUnitCost) : undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(t("product.saveError"));
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
              {isEdit ? t("product.modalTitleEdit") : t("product.modalTitleCreate")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? t("product.modalDescEdit")
                : t("product.modalDescCreate")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* SKU Field with Auto-Generate */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("product.skuLabel")} <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>{t("product.autoSku")}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder={t("product.skuPlaceholder")}
              required
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
            {isEdit && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                {t("product.skuWarning")}
              </p>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("product.nameLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("product.namePlaceholder")}
              required
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("product.brandLabel")} <span className="text-slate-400 font-normal">({t("common.optional")})</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={t("product.brandPlaceholder")}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Barcode & Category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("product.barcodeLabel")} <span className="text-slate-400 font-normal">({t("common.optional")})</span>
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={t("product.barcodePlaceholder")}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("product.categoryLabel")}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("product.categoryPlaceholder")}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* MinThreshold */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("product.thresholdLabel")}
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={minThreshold}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => setMinThreshold(Math.max(0, parseInt(e.target.value) || 0))}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {t("product.thresholdHelp")}
            </p>
          </div>

          {/* Initial Stock (Only on Create) */}
          {!isEdit && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t("product.initialStockTitle")}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("product.initialStockDesc")}
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {t("product.initialQtyLabel")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={initialQuantity}
                    onKeyDown={(e) => {
                      if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-") {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setInitialQuantity("");
                      } else {
                        const parsed = parseFloat(val);
                        setInitialQuantity(isNaN(parsed) ? "" : parsed);
                      }
                    }}
                    placeholder={t("product.initialQtyPlaceholder")}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {t("product.initialCostLabel")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={initialUnitCost}
                    onChange={(e) =>
                      setInitialUnitCost(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    placeholder="0.00"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

          {/* Actions (always visible, outside the scrollable area) */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{loading ? t("common.loading") : isEdit ? t("common.save") : t("shell.newProduct")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
