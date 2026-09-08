"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardSummary, ProductDetail, StockTransaction } from "../types";
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
import { QuickScanView } from "../components/Scanner/QuickScanView";
import { GlobalScannerListener } from "../components/Scanner/GlobalScannerListener";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      ? `ต้องการลบรายการรับเข้าสต็อก #${tx.id} (${tx.productName} จำนวน ${tx.quantity} ชิ้น) ใช่หรือไม่?\n\n⚠️ หากล็อตนี้ถูกนำไปตัดขาย (FIFO) แล้ว ระบบจะบล็อกการลบเพื่อรักษาความถูกต้องทางบัญชี`
      : `ต้องการลบรายการเบิกออก #${tx.id} (${tx.productName} จำนวน ${tx.quantity} ชิ้น) ใช่หรือไม่?\n\n✅ ระบบจะทำการคืนสต็อกกลับเข้าทุกล็อตย่อย FIFO เดิมทันที`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteTransaction(tx.id);
      showToast(`ลบรายการ #${tx.id} เรียบร้อย (ปรับปรุงยอดสต็อกและล็อต FIFO แล้ว)`);
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

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      {/* Global Barcode Scanner Gun Listener */}
      <GlobalScannerListener onScan={handleHardwareScan} />

      {/* Top Navbar */}
      <Navbar
        onOpenNewProduct={handleOpenNewProduct}
        onOpenQuickMovement={() => handleOpenStockIn()}
      />

      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-zinc-900/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          {toastMessage}
        </div>
      )}

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          lowStockCount={dashboard?.kpis.lowStockProductCount || 0}
        />

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* Header Action / Refresh */}
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                {activeTab === "dashboard" && "ภาพรวมสต็อกและต้นทุน (Accounting Dashboard)"}
                {activeTab === "products" && "รายการสินค้าและประวัติล็อต (Products & Batches)"}
                {activeTab === "transactions" && "สมุดรายวันประวัติการเข้า-ออก (Stock Journal)"}
                {activeTab === "scanner" && "โหมดเครื่องสแกนบาร์โค้ด & รหัส SKU (Machine Scanner)"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {activeTab === "dashboard" && "สรุปมูลค่าคงเหลือจริง มูลค่าต้นทุนที่ตัดออก และการไหลเวียนสินค้า"}
                {activeTab === "products" && "จัดการสินค้า แก้ไขรหัส ตรวจสอบราคาซื้อจริงรายรอบ และทำรายการด่วน"}
                {activeTab === "transactions" && "ตรวจสอบการตัดสต็อกแบบ FIFO แยกตามล็อตจริงเพื่อส่งรายงานบัญชี"}
                {activeTab === "scanner" && "พร้อมรับสัญญาณจากหัวอ่านสแกนเนอร์อัตโนมัติ"}
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="flex w-fit items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>

          {/* Connection Error Banner */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                <span>
                  <strong>เกิดข้อผิดพลาดในการเชื่อมต่อ Backend:</strong> {error}
                  <span className="ml-1 text-[11px] opacity-80">(ตรวจสอบว่า .NET 10 API รันอยู่ที่ http://localhost:5200)</span>
                </span>
              </div>
              <button
                onClick={loadData}
                className="rounded-lg bg-rose-600 px-3 py-1 text-white hover:bg-rose-700"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && dashboard && (
            <div className="space-y-6">
              <KpiCards
                kpis={dashboard.kpis}
                onFilterLowStock={() => setActiveTab("products")}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MovementChart data={dashboard.movementTrend} />
                <TopProductsCard
                  products={dashboard.topValuedProducts}
                  onSelectProduct={(sku) => {
                    setActiveTab("products");
                  }}
                />
              </div>

              <RecentTransactions
                transactions={dashboard.recentTransactions}
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
            />
          )}

          {/* TAB 3: TRANSACTIONS */}
          {activeTab === "transactions" && (
            <TransactionJournal
              transactions={transactions}
              onRefresh={loadData}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
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
    </div>
  );
}
