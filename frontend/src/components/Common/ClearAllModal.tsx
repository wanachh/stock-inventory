"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed =
    confirmationInput.trim().toUpperCase() === "DELETE ALL" ||
    confirmationInput.trim() === "ลบทั้งหมด";

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setLoading(true);
    setError(null);

    try {
      await api.clearAllData("DELETE ALL");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการล้างข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmationInput("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/50 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {t("excel.clearAllTitle")}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {t("excel.clearAllDanger")}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning text */}
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            {t("excel.clearAllWarning")}
          </p>
          <ul className="list-disc pl-5 text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
            <li>{t("excel.clearAllItem1")}</li>
            <li>{t("excel.clearAllItem2")}</li>
            <li>{t("excel.clearAllItem3")}</li>
            <li>{t("excel.clearAllItem4")}</li>
          </ul>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-300 bg-rose-100 p-3 text-xs font-semibold text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleClear} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t("excel.clearAllPrompt")}
            </label>
            <div className="mt-1.5">
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE ALL"
                autoFocus
                disabled={loading}
                className="w-full rounded-xl border-2 border-zinc-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-rose-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-rose-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {t("excel.clearAllHelp")}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || loading}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition hover:bg-rose-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>{t("excel.clearAllConfirmBtn")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
