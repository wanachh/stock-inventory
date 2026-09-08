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
  const [category, setCategory] = useState("General");
  const [minThreshold, setMinThreshold] = useState(5);

  // For create only: optional initial stock
  const [initialQuantity, setInitialQuantity] = useState<number | "">("");
  const [initialUnitCost, setInitialUnitCost] = useState<number | "">("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku);
      setBarcode(productToEdit.barcode || "");
      setName(productToEdit.name);
      setCategory(productToEdit.category || "General");
      setMinThreshold(productToEdit.minThreshold || 5);
      setInitialQuantity("");
      setInitialUnitCost("");
    } else {
      setSku("");
      setBarcode("");
      setName("");
      setCategory("General");
      setMinThreshold(5);
      setInitialQuantity("");
      setInitialUnitCost("");
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Auto-generate machine-friendly SKU (e.g. PRD-2026-XXXX)
  const handleAutoGenerateSku = () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSku(`PRD-${new Date().getFullYear()}-${randomChars}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const cleanSku = sku.trim().toUpperCase();
    if (!cleanSku) {
      setError("กรุณาระบุรหัส SKU");
      return;
    }
    const skuRegex = /^[A-Za-z0-9_\-\.]{2,50}$/;
    if (!skuRegex.test(cleanSku)) {
      setError("รหัส SKU ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข ขีดกลาง (-) หรือขีดล่าง (_) ความยาว 2-50 ตัวอักษร");
      return;
    }

    if (!name.trim()) {
      setError("กรุณากรอกชื่อสินค้า");
      return;
    }

    const minThreshNum = Number(minThreshold);
    if (isNaN(minThreshNum) || minThreshNum < 0 || !Number.isInteger(minThreshNum)) {
      setError("เกณฑ์เตือนสต็อกใกล้หมด (Min Threshold) ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป");
      return;
    }

    // Strict validation for initial quantity
    if (!isEdit && initialQuantity !== "") {
      const initQty = Number(initialQuantity);
      if (isNaN(initQty) || initQty <= 0) {
        setError("หากต้องการระบุสต็อกตั้งต้น จำนวนสินค้าต้องมากกว่า 0 ชิ้น (หากยังไม่มีสินค้า ให้เว้นว่างไว้ ไม่สามารถใส่ 0 หรือติดลบได้)");
        return;
      }
      if (!Number.isInteger(initQty)) {
        setError(`จำนวนสินค้าตั้งต้นต้องเป็นจำนวนเต็มเท่านั้น (เช่น 1, 2, 3...) ไม่สามารถระบุเป็นทศนิยมอย่าง ${initialQuantity} ได้`);
        return;
      }
      if (initialUnitCost === "" || isNaN(Number(initialUnitCost)) || Number(initialUnitCost) < 0) {
        setError("กรุณาระบุราคาต้นทุนจริงต่อชิ้นสำหรับสต็อกตั้งต้น (ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป)");
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
          category: category.trim() || "General",
          minThreshold: Number(minThreshold) || 5,
        });
      } else {
        await onSubmitCreate({
          sku: cleanSku,
          barcode: barcode.trim() || null,
          name: name.trim(),
          category: category.trim() || "General",
          minThreshold: Number(minThreshold) || 5,
          initialQuantity: initialQuantity !== "" ? Number(initialQuantity) : undefined,
          initialUnitCost: initialUnitCost !== "" ? Number(initialUnitCost) : undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {isEdit ? t("product.edit") : t("shell.newProduct")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? "แก้ไขข้อมูลทั่วไปหรือแก้ไขรหัส SKU กรณีพิมพ์ผิด"
                : "กรอกเฉพาะ SKU และชื่อสินค้าเพื่อเริ่มใช้งานได้ทันที (Quick Win)"}
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
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* SKU Field with Auto-Generate */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                รหัสสินค้า (SKU) <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>สร้างรหัสอัตโนมัติ</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="เช่น PRD-2026-001"
              required
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
            {isEdit && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                ⚠️ หากแก้ไข SKU ประวัติและล็อตเดิมจะยังอยู่ครบ ระบบจะอัปเดตรหัสให้ทันที
              </p>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ชื่อสินค้า <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น เมล็ดกาแฟอาราบิก้า หรือ เมาส์ไร้สาย"
              required
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>

          {/* Barcode & Category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                รหัสบาร์โค้ด (Barcode) <span className="text-slate-400 font-normal">(เว้นว่างได้)</span>
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="เช่น 8850123456789"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                หมวดหมู่สินค้า
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เช่น General, IT, Food"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* MinThreshold */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              เกณฑ์เตือนสต็อกใกล้หมด (Min Threshold)
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
              ระบบจะแสดงสถานะ &quot;ใกล้หมด (Low Stock)&quot; เมื่อจำนวนคงเหลือ $\le$ ค่านี้
            </p>
          </div>

          {/* Initial Stock (Only on Create) */}
          {!isEdit && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                สต็อกตั้งต้นพร้อมต้นทุนจริง (ทางเลือก)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                สามารถกรอกสต็อกล็อตแรกลงไปได้ทันที (ต้องมากกว่า 0) หรือเว้นว่างไว้แล้วมารับเข้าทีหลังก็ได้
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    จำนวนชิ้นแรกเริ่ม (จำนวนเต็ม &gt; 0)
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
                    placeholder="เช่น 5 (เว้นว่างได้)"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    ราคาต้นทุนจริง/ชิ้น (฿)
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

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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
