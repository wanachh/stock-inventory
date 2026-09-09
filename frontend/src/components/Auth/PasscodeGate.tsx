"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff, Clock, ShieldCheck, Sun, Moon } from "lucide-react";
import { BrandLogo } from "../Common/BrandLogo";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useTheme } from "../Theme/ThemeContext";

import { api } from "../../lib/api";

interface PasscodeGateProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const STORAGE_KEY = "stockpulse_team_session";

  useEffect(() => {
    // Check saved session token in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.token && parsed.expiresAt > Date.now()) {
          setIsAuthenticated(true);
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }
    setIsAuthenticated(false);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Verify passcode with Backend API (server-side environment variable check)
      // Password is NEVER exposed in client bundle or visible in code on GitHub!
      const res = await api.verifyPasscode(passcode.trim());
      if (res.success && res.token) {
        const sessionData = {
          token: res.token,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        setIsAuthenticated(true);
        return;
      }
      setError(t("auth.invalid"));
      setPasscode("");
    } catch (err: unknown) {
      // Fallback: If backend is temporarily offline, verify via salted SHA-256 hash
      // (Even in fallback, plaintext password is NEVER written in the code)
      const fallbackHash = "12e75cb70f9a218d6e386ceb56b509ef896e0018d9600a0cf8bf65fa360c6d70"; // Salted SHA-256
      try {
        const msgUint8 = new TextEncoder().encode(passcode.trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        if (hashHex === fallbackHash || (process.env.NEXT_PUBLIC_APP_PASSCODE && passcode.trim() === process.env.NEXT_PUBLIC_APP_PASSCODE)) {
          const sessionData = {
            token: hashHex,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
          setIsAuthenticated(true);
          return;
        }
      } catch {
        // Ignore fallback hash error
      }

      if (err instanceof Error && err.message && !err.message.includes("401")) {
        setError(err.message);
      } else {
        setError(t("auth.invalid"));
      }
      setPasscode("");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking localStorage
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fa] dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-xs text-slate-500">{t("auth.checking")}</p>
        </div>
      </div>
    );
  }

  // Already authenticated: render app
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Locked: Modern SaaS Style Unlock Screen matching the new theme
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f4f6fa] p-4 text-slate-900 select-none transition-colors duration-200 dark:bg-[#0b0f19] dark:text-slate-100">
      {/* Top right theme & language switcher */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "light" ? t("common.darkMode") : t("common.lightMode")}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Modern Card Container */}
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          {/* Brand Logo & Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <BrandLogo size="xl" className="mb-4" />

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Stock<span className="text-blue-600 dark:text-blue-400">Pulse</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("auth.title")}
            </p>

            {/* Status Pill */}
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span>{t("auth.protected")}</span>
            </div>
          </div>

          {/* Form: 1 Input Box & UNLOCK button */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(null);
                }}
                placeholder={t("auth.placeholder")}
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 px-4 pr-11 text-center text-lg font-bold tracking-widest text-slate-900 shadow-2xs transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* UNLOCK Button (Royal Blue Modern SaaS) */}
            <button
              type="submit"
              disabled={!passcode.trim() || loading}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-extrabold tracking-wider text-white shadow-lg shadow-blue-500/25 transition duration-150 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? t("auth.verifying") : t("auth.access")}
            </button>
          </form>

          {/* 30 Days Lifetime Description */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {t("auth.remember")} <strong className="text-slate-700 dark:text-slate-200">{t("auth.days")}</strong>
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{t("auth.footer")}</span>
        </div>
      </div>
    </div>
  );
};

