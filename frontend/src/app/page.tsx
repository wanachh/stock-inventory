"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

  // Selected product filter on dashboard ("all" or number productId)
  const [selectedProductId, setSelectedProductId] = useState<number | "all">("all");

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

  // Derived filtered state for Dashboard (per-product or global all)
  const activeProduct = useMemo(() => {
    if (selectedProductId === "all") return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

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
    if (!activeProduct) {
      return dashboard.kpis;
    }

    const prodTxs = transactions.filter((t) => t.productId === activeProduct.id);
    const inTxs = prodTxs.filter((t) => t.type === "StockIn");
    const outTxs = prodTxs.filter((t) => t.type === "StockOut");

    return {
      totalRemainingItems: activeProduct.totalQuantityRemaining,
      totalRemainingValuation: activeProduct.totalValuation,
      totalItemsOut: outTxs.reduce((sum, t) => sum + t.quantity, 0),
      totalCostOut: outTxs.reduce((sum, t) => sum + t.totalCost, 0),
      totalItemsIn: inTxs.reduce((sum, t) => sum + t.quantity, 0),
      totalCostIn: inTxs.reduce((sum, t) => sum + t.totalCost, 0),
      lowStockProductCount:
        activeProduct.totalQuantityRemaining <= activeProduct.minThreshold ? 1 : 0,
    };
  }, [dashboard, activeProduct, transactions]);

  const activeMovementTrend = useMemo<DailyMovementSummary[]>(() => {
    if (!dashboard) return [];
    if (!activeProduct) {
      return dashboard.movementTrend;
    }

    const prodTxs = transactions.filter((t) => t.productId === activeProduct.id);

    return dashboard.movementTrend.map((daySummary) => {
      const dayTxs = prodTxs.filter((t) => {
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
        inQuantity: dayIn.reduce((sum, t) => sum + t.quantity, 0),
        inCost: dayIn.reduce((sum, t) => sum + t.totalCost, 0),
        outQuantity: dayOut.reduce((sum, t) => sum + t.quantity, 0),
        outCost: dayOut.reduce((sum, t) => sum + t.totalCost, 0),
      };
    });
  }, [dashboard, activeProduct, transactions]);

  const activeTransactions = useMemo<StockTransaction[]>(() => {
    if (!dashboard) return [];
    if (!activeProduct) {
      return dashboard.recentTransactions;
    }
    return transactions.filter((t) => t.productId === activeProduct.id).slice(0, 10);
  }, [dashboard, activeProduct, transactions]);

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
                {/* 0. Contextual Product Selector Bar (ภาพรวมทั้งคลัง vs เลือกดูรายตัว) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:px-5 sm:py-3.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
                      <Filter className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          มุมมองข้อมูล (View Mode):
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            activeProduct
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                          }`}
                        >
                          {activeProduct ? "กรองดูรายสินค้า" : "ภาพรวมทั้งคลัง"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {activeProduct
                          ? `แสดงข้อมูลเฉพาะ: [${activeProduct.sku}] ${activeProduct.name} (เกณฑ์แจ้งเตือน: ${activeProduct.minThreshold} ชิ้น)`
                          : `วิเคราะห์และสรุปยอดสต็อกสะสมจากสินค้าทั้งหมด ${products.length} รายการ`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Product Select Dropdown */}
                    <div className="relative w-full sm:w-auto">
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedProductId(val === "all" ? "all" : Number(val));
                        }}
                        className="h-10 w-full sm:w-80 rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-8 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="all">🌐 ภาพรวมสินค้าทั้งหมด ({products.length} รายการ)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            📦 {p.name} ({p.sku}) — {p.totalQuantityRemaining} ชิ้น
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset to All Button */}
                    {selectedProductId !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductId("all")}
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer shrink-0 transition"
                      >
                        <X className="h-4 w-4" />
                        <span>ดูภาพรวม</span>
                      </button>
                    )}
                  </div>
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
                      productName={activeProduct ? `[${activeProduct.sku}] ${activeProduct.name}` : undefined}
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
                          setSelectedProductId(found.id);
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
