"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScanLine, CheckCircle2 } from "lucide-react";

interface GlobalScannerListenerProps {
  onScan: (code: string) => void;
}

export const GlobalScannerListener: React.FC<GlobalScannerListenerProps> = ({ onScan }) => {
  const { t } = useTranslation();
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside modal text inputs unless it's Enter
      const target = e.target as HTMLElement | null;
      const isTypingInInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        target.getAttribute("data-scanner-input") !== "true";

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key: finalize scan
      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";

        if (code.length >= 2) {
          // Trigger scan
          setLastScanned(code);
          onScan(code);
          setTimeout(() => setLastScanned(null), 3000);
        }
        return;
      }

      // Ignore special modifier keys
      if (e.key.length > 1) return;

      // If typed inside normal text input with slow human typing speed, reset
      if (isTypingInInput && timeDiff > 60) {
        bufferRef.current = "";
        return;
      }

      // If delay is very long (human started typing somewhere else), clear buffer
      if (timeDiff > 200) {
        bufferRef.current = "";
      }

      bufferRef.current += e.key;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);

  if (!lastScanned) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-lg shadow-emerald-500/10 dark:border-emerald-700 dark:bg-emerald-950">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
        <ScanLine className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t("scanner.detected")}</span>
        </div>
        <p className="font-mono text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Code: <span className="font-bold">{lastScanned}</span>
        </p>
      </div>
    </div>
  );
};
