"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ProductDetail } from "../../types";
import { formatNumber, formatDate } from "../../lib/api";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  FolderTree,
  AlertTriangle,
  Filter,
  Boxes,
  PackageCheck,
  Calendar,
} from "lucide-react";

interface ProductManagementProps {
  products: ProductDetail[];
  onOpenNewProduct: () => void;
  onEditProduct: (product: ProductDetail) => void;
  onDeleteProduct: (product: ProductDetail) => Promise<void>;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  onOpenNewProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  const { t } = useTranslation();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Deletion Modal state
  const [productToDelete, setProductToDelete] = useState<ProductDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract unique brands and categories for dropdown filter
  const brandList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand?.trim()) set.add(p.brand.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [products]);

  const categoryList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [products]);

  // Filtered products (only active, non-deleted by default)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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

      // Brand
      if (selectedBrand !== "all" && p.brand?.trim() !== selectedBrand) {
        return false;
      }

      // Category
      if (selectedCategory !== "all" && p.category?.trim() !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteProduct(productToDelete);
      setProductToDelete(null);
    } catch {
      // Error handled by parent toast/alert
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("management.searchPlaceholder")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 shadow-2xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800/90 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              {t("common.clear")}
            </button>
          )}
        </div>

        {/* Quick Filter Selectors & New Product Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand select */}
          {brandList.length > 0 && (
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <option value="all">{t("common.brand")}: {t("common.all")}</option>
              {brandList.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {/* Category select */}
          {categoryList.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <option value="all">{t("common.category")}: {t("common.all")}</option>
              {categoryList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* New Product Action Button */}
          <button
            onClick={onOpenNewProduct}
            className="flex h-10 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95 dark:hover:bg-blue-500 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t("management.createProduct")}</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Pill Summary */}
      <div className="flex items-center gap-3 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 font-medium shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
          <Boxes className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t("management.totalProducts")}: <strong>{products.length}</strong></span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 font-medium shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
          <PackageCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t("tableFilter.showingResults", { filtered: filteredProducts.length, total: products.length })}</span>
        </span>
      </div>

      {/* 3. Desktop Table */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm md:block dark:border-slate-800/80 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3.5">{t("management.tableSku")}</th>
              <th className="px-4 py-3.5">{t("management.tableBrand")}</th>
              <th className="px-4 py-3.5">{t("management.tableName")}</th>
              <th className="px-4 py-3.5 text-center">{t("management.tableThreshold")}</th>
              <th className="px-4 py-3.5">{t("management.tableCreated")}</th>
              <th className="px-4 py-3.5 text-right">{t("management.tableStock")}</th>
              <th className="px-5 py-3.5 text-right">{t("management.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    <span>{t("management.empty")}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                return (
                  <tr
                    key={p.id}
                    className="group transition duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    {/* SKU & Barcode */}
                    <td className="px-5 py-4 align-top">
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
                    <td className="px-4 py-4 align-top">
                      {p.brand ? (
                        <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-800/40">
                          {p.brand}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>

                    {/* Name & Category */}
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium dark:bg-slate-800">
                          <FolderTree className="h-3 w-3 text-purple-500" />
                          <span>{p.category}</span>
                        </span>
                      </div>
                    </td>

                    {/* Low Stock Threshold */}
                    <td className="px-4 py-4 text-center align-top">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        ≤ {p.minThreshold} {t("common.pieces")}
                      </span>
                    </td>

                    {/* Registration Date */}
                    <td className="px-4 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDate(p.createdAt)}</span>
                      </div>
                    </td>

                    {/* Active Stock */}
                    <td className="px-4 py-4 text-right align-top">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {formatNumber(p.totalQuantityRemaining)} {t("common.pieces")}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.activeBatches.length} {t("common.lots")}
                      </div>
                    </td>

                    {/* Action Tools */}
                    <td className="px-5 py-4 text-right align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => onEditProduct(p)}
                          title={t("management.editProduct")}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition duration-150 hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>{t("common.edit")}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setProductToDelete(p)}
                          title={t("management.deleteProduct")}
                          className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs transition duration-150 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:border-rose-800 dark:hover:bg-rose-900/60 dark:hover:text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t("common.delete")}</span>
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

      {/* 4. Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800/80 dark:bg-slate-900">
            {t("management.empty")}
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-slate-700"
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
                  </div>
                  <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                    {p.name}
                  </h4>
                  <div className="mt-1 text-xs text-slate-400">
                    {p.category} · {t("product.threshold", { count: p.minThreshold })}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400">{t("management.tableStock")}</span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatNumber(p.totalQuantityRemaining)} {t("common.pieces")}
                  </div>
                </div>
              </div>

              {/* Mobile Card Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={() => onEditProduct(p)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{t("common.edit")}</span>
                </button>

                <button
                  onClick={() => setProductToDelete(p)}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t("common.delete")}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Delete Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !isDeleting && setProductToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition duration-150 dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t("management.deleteModalTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("management.deleteModalDesc")}
                </p>
              </div>
            </div>

            {/* Target Product Info Box */}
            <div className="my-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex justify-between font-mono font-bold text-slate-900 dark:text-slate-100">
                <span>{productToDelete.sku}</span>
                {productToDelete.brand && (
                  <span className="text-blue-600 dark:text-blue-400">{productToDelete.brand}</span>
                )}
              </div>
              <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                {productToDelete.name}
              </div>
              {productToDelete.totalQuantityRemaining > 0 && (
                <div className="mt-2 rounded-xl bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  ⚠️ มีสต็อกคงเหลืออยู่ในระบบ: <strong>{formatNumber(productToDelete.totalQuantityRemaining)} {t("common.pieces")}</strong> (จะถูกตัดจำหน่ายและบันทึกประวัติการลบ)
                </div>
              )}
            </div>

            {/* Warning Note */}
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t("management.deleteModalWarning")}
            </p>

            {/* Modal Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition hover:bg-rose-700 active:scale-95 disabled:opacity-50 dark:hover:bg-rose-500 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? t("common.loading") : t("management.deleteConfirmButton")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
