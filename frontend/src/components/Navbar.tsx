"use client";

import React from "react";
import { Layers, Plus, ScanLine, ArrowDownUp } from "lucide-react";

interface NavbarProps {
  onOpenNewProduct: () => void;
  onOpenQuickMovement: () => void;
  scannerActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewProduct,
  onOpenQuickMovement,
  scannerActive = true,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/95">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg dark:text-zinc-50">
              StockPulse
            </h1>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              FIFO Real-Cost
            </span>
          </div>
          <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">
            ระบบจัดการสต็อกและต้นทุนสินค้าจริงตามรอบบัญชี
          </p>
        </div>
      </div>

      {/* Actions & Scanner Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Scanner Gun Indicator */}
        <div
          title="พร้อมรับสัญญาณจากเครื่องสแกนบาร์โค้ด / RFID (ยิงได้ทันที)"
          className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <ScanLine className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Scanner Ready</span>
        </div>

        {/* Quick Stock Movement Button */}
        <button
          onClick={onOpenQuickMovement}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ArrowDownUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>เข้า/ออก</span>
        </button>

        {/* New Product Button */}
        <button
          onClick={onOpenNewProduct}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">เพิ่มสินค้า</span>
          <span className="sm:hidden">สินค้า</span>
        </button>
      </div>
    </header>
  );
};
