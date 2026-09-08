"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { DashboardSummary, ProductDetail, StockTransaction, DashboardKpis, DailyMovementSummary } from "../types";
import { api } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Sidebar, NavTab } from "../components/Sidebar";
import { MobileNav } from "../components/MobileNav";
import { KpiCards } from "../components/Dashboard/KpiCards";
import { MovementChart } from "../components/Dashboard/MovementChart";
import { TopProductsCard } from "../components/Dashboard/TopProductsCard";
import { RecentTransactions } from "../components/Dashboard/RecentTransactions";
import { ProductTable } from "../components/Products/ProductTable";
import { ProductModal } from "../components/Products/ProductModal";
import { BatchesModal } from "../components/Products/BatchesModal";
import { MovementModal } from "../components/Products/MovementModal";
import { TransactionJournal } from "../components/Transactions/TransactionJournal";
import { EditTransactionModal } from "../components/Transactions/EditTransactionModal";
import { ExcelImportModal } from "../components/Excel/ExcelImportModal";
import { ExcelExportModal } from "../components/Excel/ExcelExportModal";
import { QuickScanView } from "../components/Scanner/QuickScanView";
import { GlobalScannerListener } from "../components/Scanner/GlobalScannerListener";
import { PasscodeGate } from "../components/Auth/PasscodeGate";
import { VisitorBadge } from "../components/Dashboard/VisitorBadge";
import { StockDistributionDonut } from "../components/Dashboard/StockDistributionDonut";
import { GoalProgressCards } from "../components/Dashboard/GoalProgressCards";
import { AlertTriangle, CheckCircle2, RefreshCw, Filter, X } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select product filter on dashboard (empty Set = all products)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Data states
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductDetail | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<ProductDetail | null>(null);
  const [movementType, setMovementType] = useState<"StockIn" | "StockOut">("StockIn");

  const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);
  const [batchesProduct, setBatchesProduct] = useState<ProductDetail | null>(null);

  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<StockTransaction | null>(null);

  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isExcelExportOpen, setIsExcelExportOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [dashRes, prodsRes, txsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getProducts(),
        api.getTransactions(),
      ]);
      setDashboard(dashRes);
      setProducts(prodsRes);
      setTransactions(txsRes);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ .NET API ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Toggle a single product in the multi-select set
  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Derived: filtered products list (empty = all)
  const activeProducts = useMemo<ProductDetail[]>(() => {
    if (selectedProductIds.size === 0) return products;
    return products.filter((p) => selectedProductIds.has(p.id));
  }, [selectedProductIds, products]);

  const isFiltered = selectedProductIds.size > 0;

  const activeKpis = useMemo<DashboardKpis>(() => {
    if (!dashboard) {
      return {
        totalRemainingItems: 0,
        totalRemainingValuation: 0,
        totalItemsOut: 0,
        totalCostOut: 0,
        totalItemsIn: 0,
        totalCostIn: 0,
        lowStockProductCount: 0,
      };
    }
    if (!isFiltered) return dashboard.kpis;

    const filteredTxs = transactions.filter((t) => selectedProductIds.has(t.productId));
    const inTxs = filteredTxs.filter((t) => t.type === "StockIn");
    const outTxs = filteredTxs.filter((t) => t.type === "StockOut");

    return {
      totalRemainingItems: activeProducts.reduce((s, p) => s + p.totalQuantityRemaining, 0),
      totalRemainingValuation: activeProducts.reduce((s, p) => s + p.totalValuation, 0),
      totalItemsOut: outTxs.reduce((s, t) => s + t.quantity, 0),
      totalCostOut: outTxs.reduce((s, t) => s + t.totalCost, 0),
      totalItemsIn: inTxs.reduce((s, t) => s + t.quantity, 0),
      totalCostIn: inTxs.reduce((s, t) => s + t.totalCost, 0),
      lowStockProductCount: activeProducts.filter(
        (p) => p.totalQuantityRemaining <= p.minThreshold
      ).length,
    };
  }, [dashboard, isFiltered, activeProducts, transactions, selectedProductIds]);

  const activeMovementTrend = useMemo<DailyMovementSummary[]>(() => {
    if (!dashboard) return [];
    if (!isFiltered) return dashboard.movementTrend;

    const filteredTxs = transactions.filter((t) => selectedProductIds.has(t.productId));

    return dashboard.movementTrend.map((daySummary) => {
      const dayTxs = filteredTxs.filter((t) => {
        const d = new Date(t.createdAt);
        const enDate = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        return (
          enDate.toLowerCase() === daySummary.date.toLowerCase() ||
          t.createdAt.includes(daySummary.date)
        );
      });

      const dayIn = dayTxs.filter((t) => t.type === "StockIn");
      const dayOut = dayTxs.filter((t) => t.type === "StockOut");

      return {
        date: daySummary.date,
        inQuantity: dayIn.reduce((s, t) => s + t.quantity, 0),
        inCost: dayIn.reduce((s, t) => s + t.totalCost, 0),
        outQuantity: dayOut.reduce((s, t) => s + t.quantity, 0),
        outCost: dayOut.reduce((s, t) => s + t.totalCost, 0),
      };
    });
  }, [dashboard, isFiltered, transactions, selectedProductIds]);

  const activeTransactions = useMemo<StockTransaction[]>(() => {
    if (!dashboard) return [];
    if (!isFiltered) return dashboard.recentTransactions;
    return transactions.filter((t) => selectedProductIds.has(t.productId)).slice(0, 10);
  }, [dashboard, isFiltered, transactions, selectedProductIds]);

  // Handle hardware scanner gun trigger
  const handleHardwareScan = async (code: string) => {
    try {
      const found = await api.lookupProduct(code);
      setMovementProduct(found);
      setMovementType("StockOut"); // Default to Stock Out on quick scan
      setIsMovementModalOpen(true);
      showToast(`สแกนพบ: [${found.sku}] ${found.name}`);
    } catch {
      showToast(`⚠️ สแกนรหัส "${code}" ไม่พบในระบบ`);
    }
  };

  // Modal helpers
  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: ProductDetail) => {
    setProductToEdit(p);
    setIsProductModalOpen(true);
  };

  const handleOpenStockIn = (p?: ProductDetail) => {
    setMovementProduct(p || null);
    setMovementType("StockIn");
    setIsMovementModalOpen(true);
  };

  const handleOpenStockOut = (p?: ProductDetail) => {
    setMovementProduct(p || null);
    setMovementType("StockOut");
    setIsMovementModalOpen(true);
  };

  const handleViewBatches = (p: ProductDetail) => {
    setBatchesProduct(p);
    setIsBatchesModalOpen(true);
  };

  const handleOpenEditTransaction = (tx: StockTransaction) => {
    setTransactionToEdit(tx);
    setIsEditTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (tx: StockTransaction) => {
    const isStockIn = tx.type === "StockIn";
    const confirmMsg = isStockIn
      ? `ต้องการลบรายการรับเข้าสต็อก #${tx.id} (${tx.productName} จำนวน ${tx.quantity} ชิ้น) ใช่หรือไม่?\n\n⚠️ หากล็อตนี้ถูกนำไปตัดขาย () แล้ว ระบบจะบล็อกการลบเพื่อรักษาความถูกต้องทางบัญชี`
      : `ต้องการลบรายการเบิกออก #${tx.id} (${tx.productName} จำนวน ${tx.quantity} ชิ้น) ใช่หรือไม่?\n\n✅ ระบบจะทำการคืนสต็อกกลับเข้าทุกล็อตย่อย  เดิมทันที`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteTransaction(tx.id);
      showToast(`ลบรายการ #${tx.id} เรียบร้อย (ปรับปรุงยอดสต็อกและล็อต  แล้ว)`);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  const handleProductCreated = async (data: any) => {
    await api.createProduct(data);
    showToast("สร้างสินค้าใหม่เรียบร้อย");
    loadData();
  };

  const handleProductUpdated = async (id: number, data: any) => {
    await api.updateProduct(id, data);
    showToast("อัปเดตข้อมูลสินค้าเรียบร้อย");
    loadData();
  };

  const handleMovementSuccess = () => {
    showToast("บันทึกการเคลื่อนไหวสต็อกเรียบร้อย");
    loadData();
  };

  const handleLock = () => {
    try {
      localStorage.removeItem("stockpulse_team_session");
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  return (
    <PasscodeGate>
      <div className="flex min-h-screen bg-[#f4f6fa] text-slate-900 transition-colors duration-200 dark:bg-[#0b0f19] dark:text-slate-100">
        {/* Global Barcode Scanner Gun Listener */}
        <GlobalScannerListener onScan={handleHardwareScan} />

        {/* Left Slim Modern Dock Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          lowStockCount={dashboard?.kpis.lowStockProductCount || 0}
        />

        {/* Right Main Body */}
        <div className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
          {/* Top Navbar Header */}
          <Navbar
            onOpenNewProduct={handleOpenNewProduct}
            onOpenQuickMovement={() => handleOpenStockIn()}
            onOpenExcelImport={() => setIsExcelImportOpen(true)}
            onOpenExcelExport={() => setIsExcelExportOpen(true)}
            onLock={handleLock}
          />

          {/* Toast banner */}
          {toastMessage && (
            <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-slate-900/10 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-slate-900 animate-in fade-in zoom-in-95">
              {toastMessage}
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-x-hidden p-6 sm:p-8">
            {/* Header Action / Refresh */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  {activeTab === "dashboard" && "ภาพรวมสต็อกและต้นทุน (Accounting Dashboard)"}
                  {activeTab === "products" && "รายการสินค้าและประวัติล็อต (Products & Batches)"}
                  {activeTab === "transactions" && "สมุดรายวันประวัติการเข้า-ออก (Stock Journal)"}
                  {activeTab === "scanner" && "โหมดเครื่องสแกนบาร์โค้ด & รหัส SKU (Machine Scanner)"}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeTab === "dashboard" && "สรุปมูลค่าคงเหลือจริง มูลค่าต้นทุนที่ตัดออก และการไหลเวียนสินค้า"}
                  {activeTab === "products" && "จัดการสินค้า แก้ไขรหัส ตรวจสอบราคาซื้อจริงรายรอบ และทำรายการด่วน"}
                  {activeTab === "transactions" && "ตรวจสอบการตัดสต็อกแบบ  แยกตามล็อตจริงเพื่อส่งรายงานบัญชี"}
                  {activeTab === "scanner" && "พร้อมรับสัญญาณจากหัวอ่านสแกนเนอร์อัตโนมัติ"}
                </p>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="flex w-fit items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>

            {/* Connection Error Banner */}
            {error && (
              <div className="mb-6 flex items-center justify-between rounded-3xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                  <span>
                    <strong>เกิดข้อผิดพลาดในการเชื่อมต่อ Backend:</strong> {error}
                    <span className="ml-1 text-[11px] opacity-80">(ตรวจสอบว่า .NET 10 API รันอยู่ที่ http://localhost:5200)</span>
                  </span>
                </div>
                <button
                  onClick={loadData}
                  className="rounded-xl bg-rose-600 px-3 py-1 text-white font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  ลองใหม่
                </button>
              </div>
            )}

            {/* TAB 1: DASHBOARD (Matching the reference design widgets) */}
            {activeTab === "dashboard" && dashboard && (
              <div className="space-y-6">
                {/* 0. Contextual Product Filter Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5">
                    {/* Left: label */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
                        <Filter className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            กรองตามสินค้า
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isFiltered
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                          }`}>
                            {isFiltered ? `${selectedProductIds.size} สินค้า` : "ทั้งหมด"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {isFiltered
                            ? `แสดงข้อมูลเฉพาะ ${selectedProductIds.size} สินค้าที่เลือก`
                            : `แสดงภาพรวมสินค้าทั้งหมด ${products.length} รายการ`}
                        </p>
                      </div>
                    </div>

                    {/* Right: dropdown trigger + clear */}
                    <div className="flex items-center gap-2" ref={filterRef}>
                      {/* Custom multi-select dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsFilterOpen((v) => !v)}
                          className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 hover:border-blue-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition cursor-pointer"
                        >
                          <span>
                            {isFiltered ? `${selectedProductIds.size} รายการที่เลือก` : "🌐 เลือกสินค้า"}
                          </span>
                          <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown panel */}
                        {isFilterOpen && (
                          <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">เลือกสินค้าที่ต้องการ</span>
                              <button
                                type="button"
                                onClick={() => setSelectedProductIds(new Set())}
                                className="text-[11px] font-bold text-blue-500 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                              >
                                ล้างทั้งหมด
                              </button>
                            </div>

                            {/* Product list */}
                            <div className="max-h-60 overflow-y-auto py-1">
                              {products.map((p) => {
                                const checked = selectedProductIds.has(p.id);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => toggleProduct(p.id)}
                                    className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${checked ? "bg-blue-50/60 dark:bg-blue-950/30" : ""}`}
                                  >
                                    {/* Checkbox */}
                                    <div className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition ${checked ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-600"}`}>
                                      {checked && (
                                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    {/* Product info */}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{p.name}</p>
                                      <p className="text-[10px] text-slate-400">{p.sku} · คงเหลือ {p.totalQuantityRemaining} ชิ้น</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-100 px-3.5 py-2 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => setIsFilterOpen(false)}
                                className="w-full rounded-lg bg-blue-500 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition cursor-pointer"
                              >
                                ยืนยัน ({isFiltered ? `${selectedProductIds.size} รายการ` : "ทั้งหมด"})
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clear filter button */}
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={() => setSelectedProductIds(new Set())}
                          className="flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer transition"
                        >
                          <X className="h-3.5 w-3.5" />
                          ล้าง
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected pills row */}
                  {isFiltered && (
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      {Array.from(selectedProductIds).map((id) => {
                        const p = products.find((x) => x.id === id);
                        if (!p) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            {p.name}
                            <button type="button" onClick={() => toggleProduct(id)} className="ml-0.5 cursor-pointer text-blue-400 hover:text-blue-700 dark:hover:text-blue-200">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 1. Top KPI Row: Hero Blue, Sells, Revenue, Activity */}
                <KpiCards
                  kpis={activeKpis}
                  onFilterLowStock={() => setActiveTab("products")}
                />

                {/* 2. Middle Row: Movement Grouped Bar Chart & Stock Distribution Donut */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <div className="xl:col-span-2">
                    <MovementChart
                      data={activeMovementTrend}
                      productName={
                        isFiltered
                          ? selectedProductIds.size === 1
                            ? (() => { const p = products.find(x => selectedProductIds.has(x.id)); return p ? `${p.name}` : undefined; })()
                            : `${selectedProductIds.size} สินค้าที่เลือก`
                          : undefined
                      }
                    />
                  </div>
                  <div>
                    <StockDistributionDonut />
                  </div>
                </div>

                {/* 3. Goals & Top Valued Products */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <div>
                    <GoalProgressCards />
                  </div>
                  <div className="xl:col-span-2">
                    <TopProductsCard
                      products={dashboard.topValuedProducts}
                      onSelectProduct={(sku) => {
                        const found = products.find((p) => p.sku === sku);
                        if (found) {
                          setSelectedProductIds(new Set([found.id]));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } else {
                          setActiveTab("products");
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 4. Recent Chronological Ledger */}
                <RecentTransactions
                  transactions={activeTransactions}
                  onViewAll={() => setActiveTab("transactions")}
                />
              </div>
            )}

            {/* TAB 2: PRODUCTS */}
            {activeTab === "products" && (
            <ProductTable
              products={products}
              onOpenStockIn={handleOpenStockIn}
              onOpenStockOut={handleOpenStockOut}
              onViewBatches={handleViewBatches}
              onEditProduct={handleOpenEditProduct}
              onOpenExcelImport={() => setIsExcelImportOpen(true)}
              onOpenExcelExport={() => setIsExcelExportOpen(true)}
            />
          )}

          {/* TAB 3: TRANSACTIONS */}
          {activeTab === "transactions" && (
            <TransactionJournal
              transactions={transactions}
              onRefresh={loadData}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenExcelExport={() => setIsExcelExportOpen(true)}
            />
          )}

          {/* TAB 4: SCANNER */}
          {activeTab === "scanner" && (
            <QuickScanView
              onOpenStockIn={handleOpenStockIn}
              onOpenStockOut={handleOpenStockOut}
              onViewBatches={handleViewBatches}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        lowStockCount={dashboard?.kpis.lowStockProductCount || 0}
      />

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmitCreate={handleProductCreated}
        onSubmitUpdate={handleProductUpdated}
        productToEdit={productToEdit}
      />

      <MovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        products={products}
        initialProduct={movementProduct}
        initialType={movementType}
        onSuccess={handleMovementSuccess}
      />

      <BatchesModal
        isOpen={isBatchesModalOpen}
        onClose={() => setIsBatchesModalOpen(false)}
        product={batchesProduct}
      />

        <EditTransactionModal
          isOpen={isEditTransactionModalOpen}
          onClose={() => setIsEditTransactionModalOpen(false)}
          transaction={transactionToEdit}
          onSuccess={() => {
            showToast("แก้ไขรายการเคลื่อนไหวสต็อกเรียบร้อย");
            loadData();
          }}
        />

        <ExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onSuccess={() => {
            showToast("นำเข้าข้อมูลสต็อกและสินค้าจาก Excel เรียบร้อย");
            loadData();
          }}
        />

        <ExcelExportModal
          isOpen={isExcelExportOpen}
          onClose={() => setIsExcelExportOpen(false)}
          products={products}
          transactions={transactions}
        />
      </div>
    </PasscodeGate>
  );
}
